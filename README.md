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
├── LICENSE.md
├── NOTICE.md
├── TECHNICAL_DESIGN.md
├── backend/
│   ├── app/
│   │   ├── ai_service.py
│   │   ├── main.py
│   │   └── models.py
│   ├── docs/
│   └── ingest.py
└── frontend/
    ├── src/
    └── package.json
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

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE.md).

---

## 🙏 Acknowledgements

This project uses the following open-source libraries and frameworks:

- [LangChain](https://github.com/langchain-ai/langchain) — MIT License  
- [Qdrant](https://github.com/qdrant/qdrant) — Apache 2.0 License  
- [React](https://github.com/facebook/react) — MIT License  
- [Node.js](https://github.com/nodejs/node) — MIT License  
- [FastAPI](https://github.com/tiangolo/fastapi) — MIT License  
- [PostgreSQL](https://www.postgresql.org/) — PostgreSQL License  
- [Sentence Transformers](https://github.com/UKPLab/sentence-transformers) — Apache 2.0 License  

We gratefully acknowledge the work of these communities.

> ℹ️ **Note on licenses:**  
> - MIT (used by LangChain, React, Node.js, FastAPI) is permissive — you can reuse the code freely as long as you credit the author.  
> - Apache 2.0 (used by Qdrant, Sentence Transformers) provides similar freedoms with added patent protection.  
> - PostgreSQL License allows unrestricted use and modification for both open and closed source projects.

---

## 📌 Notice

Please see the [NOTICE.md](./NOTICE.md) file for attribution and detailed acknowledgements.

**Copyright © 2025 Santosh Narayanan**