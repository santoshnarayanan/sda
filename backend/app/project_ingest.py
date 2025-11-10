# app/project_ingest.py
import os
import io
import time
import zipfile
import tempfile
from typing import Tuple, List


from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter


load_dotenv()

QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")


# Match Phase 2 model
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"


ALLOWED_TEXT_EXTS = {
".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".md", ".txt", ".sql",
".yml", ".yaml", ".ini", ".cfg", ".toml"
}
ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg"}


text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)


def _slugify(name: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")


def _extract_zip_to_tmp(file_bytes: bytes) -> str:
    tempdir = tempfile.mkdtemp(prefix="sda_proj_")
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        zf.extractall(tempdir)
    return tempdir


def _iter_files(root: str) -> List[str]:
    out = []
    for base, _, files in os.walk(root):
        for f in files:
            out.append(os.path.join(base, f))
    return out

def ingest_project_zip(user_id: int, project_name: str, file_bytes: bytes) -> Tuple[str, int, int]:
    """
        Returns: (collection_name, files_indexed, chunks_indexed)
    """
    project_slug = _slugify(project_name) or f"proj-{int(time.time())}"
    collection_name = f"project_{user_id}_{project_slug}_{int(time.time())}"

    # Load model lazily so this module imports fast
    model = SentenceTransformer(EMBED_MODEL_NAME)
    vec_size = model.get_sentence_embedding_dimension()


    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


    # Create project‑scoped collection
    client.recreate_collection(
    collection_name=collection_name,
    vectors_config=VectorParams(size=vec_size, distance=Distance.COSINE),
    )


    # Unzip & collect files
    root = _extract_zip_to_tmp(file_bytes)
    files = _iter_files(root)


    text_docs = []
    image_notes = []


    for path in files:
        _, ext = os.path.splitext(path)
        ext = ext.lower()
        try:
            if ext in ALLOWED_TEXT_EXTS:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                    for chunk in text_splitter.split_text(text):
                        text_docs.append({
                        "text": chunk,
                        "source": os.path.relpath(path, root),
                        "file_ext": ext,
                        })
            elif ext in ALLOWED_IMAGE_EXTS:
                # We don't embed images in Phase 4, but keep a note for future OCR/captioning
                image_notes.append({
                    "note": f"Image detected (not embedded in Phase 4): {os.path.relpath(path, root)}",
                    "source": os.path.relpath(path, root)
                })
        except Exception as e:
            # Skip unreadable files; optionally log
            print(f"[INGEST] Skipped {path}: {e}")


    # Embed and upsert
    vectors = model.encode([d["text"] for d in text_docs]).tolist() if text_docs else []


    points = []
    for idx, doc in enumerate(text_docs):
        points.append(models.PointStruct(
        id=idx,
        vector=vectors[idx],
        payload={
        "text": doc["text"],
        "source": doc["source"],
        "file_ext": doc["file_ext"],
        "type": "code_or_text"
        }
        ))


    # Optionally add image note points with zero vectors (or skip entirely)
    # We skip adding image points to avoid bogus vectors.


    if points:
        client.upsert(collection_name=collection_name, wait=True, points=points)


    return collection_name, len(files), len(points)