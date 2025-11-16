import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "";

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

/** Mode type */
export type Mode = "generate" | "refactor";

/** Slice state */
interface GenerationState {
  prompt: string;                     // text area content (request or code)
  output: string;                     // server response (markdown/code)
  mode: "generate" | "refactor";      // which action we’re performing
  language: string;                   // language hint sent to backend
  loading: boolean;
  error?: string;
}

const initialState: GenerationState = {
  prompt: "",
  output: "",
  mode: "generate",
  language: "python",
  loading: false,
};

/** Phase 1/2: generate endpoint */
export const generateCode = createAsyncThunk(
  "generation/generateCode",
  async (payload: { prompt: string; language: string }) => {
    const res = await axios.post("/api/v1/generate", {
      prompt_text: payload.prompt,
      content_language: payload.language,
    });
    return res.data.generated_content as string;
  }
);

/** Phase 3: refactor endpoint */
export const refactorCode = createAsyncThunk(
  "generation/refactorCode",
  async (payload: { code: string; language: string }) => {
    const res = await axios.post("/api/v1/refactor", {
      code_text: payload.code,
      language: payload.language,
    });
    return res.data.generated_content as string;
  }
);

const generationSlice = createSlice({
  name: "generation",
  initialState,
  reducers: {
    setPrompt: (state, action: PayloadAction<string>) => {
      state.prompt = action.payload;
    },
    setMode: (state, action: PayloadAction<"generate" | "refactor">) => {
      state.mode = action.payload;
      state.output = ""; // clear output when switching modes
      state.error = undefined;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    clearOutput: (state) => {
      state.output = "";
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // /generate
      .addCase(generateCode.pending, (s) => {
        s.loading = true;
        s.error = undefined;
      })
      .addCase(generateCode.fulfilled, (s, a) => {
        s.loading = false;
        s.output = a.payload;
      })
      .addCase(generateCode.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error.message || "Generation failed";
      })

      // /refactor
      .addCase(refactorCode.pending, (s) => {
        s.loading = true;
        s.error = undefined;
      })
      .addCase(refactorCode.fulfilled, (s, a) => {
        s.loading = false;
        s.output = a.payload;
      })
      .addCase(refactorCode.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error.message || "Refactor failed";
      });
  },
});

export const { setPrompt, setMode, setLanguage, clearOutput } = generationSlice.actions;
export default generationSlice.reducer;
