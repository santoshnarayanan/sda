import os
import psycopg2
from psycopg2.extras import RealDictCursor

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

# Models (Pydantic)
from .models import (
    CodeGenerationRequest, GenerationResponse,
    HistoryResponse, HistoryEntry,
    DocQARequest, IngestRequest, CodeRefactorRequest,
    ProjectUploadResponse, AnalyzeProjectRequest, AnalyzeProjectResponse,
    ReviewCodeRequest, ReviewCodeResponse,
    GithubLoginUrlResponse, GithubAuthCompleteRequest,
    GithubReposResponse, ImportRepoRequest, ImportRepoResponse,
    GithubAuthCompleteResponse, GithubRepo,
    AgentRunRequest, AgentRunResponse,
)

# Agent manager
from .agents.manager import run_agent_task

# Internal modules
from .ai_service import (
    generate_content_with_llm,
    answer_from_docs,
    refactor_code_with_llm,
    analyze_project_structure,
    review_code_snippet,
)

from .project_ingest import ingest_project_zip
from .speech_service import router as speech_router

from .github_oauth import (
    build_github_login_url,
    exchange_code_for_token,
    get_github_user,
    list_repos,
    download_repo_zip,
    GithubOAuthError,
)

from .api import snippets, settings

from ingest import upsert_documents

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

def ensure_github_accounts_table(conn):
    """
    Create github_accounts table if it does not exist.
    Stores GitHub OAuth access tokens per internal user.
    """
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS github_accounts (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            github_id BIGINT,
            github_login TEXT,
            access_token TEXT NOT NULL,
            token_type TEXT,
            scope TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    
def get_github_access_token_for_user(user_id: int) -> str:
    conn = get_db_connection()
    ensure_github_accounts_table(conn)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT access_token FROM github_accounts WHERE user_id = %s ORDER BY id DESC LIMIT 1",
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="No GitHub account connected for this user")
        return row[0]
    finally:
        try:
            conn.close()
        except Exception:
            pass




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


@app.post("/api/chat")
async def chat_api(payload: dict):
    """
    Minimal chat endpoint for Phase 5.
    Stores chat history, returns LLM response.
    """
    user_id = payload.get("user_id", TEST_USER_ID)
    message = payload.get("message", "")
    session_id = payload.get("session_id", "default")

    if not message.strip():
        raise HTTPException(status_code=400, detail="Message required")

    # Generate LLM response
    response = generate_content_with_llm(prompt=message, language="markdown")

    # Store chat history
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO chat_history (user_id, session_id, user_message, ai_response)
            VALUES (%s, %s, %s, %s)
        """, (user_id, session_id, message, response.generated_content))
        conn.commit()
    except Exception as e:
        print("[CHAT] Failed to save:", e)
    finally:
        try:
            conn.close()
        except:
            pass

    return {"response": response.generated_content}


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
    
@app.post("/api/v1/agent_run", response_model=AgentRunResponse)
async def agent_run(req: AgentRunRequest):
    """
    Phase 6 Part 2: Multi-Agent System entrypoint.

    task_type:
      - 'analyze_architecture'
      - 'refactor_code'
      - 'generate_deployment'
      - 'repo_overview'
    """
    try:
        # For now we trust req.collection_name is correct if provided.
        result = run_agent_task(req)
        return result
    except Exception as e:
        print(f"[AgentRun] Error while executing agent graph: {e}")
        raise HTTPException(status_code=500, detail="Agent execution failed")


@app.get("/api/v1/auth/github/login_url", response_model=GithubLoginUrlResponse)
async def github_login_url(state: str = Query("sda-demo", description="Opaque state for CSRF protection")):
    """
    Returns the GitHub OAuth login URL that the frontend should redirect the user to.
    """
    try:
        url = build_github_login_url(state)
        return GithubLoginUrlResponse(login_url=url, state=state)
    except GithubOAuthError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/auth/github/complete", response_model=GithubAuthCompleteResponse)
async def github_auth_complete(payload: GithubAuthCompleteRequest):
    """
    Frontend calls this after GitHub redirects back with ?code=...
    We exchange 'code' for an access token, fetch the GitHub user,
    and persist the mapping in github_accounts.
    """
    user_id = payload.user_id or TEST_USER_ID

    try:
        token_data = await exchange_code_for_token(payload.code)
        access_token = token_data.get("access_token")
        token_type = token_data.get("token_type")
        scope = token_data.get("scope")

        gh_user = await get_github_user(access_token)
        github_id = int(gh_user.get("id"))
        github_login = gh_user.get("login")

        conn = get_db_connection()
        ensure_github_accounts_table(conn)
        cur = conn.cursor()
        # Upsert-like behavior: we keep it simple by deleting any existing record
        cur.execute(
            "DELETE FROM github_accounts WHERE user_id = %s",
            (user_id,),
        )
        cur.execute(
            """
            INSERT INTO github_accounts (user_id, github_id, github_login, access_token, token_type, scope)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, github_id, github_login, access_token, token_type, scope),
        )
        conn.commit()
    except GithubOAuthError as e:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth failed: {e}")
    except Exception as e:
        print(f"[GitHub OAuth] Failed to complete auth: {e}")
        raise HTTPException(status_code=500, detail="Internal error during GitHub OAuth flow")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return GithubAuthCompleteResponse(
        user_id=user_id,
        github_login=github_login,
        github_id=github_id,
        scope=scope,
    )

