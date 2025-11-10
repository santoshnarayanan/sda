from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

# --- Requests ---

class CodeGenerationRequest(BaseModel):
    prompt_text: str = Field(..., example="Write a React component for a login form using Tailwind CSS.")
    user_id: Optional[int] = None
    content_language: str = Field("python", example="javascript/react")

class DocQARequest(BaseModel):
    prompt_text: str = Field(..., example="What port does the internal API run on?")
    user_id: Optional[int] = None
    # Retrieval knobs
    top_k: int = Field(6, ge=1, le=20)
    rerank: bool = Field(True, description="Apply simple cross/heuristic re-ranking")
    filters: Optional[Dict[str, Any]] = Field(None, description="e.g. {'source': 'api_service.txt'}")
    content_language: str = Field("markdown", example="markdown")

class IngestRequest(BaseModel):
    # either raw text or base64/bytes in a future rev; keeping simple for Phase 2
    filename: str = Field(..., example="notes.txt")
    text: str = Field(..., description="Raw text content to index")
    tags: Optional[Dict[str, Any]] = None

# --- Responses ---

class SourceChunk(BaseModel):
    source: str
    chunk_id: int
    score: Optional[float] = None
    snippet: Optional[str] = None

class GenerationResponse(BaseModel):
    generated_content: str = Field(..., example="def sort_list(l):\n  return sorted(l)")
    content_language: str
    request_type: str = Field("code_gen_rag", description="Type of AI task performed")
    sources: Optional[List[SourceChunk]] = None

# --- DB History ---

class HistoryEntry(BaseModel):
    history_id: int
    prompt_text: str
    generated_content: str
    request_type: str
    content_language: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    history: list[HistoryEntry]


# --- New Models for Phase 3 ---

class CodeRefactorRequest(BaseModel):
    """Model for submitting code to be refactored or debugged."""
    code_text: str = Field(..., example="def add(x,y): return x+y")
    language: str = Field("python", example="python")
    user_id: Optional[int] = None


class RefactorResponse(BaseModel):
    """Model for the AI's refactored or debugged output."""
    refactored_code: str
    explanation: str
    request_type: str = Field("code_refactor", description="Type of AI task performed")


# --- New Models for Phase 4 ---

class ProjectUploadResponse(BaseModel):
    user_id: int
    project_name: str
    qdrant_collection: str
    files_indexed: int
    chunks_indexed: int
    
class AnalyzeProjectRequest(BaseModel):
    user_id: int
    # Use either collection_name directly or (optionally) a project_name that you resolve to a collection
    collection_name: str = Field(..., description="Qdrant collection for this project")
    focus: Optional[str] = Field(None, description="Optional focus area: architecture|dependencies|entrypoints|risks")


class AnalyzeProjectResponse(BaseModel):
    collection_name: str
    focus: Optional[str]
    summary_markdown: str


class ReviewCodeRequest(BaseModel):
    user_id: int
    collection_name: str
    code: str
    language: Optional[str] = "python"
    ruleset: Optional[str] = Field(
    default="default",
    description="'default' (balanced), 'security' (OWASP/semgrep‑style), or 'style' (PEP8/ESLint tips)"
    )


class ReviewCodeResponse(BaseModel):
    collection_name: str
    language: str
    ruleset: str
    review_markdown: str