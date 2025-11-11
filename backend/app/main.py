import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
import psycopg2

from .models import (
    CodeGenerationRequest, GenerationResponse,
    HistoryResponse, HistoryEntry,
    DocQARequest, IngestRequest, CodeRefactorRequest,
    ProjectUploadResponse, AnalyzeProjectRequest, AnalyzeProjectResponse,
    ReviewCodeRequest, ReviewCodeResponse
)
from .ai_service import generate_content_with_llm, answer_from_docs, refactor_code_with_llm, analyze_project_structure, review_code_snippet
# import from sibling package (adjust if your layout differs)
from ingest import upsert_documents
from .project_ingest import ingest_project_zip
from .speech_service import router as speech_router
from .api import chat,snippets,settings
from dotenv import load_dotenv
load_dotenv()


# --- Config ---
TEST_USER_ID = 1  # Phase 1 simplification
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_NAME = os.environ.get("DB_NAME", "sda_dev_db")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "atos@123")  # CHANGE IN PROD
INTERNAL_INGEST_KEY = os.environ.get(
    "INTERNAL_INGEST_KEY", "super-secret-key-dev")

app = FastAPI(
    title="Smart Developer Assistant Backend (Phase 2)", version="2.0")

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(speech_router)
app.include_router(chat.router)
app.include_router(snippets.router)
app.include_router(settings.router)

def get_db_connection():
    try:
        return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    except Exception as e:
        print(f"Database connection failed: {e}")
        raise HTTPException(
            status_code=503, detail="Database service unavailable")

# --- Phase 1 endpoint (kept) ---


@app.post("/api/v1/generate", response_model=GenerationResponse, status_code=200)
async def generate_code_and_log(request: CodeGenerationRequest):
    ai_response = generate_content_with_llm(
        prompt=request.prompt_text, language=request.content_language)
    # Log best-effort
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO request_history (user_id, prompt_text, generated_content, request_type, content_language)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (TEST_USER_ID, request.prompt_text, ai_response.generated_content,
                 ai_response.request_type, ai_response.content_language),
            )
            conn.commit()
    except Exception as e:
        print(f"Failed to log history: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return ai_response

# --- Phase 2: Docs Q&A with retrieval params ---


@app.post("/api/v1/answer_from_docs", response_model=GenerationResponse, status_code=200)
async def answer_from_docs_api(request: DocQARequest):
    resp = answer_from_docs(request)
    # Optional: log this too
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO request_history (user_id, prompt_text, generated_content, request_type, content_language)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (TEST_USER_ID, request.prompt_text, resp.generated_content,
                 resp.request_type, resp.content_language),
            )
            conn.commit()
    except Exception as e:
        print(f"Failed to log docs_qa history: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return resp

# --- Phase 2: Secure ingestion endpoint ---


def require_internal_key(x_internal_key: str = Header(...)):
    if x_internal_key != os.environ.get("INTERNAL_INGEST_KEY", INTERNAL_INGEST_KEY):
        raise HTTPException(status_code=401, detail="Invalid X-Internal-Key")
    return True


@app.post("/api/v1/upload_docs", dependencies=[Depends(require_internal_key)], status_code=200)
async def upload_docs_api(payload: IngestRequest):
    # Upsert a single text doc (filename + text + tags)
    try:
        total = upsert_documents(
            docs=[{"text": payload.text,
                   "source": payload.filename, "doctype": "txt"}],
            default_tags=payload.tags or {},
            recreate=False,
        )
        return {"indexed_points": total, "status": "ok"}
    except Exception as e:
        print(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

# --- History (kept) ---


@app.get("/api/v1/history", response_model=HistoryResponse)
async def get_history():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT history_id, prompt_text, generated_content, request_type, content_language, created_at
            FROM request_history
            WHERE user_id = %s
            ORDER BY created_at DESC;
            """,
            (TEST_USER_ID,),
        )
        history_list = [HistoryEntry(**row) for row in cursor.fetchall()]
        return HistoryResponse(history=history_list)
    except Exception as e:
        print(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving history")
    finally:
        try:
            conn.close()
        except Exception:
            pass


# --- Phase 3 ---
@app.post("/api/v1/refactor", response_model=GenerationResponse, status_code=200)
async def refactor_code(request: CodeRefactorRequest):
    """
    Takes a code block, calls the AI service to refactor/debug it,
    and logs the output to PostgreSQL.
    """
    ai_response = refactor_code_with_llm(
        code=request.code_text,
        language=request.language
    )

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        insert_query = """
                       INSERT INTO request_history (user_id, prompt_text, generated_content, request_type, content_language)
                       VALUES (%s, %s, %s, %s, %s);
                       """
        cursor.execute(insert_query, (
            request.user_id or TEST_USER_ID,
            request.code_text,
            ai_response.generated_content,
            ai_response.request_type,
            ai_response.content_language
        ))
        conn.commit()
    except Exception as e:
        print(f"Failed to log refactor history: {e}")
    finally:
        if conn:
            conn.close()

    return ai_response


@app.post("/api/v1/upload_project", response_model=ProjectUploadResponse)
async def upload_project(
    user_id: int = Form(...),
    project_name: str = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip file")


    file_bytes = await file.read()
    collection_name, files_indexed, chunks_indexed = ingest_project_zip(
        user_id, project_name, file_bytes)


    # Optional: persist mapping in DB if table exists
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
                CREATE TABLE IF NOT EXISTS project_collections (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL,
                    project_name TEXT,
                    qdrant_collection TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """
            )
        cur.execute(
            "INSERT INTO project_collections (user_id, project_name, qdrant_collection) VALUES (%s, %s, %s)",
            (user_id, project_name, collection_name)
        )
        conn.commit()
    except Exception as e:
        print(f"[WARN] Could not persist project mapping: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


    return ProjectUploadResponse(
        user_id=user_id,
        project_name=project_name,
        qdrant_collection=collection_name,
        files_indexed=files_indexed,
        chunks_indexed=chunks_indexed,
    )


@app.post("/api/v1/analyze_project", response_model=AnalyzeProjectResponse)
async def analyze_project(req: AnalyzeProjectRequest):
    summary = analyze_project_structure(req.collection_name, req.focus)
    return AnalyzeProjectResponse(
        collection_name=req.collection_name,
        focus=req.focus,
        summary_markdown=summary,
    )


@app.post("/api/v1/review_code", response_model=ReviewCodeResponse)
async def review_code(req: ReviewCodeRequest):
    review = review_code_snippet(
        collection_name=req.collection_name,
        code=req.code,
        language=req.language or "python",
        ruleset=req.ruleset or "default",
    )
    return ReviewCodeResponse(
        collection_name=req.collection_name,
        language=req.language or "python",
        ruleset=req.ruleset or "default",
        review_markdown=review,
    )
