# app/agents/manager.py
from .graph import run_multi_agent_flow
from ..models import AgentRunRequest, AgentRunResponse


def run_agent_task(req: AgentRunRequest) -> AgentRunResponse:
    """
    Entry point used by FastAPI endpoint. Orchestrates the multi-agent graph.
    """
    final_answer, steps = run_multi_agent_flow(req)
    return AgentRunResponse(
        task_type=req.task_type,
        collection_name=req.collection_name,
        final_answer_markdown=final_answer,
        steps=steps,
    )
