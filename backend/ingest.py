# backend/ingest.py

import os
from typing import Iterable, Optional, Dict, Any, List

from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# --- Env ---
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")  # not required for ingestion
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
COLLECTION_NAME = os.environ.get("QDRANT_COLLECTION", "sda_dev_documentation")
DEFAULT_DOCS_PATH = os.environ.get("DOCS_PATH", "docs")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "all-MiniLM-L6-v2")

# --- Clients / Models ---
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

def ensure_collection(collection_name: str, vector_size: int, recreate: bool = False) -> None:
    if recreate:
        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        return
    # idempotent create
    try:
        client.get_collection(collection_name=collection_name)
    except Exception:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )

def iter_text_files(docs_path: str) -> Iterable[Dict[str, Any]]:
    for root, _, files in os.walk(docs_path):
        for fn in files:
            if fn.lower().endswith((".txt", ".md")):
                full = os.path.join(root, fn)
                with open(full, "r", encoding="utf-8", errors="ignore") as f:
                    yield {
                        "text": f.read(),
                        "source": os.path.relpath(full, docs_path).replace("\\", "/"),
                        "doctype": os.path.splitext(fn)[1].lstrip(".").lower(),
                    }

def chunk_text(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50, length_function=len)
    return splitter.split_text(text)

def build_payload(base: Dict[str, Any], chunk_text: str, chunk_id: int, tags: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = {
        "text": chunk_text,
        "source": base.get("source", "unknown"),
        "doctype": base.get("doctype", "txt"),
        "chunk_id": chunk_id,
    }
    if tags:
        payload.update(tags)
    return payload

def upsert_documents(
    docs: Iterable[Dict[str, Any]],
    collection_name: str = COLLECTION_NAME,
    embed_model_name: str = EMBED_MODEL,
    recreate: bool = False,
    default_tags: Optional[Dict[str, Any]] = None,
) -> int:
    """Upsert (no destructive recreate unless explicitly requested). Returns total points indexed."""
    model = SentenceTransformer(embed_model_name)
    vector_size = model.get_sentence_embedding_dimension()

    ensure_collection(collection_name, vector_size, recreate)

    points: List[models.PointStruct] = []
    pid = 0
    for doc in docs:
        chunks = chunk_text(doc["text"])
        vectors = model.encode(chunks).tolist()
        for i, ch in enumerate(chunks):
            points.append(
                models.PointStruct(
                    id=None,  # let Qdrant assign
                    vector=vectors[i],
                    payload=build_payload(doc, ch, i, tags=default_tags),
                )
            )
            pid += 1

    if points:
        client.upsert(collection_name=collection_name, wait=True, points=points)

    return pid

# --- CLI use: python ingest.py [DOCS_PATH] ---
if __name__ == "__main__":
    path = DEFAULT_DOCS_PATH
    if not os.path.isdir(path):
        os.makedirs(path, exist_ok=True)
    total = upsert_documents(iter_text_files(path), collection_name=COLLECTION_NAME, recreate=False)
    print(f"Ingestion complete. Total points indexed: {total}")
