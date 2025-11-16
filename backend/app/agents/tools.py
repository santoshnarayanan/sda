# app/agents/tools.py
from typing import Tuple, Optional

from ..ai_service import (
    generate_content_with_llm,
    analyze_project_structure,
    review_code_snippet,
)
from ..models import AgentToolCall
from datetime import datetime


def retriever_tool(collection_name: str, focus: Optional[str]) -> Tuple[str, AgentToolCall]:
    """
    Uses analyze_project_structure to get a high-level view of the repo/project.
    Think of this as the Retriever Agent gathering context.
    """
    started = datetime.utcnow()
    summary = analyze_project_structure(collection_name, focus or "overall architecture")
    finished = datetime.utcnow()

    tool_call = AgentToolCall(
        tool_name="retriever_tool",
        input={"collection_name": collection_name, "focus": focus},
        output=summary,
        status="completed",
        started_at=started,
        finished_at=finished,
    )
    return summary, tool_call


def refactor_tool(collection_name: str, code: str, language: str) -> Tuple[str, AgentToolCall]:
    """
    Uses your existing review_code_snippet as the basis for the Refactor Agent.
    """
    started = datetime.utcnow()
    review_markdown = review_code_snippet(
        collection_name=collection_name,
        code=code,
        language=language or "python",
        ruleset="default",
    )
    finished = datetime.utcnow()

    tool_call = AgentToolCall(
        tool_name="refactor_tool",
        input={"collection_name": collection_name, "language": language},
        output=review_markdown,
        status="completed",
        started_at=started,
        finished_at=finished,
    )
    return review_markdown, tool_call


def deployment_tool(collection_name: Optional[str], user_query: Optional[str]) -> Tuple[str, AgentToolCall]:
    """
    DevOps Agent tool: generates deployment artifacts (Dockerfile, K8s, Cloud Run, CI).
    Implemented via generate_content_with_llm with a structured prompt.
    """
    started = datetime.utcnow()
    base_instruction = """
You are a DevOps assistant for the Smart Developer Assistant (SDA) project.

Given the following high-level request, generate deployment-ready artifacts:
- Dockerfile(s)
- docker-compose (if relevant)
- Kubernetes manifests (Deployment + Service + optional Ingress)
- Cloud Run YAML (if target is GCP)
- GitHub Actions CI/CD YAML (if mentioned)

Respond in markdown. Use fenced code blocks with filenames in comments.
    """.strip()

    prompt = base_instruction + "\n\nUser request:\n" + (user_query or "Generate generic deployment setup for this repository.")
    if collection_name:
        prompt += f"\n\nContext: This repository is stored in Qdrant collection `{collection_name}`."

    resp = generate_content_with_llm(prompt=prompt, language="markdown")
    finished = datetime.utcnow()

    tool_call = AgentToolCall(
        tool_name="deployment_tool",
        input={"collection_name": collection_name, "user_query": user_query},
        output=resp.generated_content,
        status="completed",
        started_at=started,
        finished_at=finished,
    )
    return resp.generated_content, tool_call


def reasoning_tool(system_instruction: str, user_query: str) -> Tuple[str, AgentToolCall]:
    """
    Generic LLM reasoning step used by Analyzer Agent and Coordinator.
    """
    started = datetime.utcnow()
    prompt = system_instruction.strip() + "\n\nUser query or context:\n" + user_query
    resp = generate_content_with_llm(prompt=prompt, language="markdown")
    finished = datetime.utcnow()

    tool_call = AgentToolCall(
        tool_name="reasoning_tool",
        input={"system_instruction": system_instruction, "user_query": user_query},
        output=resp.generated_content,
        status="completed",
        started_at=started,
        finished_at=finished,
    )
    return resp.generated_content, tool_call
