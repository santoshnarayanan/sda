// frontend/src/redux/generationSlice.ts
// Phase 2 — unified state for Code Generation + Docs Q&A (RAG)

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { generateCode, answerFromDocs, type GenerationResponse } from "../lib/api";
import type { RootState } from "./store";

// -------------------------
// Types
// -------------------------
export type Mode = "code" | "docs";

export interface GenerationState {
  mode: Mode;
  prompt: string;
  language: string;
  loading: boolean;
  error: string | null;
  output: string;
  sources: GenerationResponse["sources"];
  top_k: number;
  rerank: boolean;
  filters: Record<string, unknown> | null;
}

// -------------------------
// Initial State
// -------------------------
const initialState: GenerationState = {
  mode: "code",
  prompt: "",
  language: "markdown",
  loading: false,
  error: null,
  output: "",
  sources: null,
  top_k: 6,
  rerank: true,
  filters: null,
};

// -------------------------
// Async Thunks
// -------------------------
export const runCodeGen = createAsyncThunk(
  "generation/runCodeGen",
  async (payload: { prompt: string; language?: string }, { rejectWithValue }) => {
    try {
      const res = await generateCode({
        prompt_text: payload.prompt,
        content_language: payload.language ?? "markdown",
      });
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || "Request failed");
    }
  }
);

export const runDocsQA = createAsyncThunk(
  "generation/runDocsQA",
  async (
    payload: { prompt: string; top_k?: number; rerank?: boolean; filters?: Record<string, unknown> | null },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const res = await answerFromDocs({
        prompt_text: payload.prompt,
        top_k: payload.top_k ?? state.generation.top_k,
        rerank: payload.rerank ?? state.generation.rerank,
        filters: payload.filters ?? state.generation.filters,
        content_language: state.generation.language,
      });
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || "Request failed");
    }
  }
);

// -------------------------
// Slice
// -------------------------
const generationSlice = createSlice({
  name: "generation",
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<Mode>) {
      state.mode = action.payload;
      state.output = "";
      state.sources = null;
      state.error = null;
    },
    setPrompt(state, action: PayloadAction<string>) {
      state.prompt = action.payload;
    },
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    setTopK(state, action: PayloadAction<number>) {
      state.top_k = action.payload;
    },
    setRerank(state, action: PayloadAction<boolean>) {
      state.rerank = action.payload;
    },
    setFilters(state, action: PayloadAction<Record<string, unknown> | null>) {
      state.filters = action.payload;
    },
    clearOutput(state) {
      state.output = "";
      state.sources = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- Code generation ----
      .addCase(runCodeGen.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runCodeGen.fulfilled, (state, action: PayloadAction<GenerationResponse>) => {
        state.loading = false;
        state.output = action.payload.generated_content;
        state.sources = action.payload.sources ?? null;
        state.language = action.payload.content_language || state.language;
      })
      .addCase(runCodeGen.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || "Request failed";
      })

      // ---- Docs Q&A ----
      .addCase(runDocsQA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runDocsQA.fulfilled, (state, action: PayloadAction<GenerationResponse>) => {
        state.loading = false;
        state.output = action.payload.generated_content;
        state.sources = action.payload.sources ?? null;
        state.language = action.payload.content_language || state.language;
      })
      .addCase(runDocsQA.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || "Request failed";
      });
  },
});

// -------------------------
// Exports
// -------------------------
export const {
  setMode,
  setPrompt,
  setLanguage,
  setTopK,
  setRerank,
  setFilters,
  clearOutput,
} = generationSlice.actions;

export default generationSlice.reducer;
