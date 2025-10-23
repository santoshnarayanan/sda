# app/main.py

from fastapi import FastAPI, HTTPException
from .models import CodeGenerationRequest, GenerationResponse, HistoryResponse, HistoryEntry
from .ai_service import generate_content_with_llm
import os
import psycopg2
from psycopg2.extras import RealDictCursor  # To get results as dictionaries
from fastapi.middleware.cors import CORSMiddleware

# --- Configuration (Replace with actual environment variables) ---
# NOTE: Using a hardcoded ID for Phase 1 based on our previous discussion
# The actual user_id should be retrieved from a session/auth token.
TEST_USER_ID = 1  # Assuming you manually inserted user_id=1 as 'test_dev'

# Database Connection Details (Place these in a .env file in a real app)
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_NAME = os.environ.get("DB_NAME", "sda_dev_db")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "atos@123")  # CHANGE THIS

app = FastAPI(
    title="Smart Developer Assistant Backend (Phase 1)",
    version="1.0"
)

# --- CRITICAL CORS CONFIGURATION ---
# This allows the frontend (running on a different port) to access the backend.

origins = [
    # Replace with your actual frontend port if different from 5173
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # Allow requests from your frontend development server
    allow_credentials=True,            # Allow cookies/authorization headers
    allow_methods=["*"],               # Allow all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],               # Allow all headers
)

# --- Database Utility Function ---

def get_db_connection():
    """Establishes and returns a PostgreSQL connection."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        # In a real app, you might want to stop startup or log this aggressively
        raise HTTPException(status_code=503, detail="Database service unavailable")


# --- API Endpoints ---

@app.post("/api/v1/generate", response_model=GenerationResponse, status_code=200)
async def generate_code_and_log(request: CodeGenerationRequest):
    """
    Takes a prompt, calls the AI service, and logs the result to PostgreSQL.
    """

    # 1. Generate content using the LLM service (LangChain integration placeholder)
    ai_response = generate_content_with_llm(
        prompt=request.prompt_text,
        language=request.content_language
    )

    # 2. Log the request and response to PostgreSQL
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # SQL INSERT statement
        insert_query = """
                       INSERT INTO request_history (user_id, prompt_text, generated_content, request_type, \
                                                    content_language)
                       VALUES (%s, %s, %s, %s, %s); \
                       """
        cursor.execute(insert_query, (
            TEST_USER_ID,  # Hardcoded for Phase 1
            request.prompt_text,
            ai_response.generated_content,
            ai_response.request_type,
            ai_response.content_language
        ))

        conn.commit()
    except Exception as e:
        # Log the error, but don't prevent the AI response from being returned
        print(f"Failed to log history to DB: {e}")
        # Optionally, raise an exception if logging is critical
    finally:
        if conn:
            conn.close()

    # 3. Return the AI response to the frontend
    return ai_response


@app.get("/api/v1/history", response_model=HistoryResponse)
async def get_history():
    """
    Retrieves the request history for the test user from PostgreSQL.
    """
    conn = None
    try:
        conn = get_db_connection()
        # Use RealDictCursor to get results as dicts, easier for Pydantic mapping
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # SQL SELECT statement
        select_query = """
                       SELECT history_id, prompt_text, generated_content, request_type, content_language, created_at
                       FROM request_history
                       WHERE user_id = %s
                       ORDER BY created_at DESC; \
                       """
        cursor.execute(select_query, (TEST_USER_ID,))

        # Map DB results to Pydantic model
        history_list = [HistoryEntry(**row) for row in cursor.fetchall()]

        return HistoryResponse(history=history_list)

    except Exception as e:
        print(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving history")
    finally:
        if conn:
            conn.close()

# --- How to Run the Server ---
# Save the files, install dependencies, and run from your terminal:
# uvicorn app.main:app --reload