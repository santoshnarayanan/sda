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
    DevOps Agent tool: generates deployment artifacts (Dockerfile, K8s, Cloud Run, CI/CD).
    Enhanced Option 3 behavior:
      - If single runtime → generate configs directly.
      - If multiple runtimes and the user explicitly says "both", "all", "entire project", etc.
        → generate deployment for ALL clearly-detected runtimes/services.
      - If multiple runtimes and the user does NOT explicitly indicate "both/all"
        → ask for clarification and STOP (no configs yet).
    """
    started = datetime.utcnow()

    base_instruction = """
You are a DevOps / Deployment Agent for the Smart Developer Assistant (SDA) project.

You receive:
- A high-level user request about deployment.
- Implicit knowledge that the codebase is represented by a Qdrant collection.
- (Enhanced Option 3 behavior) You must reason about whether the repository likely contains
  multiple runtimes or services.

Your responsibilities:

1. First, REASON about runtimes / services:
   - Based on the user request AND any available context (if referenced),
     infer what runtimes might be present (e.g., Python API, Node.js frontend, Java service).
   - If it is CLEAR that there is only ONE runtime / one service, proceed to step 2.

   - If it is LIKELY that there are MULTIPLE runtimes / services (for example, a backend and a frontend),
     then:

       a) If the user explicitly indicates that they want deployment for **all** of them
          (e.g. phrases like "for both", "for all services", "for the entire project", "for backend and frontend"),
          then TREAT THIS AS PERMISSION to generate deployment configurations for **all clearly-detected runtimes**.
          In that case, proceed to step 2 and generate configs for each service, clearly labeling each one.

       b) If the user does NOT clearly indicate "both/all/entire project" and the situation is ambiguous,
          DO NOT immediately generate full deployment configs.
          Instead:
            - Explain what you detected (e.g., "I see signs of both Python and Node.js").
            - Ask the user a short clarification question, such as:
              "Which part should I generate deployment for: the Python backend, the React frontend, or both?"
            - Then STOP. Do NOT output any Dockerfile or YAML in that case.

2. If a single runtime/service is clearly the target (or the user has previously clarified,
   or the user explicitly asked for "both/all"), generate a full deployment suite for the
   relevant runtime(s):
   - Dockerfile (one per service if multiple services)
   - docker-compose.yaml (with multiple services if needed)
   - Kubernetes manifests (Deployment + Service, optional Ingress) for each service
   - Cloud Run YAML (sensible defaults)
   - GitHub Actions CI/CD workflow file

   When multiple services are involved, make it very clear which file belongs to which service
   (e.g. "Dockerfile.backend", "Dockerfile.frontend", "k8s-backend-deployment.yaml", etc.).

3. Always respond in **markdown**.
   - Use clear section headings: "## Dockerfile", "## Kubernetes", "## Cloud Run", "## CI/CD", etc.
   - For each file, use a fenced code block and include the filename as a comment at the top, for example:
       ```Dockerfile
       # filename: Dockerfile.backend
       FROM python:3.11-slim
       ...
       ```
       ```yaml
       # filename: k8s-frontend-deployment.yaml
       apiVersion: apps/v1
       kind: Deployment
       ...
       ```

4. Validation summary:
   - At the end of your answer, add a short "Validation & Notes" section.
   - List any assumptions you made (e.g., port numbers, image names, env vars).
   - Mention any TODOs the user must fill in (like real domain names, secrets, etc.).
    """.strip()

    # Build the prompt with the user request
    prompt = base_instruction + "\n\nUser deployment request:\n"
    if user_query:
        prompt += user_query
    else:
        prompt += (
            "Generate a full deployment configuration for this repository, including "
            "Dockerfile, Kubernetes manifests, Cloud Run YAML, and a GitHub Actions CI pipeline."
        )

    if collection_name:
        prompt += f"\n\nThe repository is represented by Qdrant collection: `{collection_name}`.\n"

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
