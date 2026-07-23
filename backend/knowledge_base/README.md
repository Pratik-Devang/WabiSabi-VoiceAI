# Knowledge base

The default development configuration reads the insurance CSV files from
`_reference/gemini-live-api-tts/knowledge_base` without modifying them.

To make the backend independent of `_reference`, copy your final CSV/PDF files
into this directory and set:

```env
KNOWLEDGE_BASE_DIR=./knowledge_base
```
