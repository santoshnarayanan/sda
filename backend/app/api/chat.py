# app/api/chat.py  — LangChain 1.x + Qdrant Cloud (drop-in)

import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, VectorParams
from langchain_qdrant import QdrantVectorStore

from app.database import get_db
from app.models import ChatHistory

router = APIRouter()


@router.post("/api/chat")
async def chat_with_agent(request: dict, db: Session = Depends(get_db)):
    """
    Body: { "user_id": int, "message": str, "session_id": str }
    Returns: { "response": str }
    """
    user_id = request.get("user_id")
    message = request.get("message")
    session_id = request.get("session_id")

    if not (user_id and message and session_id):
        raise HTTPException(
            status_code=400, detail="user_id, message, and session_id are required")

    # ---- Load env (expect this already done in app.main; safe if repeated) ----
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if not openai_api_key:
        raise HTTPException(
            status_code=500, detail="OPENAI_API_KEY is not set")
    if not qdrant_url or not qdrant_api_key:
        raise HTTPException(
            status_code=500, detail="Qdrant credentials missing")

    # ---- Rebuild chat history from DB (no legacy memory classes) ----
    prior_rows = (
        db.query(ChatHistory)
        .filter_by(user_id=user_id, session_id=session_id)
        .order_by(ChatHistory.timestamp.asc())
        .all()
    )
    chat_history = []
    for row in prior_rows:
        if row.user_message:
            chat_history.append(HumanMessage(content=row.user_message))
        if row.ai_response:
            chat_history.append(AIMessage(content=row.ai_response))

    # ---- Qdrant Cloud + Embeddings ----
    # Use explicit embedding model so we know the vector size.
    # text-embedding-3-small -> 1536 dimensions.
    embedding_model = "text-embedding-3-small"
    embeddings = OpenAIEmbeddings(model=embedding_model)

    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)

    collection_name = "project_docs"
    # Ensure collection exists (create if missing)
    try:
        client.get_collection(collection_name)
    except UnexpectedResponse:
        # If you change the embedding model, recompute: dim = len(embeddings.embed_query("probe"))
        dim = 1536
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )

    vectorstore = QdrantVectorStore.from_existing_collection(
        url=qdrant_url,
        api_key=qdrant_api_key,
        collection_name=collection_name,
        embedding=embeddings,
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # ---- LLM + Prompt (Runnable pipeline) ----
    llm = ChatOpenAI(model="gpt-4o-mini")  # adjust if you prefer another model

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an AI assistant for the Smart Developer Assistant project. "
                "Use the provided context to answer the user's question. "
                "If the answer is not in the context, say you don't know.\n\n"
                "Context:\n{context}",
            ),
            MessagesPlaceholder("chat_history"),
            ("human", "{question}"),
        ]
    )

    chain = (
        {
            "context": retriever,                     # receives the question automatically
            "question": RunnablePassthrough(),        # the raw user message
            "chat_history": lambda _: chat_history,   # prior turns from DB
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    # ---- Invoke chain and persist this turn ----
    answer = chain.invoke(message)

    db.add(
        ChatHistory(
            user_id=user_id,
            session_id=session_id,
            user_message=message,
            ai_response=answer,
        )
    )
    db.commit()

    return {"response": answer}
