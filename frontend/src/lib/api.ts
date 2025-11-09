// Phase 2 – unified API client for SDA frontend
// -------------------------------------------------

import axios from "axios";

// baseURL comes from your Vite env
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
    headers: {
        "Content-Type": "application/json",
    },
});

// ---- Types ----
export interface GenerationPayload {
    prompt_text: string;
    user_id?: number | null;
    content_language?: string;
}

export interface DocQAPayload {
    prompt_text: string;
    user_id?: number | null;
    top_k?: number;
    rerank?: boolean;
    filters?: Record<string, unknown> | null;
    content_language?: string;
}

export interface SourceChunk {
    source: string;
    chunk_id: number;
    score?: number | null;
    snippet?: string | null;
}

export interface GenerationResponse {
    generated_content: string;
    content_language: string;
    request_type: string;
    sources?: SourceChunk[] | null;
}

// ---- API functions ----
export async function generateCode(payload: GenerationPayload) {
    const { data } = await api.post<GenerationResponse>("/api/v1/generate", payload);
    return data;
}

export async function answerFromDocs(payload: DocQAPayload) {
    const { data } = await api.post<GenerationResponse>("/api/v1/answer_from_docs", payload);
    return data;
}
