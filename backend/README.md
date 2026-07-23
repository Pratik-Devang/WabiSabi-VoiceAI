# Vox Live RAG backend

This backend is adapted from the project under `_reference` without importing
its environment secrets, virtual environment, cache, or generated Chroma data.

## Setup

```powershell
cd backend
Copy-Item .env.example .env
```

Add your new Gemini key to `backend/.env`, then install and run:

```powershell
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

The first startup downloads the local embedding model and indexes the configured
CSV/PDF knowledge files if the Chroma collection is empty.

For auto-reload in PowerShell, attach the exclusion with `=` so the shell does
not expand the Chroma wildcard into filenames:

```powershell
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude='chroma_data/**'
```

## Endpoints

- `GET /health`
- `GET /rag/status`
- `POST /rag/refresh`
- `WS /ws/voice?user_id=<account-email>`

The WebSocket accepts 16 kHz mono PCM audio as base64 JSON and returns 24 kHz
PCM audio, live input/output transcripts, RAG lookup events, and session tokens.
