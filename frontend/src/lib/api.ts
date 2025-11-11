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

export default api;