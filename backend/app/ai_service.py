import os
from typing import List, Optional, Dict, Any, Tuple

from dotenv import load_dotenv

# LangChain / Retrieval
from qdrant_client import QdrantClient
from langchain_community.vectorstores import Qdrant
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

# Lightweight lexical score & fallback scorer
from rank_bm25 import BM25Okapi
from rapidfuzz.fuzz import partial_ratio

from .models import GenerationResponse, SourceChunk, DocQARequest

load_dotenv()

# --- Config ---
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
COLLECTION_NAME = os.environ.get("QDRANT_COLLECTION", "sda_dev_documentation")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

SYSTEM_PROMPT = """
You are the Smart Developer Assistant (SDA). Provide accurate, concise, and well-formatted answers.
Use the provided CONTEXT faithfully; if the context is insufficient, say what is missing.
When showing code, use fenced Markdown code blocks and minimal commentary.
Prefer direct, actionable answers.
"""

# --- Initialize global components ---
try:
    llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=OPENAI_API_KEY, temperature=0.2)
except Exception:
    llm = None
    print("Warning: OpenAI API key not found. Using mock LLM response.")

embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
vector_store = Qdrant(
    client=qdrant_client,
    collection_name=COLLECTION_NAME,
    embeddings=embeddings,
    content_payload_key="text",
)

def _apply_filters(filters: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Translate simple equality filters into Qdrant search_kwargs."""
    if not filters:
        return None
    # LangChain's Qdrant retriever passes filters via search_kwargs["filter"]
    # Keep equality only for Phase 2 (simple and safe).
    must = []
    for key, val in filters.items():
        must.append({"key": key, "match": {"value": val}})
    return {"filter": {"must": must}}

def _lexical_score(query: str, docs: List[str]) -> List[float]:
    tokens = [q.lower() for q in query.split()]
    corpus = [[w.lower() for w in d.split()] for d in docs]
    if not corpus:
        return []
    bm25 = BM25Okapi(corpus)
    return bm25.get_scores(tokens)

def _fuzzy_boost(query: str, docs: List[str]) -> List[float]:
    return [partial_ratio(query, d) / 100.0 for d in docs]

def _rerank(query: str, docs_payload: List[Tuple[str, Dict[str, Any], float]]) -> List[Tuple[str, Dict[str, Any], float]]:
    """
    docs_payload: list of (text, payload, dense_score).
    Returns same list re-ordered and with an updated combined score.
    """
    texts = [t for t, _, _ in docs_payload]
    dense = [s for _, _, s in docs_payload]

    # lexical signals
    bm25_scores = _lexical_score(query, texts)
    fuzz_scores = _fuzzy_boost(query, texts)

    # normalize & combine (simple weighted sum for Phase 2)
    def z(x: List[float]) -> List[float]:
        if not x: return []
        lo, hi = min(x), max(x)
        if hi - lo < 1e-9:
            return [0.0 for _ in x]
        return [(v - lo) / (hi - lo) for v in x]

    zdense = z(dense)
    zbm25  = z(bm25_scores)
    zfuzz  = z(fuzz_scores)

    combined = [0.55*zd + 0.35*zb + 0.10*zf for zd, zb, zf in zip(zdense, zbm25, zfuzz)]
    ranked = sorted(zip(texts, [p for _, p, _ in docs_payload], combined), key=lambda x: x[2], reverse=True)
    return ranked

def _detect_language(hint: str, prompt: str) -> str:
    if "python" in hint.lower() or "python" in prompt.lower(): return "python"
    if "react" in hint.lower() or "javascript" in hint.lower(): return "jsx"
    return "markdown"

def answer_from_docs(req: DocQARequest) -> GenerationResponse:
    """
    Retrieve→(optional rerank)→LLM with context.
    Returns answer + source snippets for UI.
    """
    # Fallback when LLM not configured
    if llm is None:
        return GenerationResponse(
            generated_content=f"[MOCK MODE]\nYour question: {req.prompt_text}",
            content_language="text",
            request_type="docs_qa",
            sources=None,
        )

    # 1) Dense retrieval from Qdrant
    retriever = vector_store.as_retriever(search_kwargs={"k": req.top_k, **(_apply_filters(req.filters) or {})})
    docs = retriever.invoke(req.prompt_text)

    # Prepare payloads
    dense_payload: List[Tuple[str, Dict[str, Any], float]] = []
    for d in docs:
        # LC Qdrant stores payload in metadata
        payload = dict(d.metadata) if hasattr(d, "metadata") else {}
        # LangChain doesn't give us raw scores directly — we approximate with similarity to the query embedding
        # Compute a cosine similarity proxy via embeddings (lightweight)
        qv = embeddings.embed_query(req.prompt_text)
        dv = embeddings.embed_query(d.page_content)  # cheaper than embed_documents for single use
        # cosine
        import numpy as np
        sim = float(np.dot(qv, dv) / (np.linalg.norm(qv) * np.linalg.norm(dv) + 1e-9))
        dense_payload.append((d.page_content, payload, sim))

    ranked = _rerank(req.prompt_text, dense_payload) if req.rerank else [(t, p, s) for (t, p, s) in dense_payload]

    # Build context & sources (cap to 4 chunks to control prompt size)
    top_ctx = ranked[:4]
    context_blocks = [t for (t, _, _) in top_ctx]
    sources = []
    for (t, p, s) in top_ctx:
        sources.append(
            SourceChunk(
                source=p.get("source", "unknown"),
                chunk_id=int(p.get("chunk_id", -1)),
                score=round(float(s), 4) if s is not None else None,
                snippet=t[:220] + ("..." if len(t) > 220 else ""),
            )
        )

    # 2) Prompt the LLM
    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"CONTEXT:\n---\n" + "\n---\n".join(context_blocks) + "\n---\n\nQUESTION: " + req.prompt_text),
        ]
    )
    try:
        chain = prompt | llm
        ai_message = chain.invoke({"input": req.prompt_text})
        content = ai_message.content
    except Exception as e:
        content = f"AI generation failed: {e}"

    return GenerationResponse(
        generated_content=content,
        content_language=_detect_language(req.content_language, req.prompt_text),
        request_type="docs_qa",
        sources=sources,
    )

# Backward‐compat (Phase 1 endpoint still calls this function)
def generate_content_with_llm(prompt: str, language: str) -> GenerationResponse:
    # Keep the existing behavior for /generate; we don't change it in Phase 2
    # This path used RAG light already; we leave as-is to avoid breaking.
    req = DocQARequest(prompt_text=prompt, top_k=2, rerank=False, filters=None, content_language=language)
    return answer_from_docs(req)
