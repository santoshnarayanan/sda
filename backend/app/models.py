from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# --- Request Models (Data from Frontend to Backend) ---

class CodeGenerationRequest(BaseModel):
    """Model for the user's request to generate code or explanation."""
    # The prompt entered by the user
    prompt_text: str = Field(..., example="Write a React component for a login form using Tailwind CSS.")

    # User ID is optional for Phase 1 testing but kept for future phases
    user_id: Optional[int] = None

    # Field for the desired output language/framework
    content_language: str = Field("python", example="javascript/react")


# --- Response Models (Data from Backend to Frontend) ---

class GenerationResponse(BaseModel):
    """Model for the AI's generated response."""
    # The intelligent output from the LLM/RAG chain
    generated_content: str = Field(..., example="def sort_list(l):\n  return sorted(l)")
    content_language: str  # The detected/requested language
    request_type: str = Field("code_gen_rag", description="Type of AI task performed")


# --- Database Models (Used for History Retrieval) ---

class HistoryEntry(BaseModel):
    """Model for reading individual history entries from PostgreSQL."""
    history_id: int
    prompt_text: str
    generated_content: str
    request_type: str
    content_language: Optional[str]
    created_at: datetime

    class Config:
        # Allows conversion from SQLAlchemy/psycopg2 objects to Pydantic model
        from_attributes = True


class HistoryResponse(BaseModel):
    """Model for the list of historical requests displayed in the DataGrid."""
    history: list[HistoryEntry]