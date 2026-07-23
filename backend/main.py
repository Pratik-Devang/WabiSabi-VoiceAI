"""Vox FastAPI gateway: browser WebSocket <-> Gemini Live + local RAG."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

load_dotenv()

import rag  # noqa: E402  (load environment before module configuration)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s %(message)s",
)
log = logging.getLogger("vox.live")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LIVE_MODEL = os.getenv("LIVE_MODEL", "gemini-3.1-flash-live-preview")
VOICE_NAME = os.getenv("VOICE_NAME", "Kore")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
COMPRESSION_TRIGGER_TOKENS = int(
    os.getenv("COMPRESSION_TRIGGER_TOKENS", "25000")
)
COMPRESSION_TARGET_TOKENS = int(
    os.getenv("COMPRESSION_TARGET_TOKENS", "8000")
)

active_sessions: TTLCache[str, str] = TTLCache(maxsize=10000, ttl=7200)
kb_state = {"files": [], "chunks": 0}


def bootstrap_rag() -> None:
    collection = rag.get_collection()
    if collection.count() == 0:
        result = rag.ingest_directory()
        kb_state["files"] = result["file_names"]
    else:
        metadata = collection.get(include=["metadatas"]).get("metadatas") or []
        kb_state["files"] = sorted(
            {
                item.get("source")
                for item in metadata
                if item and item.get("source")
            }
        )
    kb_state["chunks"] = collection.count()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await asyncio.to_thread(bootstrap_rag)
    except Exception:
        log.exception("RAG bootstrap failed; voice can still start without retrieval.")
    yield


app = FastAPI(title="Vox Live RAG API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "model": LIVE_MODEL,
        "kb_files": kb_state["files"],
        "kb_file_count": len(kb_state["files"]),
        "kb_chunk_count": kb_state["chunks"],
    }


@app.get("/rag/status")
async def rag_status() -> dict:
    collection = await asyncio.to_thread(rag.get_collection)
    return {
        "collection": rag.COLLECTION_NAME,
        "persist_dir": rag.CHROMA_PERSIST_DIR,
        "knowledge_base_dir": rag.KNOWLEDGE_BASE_DIR,
        "chunk_count": collection.count(),
    }


@app.post("/rag/refresh")
async def rag_refresh() -> dict:
    try:
        result = await asyncio.to_thread(rag.ingest_directory)
        kb_state["files"] = result["file_names"]
        kb_state["chunks"] = await asyncio.to_thread(rag.get_collection().count)
        return {
            "status": "refreshed",
            **result,
            "total_chunks_stored": kb_state["chunks"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def system_instruction() -> str:
    return (
        "You are Vox, a concise and warm voice assistant for term life insurance. "
        "Speak naturally and keep answers short unless the user asks for detail. "
        "Respond in Hindi when the user speaks Hindi and Indian English when they "
        "speak English. Avoid markdown because every answer is spoken aloud. "
        "Use search_knowledge_base whenever a question may depend on plans, "
        "eligibility, riders, policy terms, or claims. Do not guess or mention "
        "the retrieval system. Base factual insurance answers on retrieved records."
    )


SEARCH_KB_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_knowledge_base",
            description=(
                "Search internal insurance plans, eligibility rules, riders, "
                "policy terms, and claims records."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(
                        type=types.Type.STRING,
                        description="Focused natural-language retrieval query.",
                    )
                },
                required=["query"],
            ),
        )
    ]
)


def live_config(session_handle: Optional[str]) -> types.LiveConnectConfig:
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=VOICE_NAME
                )
            ),
            language_code="en-IN",
        ),
        system_instruction=system_instruction(),
        tools=[SEARCH_KB_TOOL],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(
                disabled=False,
                start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_LOW,
                end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_LOW,
                prefix_padding_ms=20,
                silence_duration_ms=700,
            )
        ),
        context_window_compression=types.ContextWindowCompressionConfig(
            sliding_window=types.SlidingWindow(
                target_tokens=COMPRESSION_TARGET_TOKENS
            ),
            trigger_tokens=COMPRESSION_TRIGGER_TOKENS,
        ),
        thinking_config=types.ThinkingConfig(thinking_level="minimal"),
        session_resumption=types.SessionResumptionConfig(handle=session_handle),
    )


async def run_live_session(
    websocket: WebSocket, user_id: str, session_handle: Optional[str]
) -> None:
    if not GEMINI_API_KEY:
        await websocket.send_json(
            {"type": "error", "message": "GEMINI_API_KEY is not configured."}
        )
        await websocket.close(code=1011)
        return

    client = genai.Client(api_key=GEMINI_API_KEY)
    stop = asyncio.Event()

    try:
        async with client.aio.live.connect(
            model=LIVE_MODEL,
            config=live_config(session_handle),
        ) as session:

            async def receive_client() -> None:
                try:
                    while not stop.is_set():
                        try:
                            message = await asyncio.wait_for(
                                websocket.receive_json(), timeout=5
                            )
                        except asyncio.TimeoutError:
                            continue

                        message_type = message.get("type")
                        if message_type == "audio":
                            audio = base64.b64decode(message.get("data", ""))
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=audio,
                                    mime_type="audio/pcm;rate=16000",
                                )
                            )
                        elif message_type in {"audio_stream_end", "stop_turn"}:
                            await session.send_realtime_input(audio_stream_end=True)
                        elif message_type == "text":
                            await session.send_realtime_input(
                                text=message.get("text", "")
                            )
                        elif message_type == "ping":
                            await websocket.send_json({"type": "pong"})
                except WebSocketDisconnect:
                    pass
                finally:
                    stop.set()

            async def handle_tool_call(tool_call) -> None:
                responses = []
                for call in tool_call.function_calls:
                    if call.name == "search_knowledge_base":
                        query = (call.args or {}).get("query", "")
                        await websocket.send_json(
                            {"type": "kb_lookup", "query": query}
                        )
                        try:
                            hits = await asyncio.to_thread(rag.search, query)
                            result = {"results": hits}
                        except Exception:
                            log.exception("RAG lookup failed")
                            result = {
                                "results": [],
                                "note": "Knowledge base search failed.",
                            }
                        await websocket.send_json(
                            {
                                "type": "kb_result",
                                "query": query,
                                **result,
                            }
                        )
                    else:
                        result = {"error": f"Unknown tool: {call.name}"}
                    responses.append(
                        types.FunctionResponse(
                            id=call.id,
                            name=call.name,
                            response=result,
                        )
                    )
                if responses:
                    await session.send_tool_response(
                        function_responses=responses
                    )

            async def receive_gemini() -> None:
                try:
                    while not stop.is_set():
                        async for response in session.receive():
                            content = response.server_content
                            if content and content.model_turn:
                                for part in content.model_turn.parts:
                                    if part.inline_data:
                                        await websocket.send_json(
                                            {
                                                "type": "audio",
                                                "data": base64.b64encode(
                                                    part.inline_data.data
                                                ).decode(),
                                            }
                                        )
                            if content and content.input_transcription:
                                text = content.input_transcription.text
                                if text:
                                    await websocket.send_json(
                                        {"type": "transcript_input", "text": text}
                                    )
                            if content and content.output_transcription:
                                text = content.output_transcription.text
                                if text:
                                    await websocket.send_json(
                                        {"type": "transcript_output", "text": text}
                                    )
                            if content and content.interrupted:
                                await websocket.send_json({"type": "interrupted"})
                            if content and content.turn_complete:
                                await websocket.send_json({"type": "turn_complete"})
                            if response.tool_call:
                                await handle_tool_call(response.tool_call)
                            update = response.session_resumption_update
                            if update and update.resumable and update.new_handle:
                                active_sessions[user_id] = update.new_handle
                                await websocket.send_json(
                                    {
                                        "type": "session_token",
                                        "handle": update.new_handle,
                                    }
                                )
                            if response.go_away:
                                seconds = (
                                    response.go_away.time_left.total_seconds()
                                    if response.go_away.time_left
                                    else 0
                                )
                                await websocket.send_json(
                                    {"type": "go_away", "seconds_left": seconds}
                                )
                finally:
                    stop.set()

            client_task = asyncio.create_task(receive_client())
            gemini_task = asyncio.create_task(receive_gemini())
            done, pending = await asyncio.wait(
                {client_task, gemini_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                if not task.cancelled() and task.exception():
                    raise task.exception()
    except Exception:
        if session_handle:
            active_sessions.pop(user_id, None)
            await run_live_session(websocket, user_id, None)
            return
        raise


@app.websocket("/ws/voice")
async def voice_endpoint(websocket: WebSocket, user_id: str) -> None:
    await websocket.accept()
    try:
        await run_live_session(websocket, user_id, active_sessions.get(user_id))
    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("Voice session failed")
        try:
            await websocket.send_json(
                {"type": "error", "message": "Voice session failed."}
            )
            await websocket.close(code=1011)
        except Exception:
            pass
