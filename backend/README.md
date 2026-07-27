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

Put knowledge files anywhere under `backend/knowledge_base/`. The backend scans
that directory recursively for CSV and PDF files. On startup it compares their
paths, sizes, and modification times with the persisted index and automatically
rebuilds Chroma when the files have changed.

To force a rebuild while the API is running:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/rag/refresh
```

For auto-reload in PowerShell, attach the exclusion with `=` so the shell does
not expand the Chroma wildcard into filenames:

```powershell
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude='chroma_data/**'
```

## Endpoints

- `GET /health`
- `GET /rag/status`
- `POST /rag/refresh`
- `POST /chat/follow-up`
- `POST /voice/context`
- `WS /ws/voice?user_id=<account-email>`

The WebSocket accepts 16 kHz mono PCM audio as base64 JSON and returns 24 kHz
PCM audio, live input/output transcripts, manual-grounded RAG lookup events, and
session tokens. Equipment answers are grounded in the indexed manuals through
the `search_knowledge_base` Gemini Live tool.
