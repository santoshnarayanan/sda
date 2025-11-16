import axios from "axios";


const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


const api = axios.create({
    baseURL: BASE_URL,
});


export type UploadResponse = {
    user_id: number;
    project_name: string;
    qdrant_collection: string;
    files_indexed: number;
    chunks_indexed: number;
};


export async function uploadProject(params: {
    userId: number;
    projectName: string;
    file: File;
}): Promise<UploadResponse> {
    const form = new FormData();
    form.append("user_id", String(params.userId));
    form.append("project_name", params.projectName);
    form.append("file", params.file);


    const { data } = await api.post<UploadResponse>("/api/v1/upload_project", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}


export async function analyzeProject(params: {
    collectionName: string;
    focus?: string | null;
}): Promise<{ collection_name: string; focus?: string; summary_markdown: string }> {
    const { data } = await api.post("/api/v1/analyze_project", {
        user_id: 1,
        collection_name: params.collectionName,
        focus: params.focus ?? null,
    });
    return data;
}


export async function reviewCode(params: {
    collectionName: string;
    code: string;
    language?: string;
    ruleset?: "default" | "security" | "style";
}): Promise<{ collection_name: string; language: string; ruleset: string; review_markdown: string }> {
    const { data } = await api.post("/api/v1/review_code", {
        user_id: 1,
        collection_name: params.collectionName,
        code: params.code,
        language: params.language ?? "python",
        ruleset: params.ruleset ?? "default",
    });
    return data;
}

export type GithubLoginUrlResponse = {
    login_url: string;
    state: string;
};

export type GithubAuthCompleteResponse = {
    user_id: number;
    github_login: string;
    github_id: number;
    scope?: string | null;
};

export type GithubRepo = {
    id: number;
    full_name: string;
    private: boolean;
    description?: string | null;
    default_branch?: string | null;
};

export type ImportRepoResponse = {
    user_id: number;
    repo_full_name: string;
    branch: string | null;
    qdrant_collection: string;
    files_indexed: number;
    chunks_indexed: number;
};

export async function getGithubLoginUrl(): Promise<GithubLoginUrlResponse> {
    const { data } = await api.get<GithubLoginUrlResponse>("/api/v1/auth/github/login_url");
    return data;
}

export async function completeGithubAuth(
    code: string,
    state?: string | null,
    userId: number = 1
): Promise<GithubAuthCompleteResponse> {
    const { data } = await api.post<GithubAuthCompleteResponse>("/api/v1/auth/github/complete", {
        code,
        state: state ?? null,
        user_id: userId,
    });
    return data;
}

export async function getGithubRepos(userId: number = 1): Promise<GithubRepo[]> {
    const { data } = await api.get<{ repos: GithubRepo[] }>("/api/v1/github/repos", {
        params: { user_id: userId },
    });
    return data.repos;
}

export async function importGithubRepo(
    params: { userId: number; repoFullName: string; branch?: string | null }
): Promise<ImportRepoResponse> {
    const { data } = await api.post<ImportRepoResponse>("/api/v1/import_repo", {
        user_id: params.userId,
        repo_full_name: params.repoFullName,
        branch: params.branch ?? null,
    });
    return data;
}

// ---------------- Phase 6 Part 2 – Agentic AI ----------------

export type AgentToolCall = {
  tool_name: string;
  input: Record<string, unknown>;
  output?: string;
  status: string;
  started_at?: string;
  finished_at?: string;
};

export type AgentStep = {
  step_name: string;
  agent: string;
  summary: string;
  tool_calls: AgentToolCall[];
};

export type AgentRunResponse = {
  task_type: string;
  collection_name?: string | null;
  final_answer_markdown: string;
  steps: AgentStep[];
};

export async function runAgentTask(params: {
  taskType: "analyze_architecture" | "refactor_code" | "generate_deployment" | "repo_overview";
  collectionName?: string | null;
  userQuery?: string | null;
  codeSnippet?: string | null;
  language?: string;
}): Promise<AgentRunResponse> {
  const payload = {
    task_type: params.taskType,
    collection_name: params.collectionName ?? null,
    user_query: params.userQuery ?? null,
    code_snippet: params.codeSnippet ?? null,
    language: params.language ?? "python",
  };

  const { data } = await api.post<AgentRunResponse>("/api/v1/agent_run", payload);
  return data;
}



export default api;