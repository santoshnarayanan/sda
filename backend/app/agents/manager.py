# app/agents/manager.py
from .graph import run_multi_agent_flow
from ..models import AgentRunRequest, AgentRunResponse


def run_agent_task(req: AgentRunRequest) -> AgentRunResponse:
    """
    Entry point used by FastAPI endpoint. Orchestrates the multi-agent graph.
    """
    result = run_multi_agent_flow(req)

    # DevOps returns 3 values: final_answer, steps, deployment_files
    if req.task_type == "generate_deployment":
        final_answer, steps, deployment_files = result
        return AgentRunResponse(
            task_type=req.task_type,
            collection_name=req.collection_name,
            final_answer_markdown=final_answer,
            steps=steps,
            deployment_files=deployment_files
        )

    # Other tasks return 2 values
    else:
        final_answer, steps = result
        return AgentRunResponse(
            task_type=req.task_type,
            collection_name=req.collection_name,
            final_answer_markdown=final_answer,
            steps=steps
        )

