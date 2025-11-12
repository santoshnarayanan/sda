# backend/phase5_ingest.py
"""
Phase 5 Ingestion: Docs + Chat history → Qdrant

Usage examples:
  # Ingest docs from a folder
  python backend/phase5_ingest.py --user-id 1 --docs-path backend/docs

  # Ingest chat history (JSONL) and docs into the same collection
  python backend/phase5_ingest.py --user-id 1 --session-id s_2025_11_11 \
      --chat-jsonl data/chat_history.jsonl --docs-path backend/docs

  # Use a custom collection and skip docs
  python backend/phase5_ingest.py --user-id 1 --collection sda_memory_user_1 \
      --chat-jsonl data/chat.jsonl
"""

import os
import json
import argparse
import hashlib
from typing import Iterable, Dict, Any, List, Optional

from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# --- Env (Qdrant) ---
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")

# Defaults (align with earlier phases)
DEFAULT_EMBED_MODEL = os.environ.get("EMBED_MODEL", "all-MiniLM-L6-v2")
DEFAULT_BASE_COLLECTION = os.environ.get("QDRANT_COLLECTION", "sda_dev_documentation")

# --- Text splitter (longer for docs; chats are smaller) ---
DOC_SPLITTER = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
CHAT_SPLITTER = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def _hash_id(*parts: str) -> int:
    """Stable integer id for dedupe/upserts."""
    s = "|".join(parts)
    return int(hashlib.sha1(s.encode("utf-8")).hexdigest()[:16], 16)


def ensure_collection(name: str, vector_size: int) -> None:
    try:
        client.get_collection(collection_name=name)
    except Exception:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def iter_docs(docs_path: str) -> Iterable[Dict[str, Any]]:
    exts = {".md", ".txt", ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".sql", ".yml", ".yaml", ".toml", ".ini", ".cfg"}
    for root, _, files in os.walk(docs_path):
        for fn in files:
            _, ext = os.path.splitext(fn.lower())
            if ext in exts:
                full = os.path.join(root, fn)
                try:
                    with open(full, "r", encoding="utf-8", errors="ignore") as f:
                        yield {
                            "text": f.read(),
                            "source": os.path.relpath(full, docs_path).replace("\\", "/"),
                            "file_ext": ext.lstrip("."),
                        }
                except Exception as e:
                    print(f"[DOCS] Skipped {full}: {e}")


def iter_chat_jsonl(path: str) -> Iterable[Dict[str, Any]]:
    """
    Expected JSONL fields per line (flexible, but these help the payload):
      { "timestamp":"2025-11-11T10:12:00Z", "role":"user|assistant|system", "content":"...", "turn": 1 }
    """
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if "content" not in obj:
                    continue
                yield obj
            except json.JSONDecodeError:
                continue


def build_points_for_docs(
    model: SentenceTransformer,
    docs: Iterable[Dict[str, Any]],
    user_id: int,
    session_id: Optional[str],
    namespace: str = "docs",
) -> List[models.PointStruct]:
    points: List[models.PointStruct] = []
    for d in docs:
        chunks = DOC_SPLITTER.split_text(d["text"])
        if not chunks:
            continue
        vectors = model.encode(chunks).tolist()
        for i, ch in enumerate(chunks):
            pid = _hash_id("docs", str(user_id), session_id or "", d.get("source",""), str(i), ch[:64])
            payload = {
                "namespace": namespace,
                "user_id": user_id,
                "session_id": session_id,
                "text": ch,
                "source": d.get("source", "unknown"),
                "file_ext": d.get("file_ext", "txt"),
                "chunk_id": i,
            }
            points.append(models.PointStruct(id=pid, vector=vectors[i], payload=payload))
    return points


def build_points_for_chat(
    model: SentenceTransformer,
    chats: Iterable[Dict[str, Any]],
    user_id: int,
    session_id: str,
    namespace: str = "chat",
) -> List[models.PointStruct]:
    points: List[models.PointStruct] = []
    for idx, msg in enumerate(chats):
        content = str(msg.get("content", "")).strip()
        if not content:
            continue
        # For long messages, chunk; otherwise embed directly
        chunks = CHAT_SPLITTER.split_text(content) if len(content) > 450 else [content]
        vectors = model.encode(chunks).tolist()
        for ci, ch in enumerate(chunks):
            pid = _hash_id("chat", str(user_id), session_id, str(idx), str(ci), ch[:64])
            payload = {
                "namespace": namespace,
                "user_id": user_id,
                "session_id": session_id,
                "text": ch,
                "role": msg.get("role", "user"),
                "turn": msg.get("turn", idx),
                "timestamp": msg.get("timestamp"),
                "chunk_id": ci,
                "source": f"chat:{session_id}:{msg.get('role','user')}",
            }
            points.append(models.PointStruct(id=pid, vector=vectors[ci], payload=payload))
    return points


def upsert_points(collection: str, points: List[models.PointStruct]) -> int:
    if not points:
        return 0
    client.upsert(collection_name=collection, points=points, wait=True)
    return len(points)


def main():
    ap = argparse.ArgumentParser(description="Phase 5 Ingestion: docs + chat → Qdrant")
    ap.add_argument("--user-id", type=int, required=True, help="Numeric user id")
    ap.add_argument("--session-id", type=str, default=None, help="Chat session id (e.g., s_2025_11_11)")
    ap.add_argument("--docs-path", type=str, default=None, help="Folder with docs/code to ingest")
    ap.add_argument("--chat-jsonl", type=str, default=None, help="Path to chat history JSONL")
    ap.add_argument("--collection", type=str, default=None, help="Target Qdrant collection (defaults to env QDRANT_COLLECTION)")
    ap.add_argument("--embed-model", type=str, default=DEFAULT_EMBED_MODEL)
    args = ap.parse_args()

    collection = args.collection or DEFAULT_BASE_COLLECTION
    model = SentenceTransformer(args.embed_model)
    vec_size = model.get_sentence_embedding_dimension()
    ensure_collection(collection, vec_size)

    total = 0

    if args.docs_path and os.path.isdir(args.docs_path):
        doc_points = build_points_for_docs(
            model=model,
            docs=iter_docs(args.docs_path),
            user_id=args.user_id,
            session_id=args.session_id,
            namespace="docs",
        )
        total += upsert_points(collection, doc_points)
        print(f"[OK] Indexed docs/code points: {len(doc_points)} → {collection}")

    if args.chat_jsonl:
        if not args.session_id:
            raise SystemExit("--session-id is required when using --chat-jsonl")
        chat_points = build_points_for_chat(
            model=model,
            chats=iter_chat_jsonl(args.chat_jsonl),
            user_id=args.user_id,
            session_id=args.session_id,
            namespace="chat",
        )
        total += upsert_points(collection, chat_points)
        print(f"[OK] Indexed chat points: {len(chat_points)} → {collection}")

    if total == 0:
        print("No data ingested. Provide --docs-path and/or --chat-jsonl.")
    else:
        print(f"Ingestion complete. Total points indexed: {total} (collection: {collection})")


if __name__ == "__main__":
    main()
