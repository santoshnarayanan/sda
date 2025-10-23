# 📘 Technical Design — Smart Developer Assistant (SDA)

## 1. Introduction

This document details the **architectural decisions** and **implementation specifics** for the Smart Developer Assistant (SDA) project, currently stable after completing **Phase 2 (Intelligence Integration)**.

**Goal:** Establish a full-stack RAG system demonstrating efficient data retrieval and context-aware LLM prompting.

---

## 2. Architectural Overview

The SDA uses a **Microservice-Oriented Architecture**, separating the API layer (FastAPI) from the persistence layers (PostgreSQL and Qdrant).

### 2.1 Data Flow (RAG Pipeline)

The `/api/v1/generate` endpoint follows this workflow:

1. **Request:** React frontend sends `prompt_text` to FastAPI.  
2. **Retrieval:** `ai_service.py` queries Qdrant via LangChain Retriever.  
3. **Context Injection:** Retrieved document chunks and `SYSTEM_PROMPT` are combined into a final payload.  
4. **Generation:** The OpenAI LLM generates a context-aware response.  
5. **Audit:** The response is logged into PostgreSQL.  
6. **Response:** JSON output is returned to the frontend UI.

### 2.2 Persistence Layer Strategy

| Database | Role | Data | Justification |
|-----------|------|------|---------------|
| **PostgreSQL** | Structured / Audit | User details, request history | Provides ACID compliance and auditing |
| **Qdrant** | Vector Store | Document embeddings, metadata | Enables low-latency semantic retrieval for RAG |

---

## 3. Backend Implementation Details

### 3.1 FastAPI & Data Modeling (`main.py`, `models.py`)

- **API Contracts:** Defined using Pydantic models (`CodeGenerationRequest`, `GenerationResponse`).  
- **Endpoints:**  
  - `POST /api/v1/generate` — Handles generation and logs output to DB.  
  - `GET /api/v1/history` — Fetches historical data using `RealDictCursor`.  
- **CORS:** Configured for frontend at `http://localhost:5173`.

### 3.2 LangChain RAG Core (`ai_service.py`)

Key implementation details:

- **Environment Loading:** `.env` variables loaded early via `load_dotenv()` for `OPENAI_API_KEY`, `QDRANT_URL`.  
- **Embedding Model:** `SentenceTransformerEmbeddings` (`all-MiniLM-L6-v2`, 384 dims).  
- **Qdrant Mapping (Fix):** Uses `content_payload_key="text"` to ensure retriever references correct payload.  
- **LLM Invocation:** Uses LangChain Expression Language (LCEL) to invoke the chain:  

```python
ai_message = chain.invoke({"input": prompt})
```

---

## 4. Frontend Design & State Management

- **Frameworks:** React + TypeScript  
- **State Management:** Redux Toolkit manages input prompt, output, and history state.  
- **Data Grid:** `HistoryTable.tsx` uses **MUI DataGrid** for high-performance history view.  
- **API Communication:** Axios connects to backend, mapping responses to TypeScript interfaces.

---

## 5. Next Steps (Roadmap)

- **v1.0.0 Release:** Tag Phase 2 as stable.  
- **Phase 3:** Add user authentication & code refactoring endpoint.  
- **Phase 4:** Implement file upload + codebase indexing in Qdrant for deep project analysis.
