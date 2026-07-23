"""Persistent local RAG store for CSV and PDF knowledge files."""

from __future__ import annotations

import csv
import logging
import os
import pathlib
from typing import Any

import chromadb
from fastembed import TextEmbedding

log = logging.getLogger("vox.rag")

KNOWLEDGE_BASE_DIR = os.getenv("KNOWLEDGE_BASE_DIR", "./knowledge_base")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME = os.getenv("RAG_COLLECTION_NAME", "knowledge_base")
EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5"
)
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
SUPPORTED_SUFFIXES = {".csv", ".pdf"}

_embedding_model: TextEmbedding | None = None
_chroma_client: Any = None
_collection: Any = None


def _get_embedding_model() -> TextEmbedding:
    global _embedding_model
    if _embedding_model is None:
        log.info("Loading embedding model %s", EMBEDDING_MODEL_NAME)
        _embedding_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME)
    return _embedding_model


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return [vector.tolist() for vector in _get_embedding_model().embed(texts)]


def get_collection():
    global _chroma_client, _collection
    if _collection is None:
        pathlib.Path(CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def _chunk_text(text: str) -> list[str]:
    clean = text.strip()
    if not clean:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(clean):
        end = min(start + CHUNK_SIZE, len(clean))
        chunks.append(clean[start:end])
        if end == len(clean):
            break
        start = end - CHUNK_OVERLAP
    return chunks


def _docs_from_csv(path: pathlib.Path) -> list[tuple[str, dict]]:
    docs: list[tuple[str, dict]] = []
    with path.open(encoding="utf-8", errors="replace", newline="") as handle:
        for index, row in enumerate(csv.DictReader(handle)):
            fields = " | ".join(
                f"{(key or '').strip()}: {value}"
                for key, value in row.items()
                if value not in (None, "")
            )
            docs.append(
                (
                    f"Record from {path.name} (row {index}): {fields}",
                    {"source": path.name, "chunk": index, "kind": "csv_row"},
                )
            )
    return docs


def _docs_from_pdf(path: pathlib.Path) -> list[tuple[str, dict]]:
    from pdfminer.high_level import extract_text

    return [
        (
            f"From {path.name}: {chunk}",
            {"source": path.name, "chunk": index, "kind": "pdf_chunk"},
        )
        for index, chunk in enumerate(_chunk_text(extract_text(str(path))))
    ]


def ingest_file(path: pathlib.Path) -> int:
    path = pathlib.Path(path)
    if path.suffix.lower() == ".csv":
        docs = _docs_from_csv(path)
    elif path.suffix.lower() == ".pdf":
        docs = _docs_from_pdf(path)
    else:
        return 0

    collection = get_collection()
    collection.delete(where={"source": path.name})
    if not docs:
        return 0

    texts = [doc[0] for doc in docs]
    metadata = [doc[1] for doc in docs]
    collection.upsert(
        ids=[f"{path.name}::{item['chunk']}" for item in metadata],
        embeddings=embed_texts(texts),
        documents=texts,
        metadatas=metadata,
    )
    return len(docs)


def ingest_directory(directory: str = KNOWLEDGE_BASE_DIR) -> dict:
    base = pathlib.Path(directory)
    if not base.exists():
        return {"files": 0, "chunks": 0, "file_names": []}
    files = sorted(
        path
        for path in base.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    )
    chunks = sum(ingest_file(path) for path in files)
    return {
        "files": len(files),
        "chunks": chunks,
        "file_names": [path.name for path in files],
    }


def search(query: str, top_k: int = DEFAULT_TOP_K) -> list[dict]:
    collection = get_collection()
    count = collection.count()
    if not query.strip() or count == 0:
        return []
    result = collection.query(
        query_embeddings=[embed_texts([query])[0]],
        n_results=min(top_k, count),
    )
    docs = (result.get("documents") or [[]])[0]
    metadata = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    return [
        {
            "text": document,
            "source": (meta or {}).get("source"),
            "relevance_score": round(1 - distance, 4)
            if distance is not None
            else None,
        }
        for document, meta, distance in zip(docs, metadata, distances)
    ]
