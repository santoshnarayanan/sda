# 📘 Technical Design — Smart Developer Assistant (SDA) — Phase 3

Phase 3 introduces two major functional enhancements on top of the Phase 2 RAG architecture:

1. **Code Refactor Feature** – AI-powered code review, optimization, and docstring generation.  
2. **History Module** – Persistent request logging and retrieval through a MUI DataGrid interface.

---

## 1. System Architecture Overview
![System Architecture](images/Architecture_Phase3.png)

**Highlights**
- React + Redux frontend communicates with FastAPI endpoints:
  - `/api/v1/generate`
  - `/api/v1/refactor`
  - `/api/v1/answer_from_docs`
  - `/api/v1/history`
- LangChain orchestrates model reasoning and RAG context retrieval.
- Qdrant stores document embeddings for semantic search.
- PostgreSQL holds user and request history data.

---

## 2. Backend Module Flow
![Backend Flow](images/Backend_Phase3.png)

**Components**
- **`main.py`** — Defines FastAPI routes and handles request/response lifecycles.  
- **`ai_service.py`** — Contains:
  - `generate_content_with_llm()`
  - `refactor_code_with_llm()`
  - `answer_from_docs()`  
- **`models.py`** — Pydantic request/response models.  
- **`ingest.py`** — Converts docs → chunks → embeddings → Qdrant.  
- **`.env`** — Holds API keys and database credentials.  
- **Data Stores**
  - **Qdrant:** vector collection `sda_dev_documentation`  
  - **PostgreSQL:** tables `users`, `request_history`

---

## 3. Frontend–API Integration
![Frontend API Flow](images/Frontend-API_Phase3.png)

**Key React Modules**
- **`generationSlice.ts`** — Manages state (`prompt`, `output`, `mode`, `language`) and thunks  
  `generateCode()` and `refactorCode()`.
- **`GenerationArea.tsx`** — Input box + mode toggle (Generate / Refactor).  
- **`OutputDisplay.tsx`** — Renders output or explanation markdown.  
- **`HistoryTable.tsx`** — Displays request history; row click → reload prompt/output.

---

## 4. Database Entity Model (ER)
![Database ER](images/ER_Phase3.png)

**Active Tables**
| Table | Description |
|--------|--------------|
| **users** | Stores user accounts and credentials. |
| **request_history** | Logs every Generate / Refactor request with timestamps and metadata. |

**Future Extensions (Phase 4+)**
- `user_settings` – personalization and default model preferences.  
- `user_snippets` – reusable code blocks.

---

## 5. Runtime Sequence Flow
![Sequence Flow](images/Sequence_Phase3.png)

**Generate Flow**
1. User → Frontend: prompt input.  
2. Frontend → FastAPI (`/generate`).  
3. FastAPI → LangChain → Qdrant → LLM.  
4. LLM response logged to PostgreSQL `request_history`.  
5. Result → Frontend → Display.

**Refactor Flow**
1. User → Frontend: paste code + click Refactor.  
2. Backend runs `refactor_code_with_llm()`.  
3. Output (docstring + explanation) logged to DB and displayed.

**History Flow**
1. User opens History tab.  
2. Frontend GET `/api/v1/history`.  
3. Backend SELECT from `request_history`.  
4. Data Grid renders rows (click to reload).

---

## 6. Phase 3 Summary
![Phase 3 Summary](images/Phase3diagram.png)

**End-to-End Flow**
- **Frontend:** React + Redux UI ↔ FastAPI API.  
- **Backend:** LangChain LLM processing and RAG context retrieval.  
- **Data Layer:** Qdrant for semantic search + PostgreSQL for structured history.  
- **New Capabilities:** Refactor endpoint + interactive History DataGrid.

---

### Environment Configuration Notes
**Frontend `.env`**
