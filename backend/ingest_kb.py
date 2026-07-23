"""Ingest all configured CSV/PDF files, or paths passed on the command line."""

from __future__ import annotations

import logging
import pathlib
import sys

import rag

logging.basicConfig(level=logging.INFO)


def main() -> None:
    targets = sys.argv[1:] or [rag.KNOWLEDGE_BASE_DIR]
    total_files = 0
    total_chunks = 0
    for target in targets:
        path = pathlib.Path(target)
        if path.is_dir():
            result = rag.ingest_directory(str(path))
            total_files += result["files"]
            total_chunks += result["chunks"]
        elif path.is_file():
            total_files += 1
            total_chunks += rag.ingest_file(path)
    print(
        f"Ingested {total_files} file(s), {total_chunks} chunk(s). "
        f"Collection total: {rag.get_collection().count()}."
    )


if __name__ == "__main__":
    main()
