
import os
from dotenv import load_dotenv

# LangChain Imports for RAG and LLM
from qdrant_client import QdrantClient
from langchain_community.vectorstores import Qdrant
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_openai import ChatOpenAI
# from langchain.chains import ConversationalRetrievalChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage,HumanMessage, AIMessage

from .models import GenerationResponse

load_dotenv()

# --- Configuration (Centralized place for AI components) ---
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333") 
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY") 
COLLECTION_NAME = "sda_dev_documentation"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") 

# --- Initialize Global Components ---

# 1. LLM (Generative AI)
# IMPORTANT: Replace with your actual LLM setup (e.g., Anthropic, Google)
# For this code, we assume an OpenAI-compatible API key is set in .env
try:
    llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=OPENAI_API_KEY, temperature=0.2)
except Exception:
    # Fallback to a mock LLM if configuration is missing (for local testing without a key)
    llm = None 
    print("Warning: OpenAI API key not found. Using mock LLM response.")

# 2. Embedding Model (Must match the one used in ingest.py)
embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

# 3. Qdrant Client and Vector Store (Retrieval Component)
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
# Create a LangChain wrapper around the Qdrant instance
vector_store = Qdrant(client=qdrant_client, collection_name=COLLECTION_NAME, embeddings=embeddings, content_payload_key="text")

# 4. Prompt Template for RAG
SYSTEM_PROMPT = """
You are the Smart Developer Assistant (SDA). Your goal is to provide accurate code, documentation, 
and technical guidance based on the user's request. 

If the user's question relates to a specific API, technical policy, or internal project detail, 
you MUST use the provided CONTEXT. If the question is about general programming, use your 
general knowledge, but strive to answer in the style of the retrieved documents. 

Always format code snippets clearly and concisely using Markdown code blocks.
"""

def generate_content_with_llm(prompt: str, language: str) -> GenerationResponse:
    """
    Replaces the mock with the full LangChain RAG pipeline.
    """
    
    # Fallback to mock if LLM failed to initialize
    if llm is None:
        content = f"LLM Error: Backend is running in mock mode. Request was: {prompt}"
        return GenerationResponse(generated_content=content, content_language="text", request_type="mock")

    # 1. Retrieve Context from Qdrant (RAG Step)
    # The retriever looks for documents relevant to the user's prompt
    retriever = vector_store.as_retriever(search_kwargs={"k": 2})
    docs = retriever.invoke(prompt)
    
    context = "\n".join([doc.page_content for doc in docs])
    
    # 2. Build the Final Prompt
    prompt_template = ChatPromptTemplate.from_messages(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Context from documents: \n---\n{context}\n---\nUser Request: {prompt}"),
        ]
    )
    
    # 3. Invoke the LLM
    try:
        chain = prompt_template | llm
        
        # CRITICAL FIX: Invoke the chain with the prompt as input
        ai_message = chain.invoke({"input": prompt})
        
        generated_content = ai_message.content
        
    except Exception as e:
        generated_content = f"AI Service failed to generate content due to an LLM API error: {e}"
        print(f"LLM Invocation Error: {e}")
        
    
    # 4. Determine Content Language for Frontend Display
    # This is a heuristic, but often works well.
    if "python" in language.lower() or "python" in prompt.lower():
        detected_language = "python"
    elif "react" in language.lower() or "javascript" in language.lower():
        detected_language = "jsx"
    else:
        detected_language = "markdown"

    return GenerationResponse(
        generated_content=generated_content,
        content_language=detected_language,
        request_type="code_gen_rag"
    )