@app.get("/api/v1/github/repos", response_model=GithubReposResponse)
async def github_list_repos(user_id: int = Query(TEST_USER_ID)):
    """
    List GitHub repositories accessible for the authenticated user.
    Uses the token stored in github_accounts.
    """
    token = get_github_access_token_for_user(user_id)
    try:
        repos_raw = await list_repos(token)
    except Exception as e:
        print(f"[GitHub] Failed to list repos: {e}")
        raise HTTPException(status_code=500, detail="Failed to list GitHub repos")

    # Map into our Pydantic model
    repos = []
    for r in repos_raw:
        try:
            repos.append(
                GithubRepo(
                    id=r.get("id"),
                    full_name=r.get("full_name"),
                    private=bool(r.get("private")),
                    description=r.get("description"),
                    default_branch=r.get("default_branch"),
                )
            )
        except Exception:
            continue

    return GithubReposResponse(repos=repos)

@app.post("/api/v1/import_repo", response_model=ImportRepoResponse)
async def import_repo(req: ImportRepoRequest):
    """
    Downloads a GitHub repo (zipball) for the authenticated user
    and indexes it into a dedicated Qdrant collection using the existing project_ingest logic.
    """
    user_id = req.user_id or TEST_USER_ID
    token = get_github_access_token_for_user(user_id)

    # Download ZIP from GitHub
    try:
        zip_bytes, resolved_ref = await download_repo_zip(
            token,
            full_name=req.repo_full_name,
            ref=req.branch,
        )
    except Exception as e:
        print(f"[GitHub] Failed to download repo zip: {e}")
        raise HTTPException(status_code=500, detail="Failed to download GitHub repository")

    # Derive a human-friendly project_name from repo_full_name
    # e.g., owner/repo -> repo
    project_name = req.repo_full_name.split("/")[-1]

    # Reuse existing ingestion pipeline
    try:
        collection_name, files_indexed, chunks_indexed = ingest_project_zip(
            user_id=user_id,
            project_name=project_name,
            file_bytes=zip_bytes,
        )
    except Exception as e:
        print(f"[GitHub] Failed to ingest repo: {e}")
        raise HTTPException(status_code=500, detail="Failed to ingest repository into Qdrant")

    # Persist mapping into project_collections as Phase 4 already does
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
            (user_id, project_name, collection_name),
        )
        conn.commit()
    except Exception as e:
        print(f"[WARN] Could not persist project mapping (GitHub import): {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return ImportRepoResponse(
        user_id=user_id,
        repo_full_name=req.repo_full_name,
        branch=req.branch or resolved_ref,
        qdrant_collection=collection_name,
        files_indexed=files_indexed,
        chunks_indexed=chunks_indexed,
    )

