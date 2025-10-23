# backend/ingest.py

import os

from langchain_openai import ChatOpenAI
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

# --- Load environment ---
load_dotenv()

# This is where the script attempts to read the key.
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=OPENAI_API_KEY, temperature=0.2)

# --- Configuration ---
# Replace with your actual Qdrant URL and API Key (if using Cloud)
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
COLLECTION_NAME = "sda_dev_documentation"
DOCS_PATH = "docs"

# We use a common, small embedding model for demonstration
MODEL_NAME = 'all-MiniLM-L6-v2'

# Initialize Qdrant Client (client will handle authentication if key is provided)
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# 1. Initialize Embedding Model
print(f"Loading embedding model: {MODEL_NAME}...")
try:
    # Set up a local model (requires sentence-transformers install)
    model = SentenceTransformer(MODEL_NAME)
    VECTOR_SIZE = model.get_sentence_embedding_dimension()
except Exception as e:
    print(f"Error loading SentenceTransformer: {e}")
    print("Using a placeholder vector size. You must fix the model import.")
    VECTOR_SIZE = 384  # all-MiniLM-L6-v2 size

# 2. Prepare Qdrant Collection
print(f"Ensuring Qdrant collection '{COLLECTION_NAME}' exists...")
client.recreate_collection(
    collection_name=COLLECTION_NAME,
    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
)

# 3. Load and Split Documents
print(f"Loading documents from {DOCS_PATH}...")
documents = []
for filename in os.listdir(DOCS_PATH):
    if filename.endswith(".txt"):
        with open(os.path.join(DOCS_PATH, filename), 'r') as f:
            content = f.read()
            documents.append({
                "text": content,
                "source": filename
            })

# Use LangChain's text splitter for robust chunking
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len
)

# 4. Generate Embeddings and Upload to Qdrant
points = []
point_id = 0

for doc in documents:
    # Split the document content into chunks
    texts = text_splitter.split_text(doc["text"])

    # Generate embeddings for all text chunks
    vectors = model.encode(texts).tolist()

    for i, text in enumerate(texts):
        points.append(
            models.PointStruct(
                id=point_id,
                vector=vectors[i],
                payload={
                    "text": text,
                    "source": doc["source"],
                    "chunk_id": i
                }
            )
        )
        point_id += 1

print(f"Uploading {len(points)} vector points to Qdrant...")
operation_info = client.upsert(
    collection_name=COLLECTION_NAME,
    wait=True,
    points=points
)

print("\n--- Ingestion Complete ---")
print(f"Total points indexed: {len(points)}")
print(f"Qdrant Operation Status: {operation_info.status}")