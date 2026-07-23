# Vox Voice AI

Vox is a Next.js Voice AI workspace connected to a FastAPI gateway for Gemini
Live audio and local Chroma RAG.

## Structure

```text
VoiceAI/
├── app/
│   ├── page.tsx                 # Sign in
│   ├── workspace/page.tsx       # Account workspace and saved calls
│   └── voice/page.tsx           # Live audio and transcript
├── components/                  # Voice UI components
├── lib/
│   ├── session-store.ts         # Browser session persistence
│   └── use-voice-session.ts     # WebSocket and Web Audio client
├── backend/
│   ├── main.py                  # FastAPI and Gemini Live gateway
│   ├── rag.py                   # Chroma retrieval and ingestion
│   ├── ingest_kb.py
│   └── .env.example
└── _reference/                  # Read-only reference; ignored by Git
```

## Frontend

Copy `.env.example` to `.env.local`, then run:

```bash
npm install
npm run dev
```

The voice client uses:

```env
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8000/ws/voice
```

## Backend

Follow [backend/README.md](backend/README.md). The backend expects 16 kHz mono
PCM microphone audio and returns Gemini's 24 kHz PCM audio, input/output
transcripts, RAG activity, and resumable session tokens.

## Persistence

Completed call durations and transcript lines are stored per account in the
browser. Chroma vectors persist under `backend/chroma_data/`. A database can
replace browser session storage later without changing the live audio protocol.
