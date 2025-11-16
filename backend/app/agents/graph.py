# app/agents/graph.py
from typing import Tuple, List

from ..models import AgentRunRequest, AgentStep
from .tools import retriever_tool, refactor_tool, deployment_tool, reasoning_tool


def run_multi_agent_flow(req: AgentRunRequest) -> Tuple[str, List[AgentStep]]:
    """
    High-level multi-agent orchestration.
    - task_type = 'analyze_architecture' | 'refactor_code' | 'generate_deployment' | 'repo_overview'
    Returns: (final_answer_markdown, steps)
    """

    steps: List[AgentStep] = []

    if req.task_type == "analyze_architecture":
        # 1) Retriever Agent gathers architecture context from codebase/repo
        ctx, tc1 = retriever_tool(req.collection_name, req.user_query or "overall architecture")
        steps.append(
            AgentStep(
                step_name="Retrieve architecture context",
                agent="RetrieverAgent",
                summary="Collected high-level architecture summary from project collection.",
                tool_calls=[tc1],
            )
        )

        # 2) Analyzer Agent refines explanation for the user
        system_inst = """
You are an Architecture Analyzer Agent. You receive raw project summaries and
must produce a clear, structured explanation of the system architecture.
Explain key components, data flow, and important patterns.
        """
        analysis, tc2 = reasoning_tool(system_inst, ctx)
        steps.append(
            AgentStep(
                step_name="Analyze architecture",
                agent="AnalyzerAgent",
                summary="Produced a refined architecture explanation for the user.",
                tool_calls=[tc2],
            )
        )
        return analysis, steps

    elif req.task_type == "refactor_code":
        # 1) Retriever Agent (optional): gather context on project
        if req.collection_name:
            ctx, tc1 = retriever_tool(req.collection_name, "key modules and patterns")
            steps.append(
                AgentStep(
                    step_name="Retrieve project context",
                    agent="RetrieverAgent",
                    summary="Retrieved project context before refactoring.",
                    tool_calls=[tc1],
                )
            )

        # 2) Refactor Agent: review/refactor the snippet
        code_snippet = req.code_snippet or (req.user_query or "")
        review, tc2 = refactor_tool(
            req.collection_name or "",
            code_snippet,
            req.language or "python",
        )
        steps.append(
            AgentStep(
                step_name="Refactor & review code",
                agent="RefactorAgent",
                summary="Provided detailed code review and refactoring suggestions.",
                tool_calls=[tc2],
            )
        )
        return review, steps

    elif req.task_type == "generate_deployment":
        # DevOps Agent: generate deployment artifacts
        deployment_md, tc1 = deployment_tool(req.collection_name, req.user_query)
        steps.append(
            AgentStep(
                step_name="Generate deployment artifacts",
                agent="DevOpsAgent",
                summary="Generated Dockerfile/K8s/CloudRun/CI templates for the project.",
                tool_calls=[tc1],
            )
        )
        return deployment_md, steps

    else:  # 'repo_overview' or fallback
        # 1) Retriever Agent: get overview
        ctx, tc1 = retriever_tool(req.collection_name, req.user_query or "overview")
        steps.append(
            AgentStep(
                step_name="Retrieve repository overview",
                agent="RetrieverAgent",
                summary="Fetched high-level overview from the codebase.",
                tool_calls=[tc1],
            )
        )

        # 2) Analyzer Agent: summarize repo for human
        system_inst = """
You are a Repository Overview Agent. Summarize the main modules, responsibilities,
and how a new developer should get started with this codebase.
        """
        overview, tc2 = reasoning_tool(system_inst, ctx)
        steps.append(
            AgentStep(
                step_name="Summarize repository",
                agent="AnalyzerAgent",
                summary="Summarized repository structure and recommended starting points.",
                tool_calls=[tc2],
            )
        )
        return overview, steps
