# 🧠 Smart Developer Assistant (SDA)

The **Smart Developer Assistant (SDA)** is a modern, full-stack web application designed to accelerate the development workflow by providing intelligent, context-aware code generation and technical answers.

It demonstrates a robust, decoupled architecture leveraging the power of **Retrieval-Augmented Generation (RAG)** to guide its responses based on custom documentation.

---

## ✨ Features (Phase 2 Complete)

- **Intelligent RAG** — Answers domain-specific questions using a secure, custom knowledge base indexed in Qdrant.  
- **Code Generation** — Generates unique code snippets and solutions using a live OpenAI LLM.  
- **Full-Stack Auditability** — All interactions are logged to a PostgreSQL database for history and auditing.  
- **Modern UI** — Built with React and styled using Tailwind CSS. Data history is displayed using the free MUI DataGrid.

---

## 💻 Technology Stack

| Component | Technology | Role |
|------------|-------------|------|
| **Frontend (UI)** | React.js + Redux + TypeScript | Component-based structure and global state management |
| **Styling** | Tailwind CSS + PostCSS | Utility-first, professional styling |
| **Backend (API)** | Python + FastAPI | High-performance, asynchronous REST API |
| **Orchestration** | LangChain | Manages the RAG pipeline, prompting, and LLM interactions |
| **Vector DB** | Qdrant | Stores vector embeddings of technical documentation |
| **Relational DB** | PostgreSQL | Stores structured data (user history, accounts) |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** and **Node.js/npm**  
- **PostgreSQL instance** running locally  
- **Qdrant instance** (Cloud or Docker)  
- **OpenAI API Key** set in `.env`

---

### 🗂️ Project Structure

```bash
sda/
├── .gitignore
├── README.md
├── TECHNICAL_DESIGN.md
├── backend/
│   ├── app/
│   │   ├── ai_service.py    # LangChain/RAG core logic
│   │   ├── main.py          # FastAPI app, DB connection, CORS
│   │   └── models.py        # Pydantic schemas
│   ├── docs/                # Custom documentation files for RAG
│   └── ingest.py            # Script to run RAG data ingestion
└── frontend/
    ├── src/                 # React source files
    └── package.json         # Node dependencies
```

---

## ⚙️ Setup and Run

### 🧩 Backend Setup

Navigate to the `backend/` directory.

#### 1. Install Python dependencies

```bash
uv pip install -r requirements.txt
uv pip install langchain-core qdrant-client sentence-transformers
```

#### 2. Configure Secrets

Create a `.env` file in `backend/` and populate it with:

```env
DB_PASSWORD=your_password
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=your_openai_api_key
```

#### 3. Initialize Database

Create the PostgreSQL database and manually run the Phase 1 SQL schemas.

#### 4. Populate Qdrant (RAG Data)

```bash
python ingest.py
```

#### 5. Run the Backend Server

```bash
uvicorn app.main:app --reload
```

---

### 💻 Frontend Setup

Navigate to the `frontend/` directory.

#### 1. Install Node dependencies

```bash
npm install
```

#### 2. Run the Frontend Server

```bash
npm run dev
```

Access the app at: [http://localhost:5173](http://localhost:5173)
