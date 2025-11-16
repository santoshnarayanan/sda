import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { uploadProject, analyzeProject, reviewCode, UploadResponse } from "../lib/api";

export type AnalyzerState = {
    // upload
    uploadStatus: "idle" | "loading" | "succeeded" | "failed";
    uploadError?: string | null;
    collectionName?: string | null;
    filesIndexed?: number;
    chunksIndexed?: number;


    // analyze
    analyzeStatus: "idle" | "loading" | "succeeded" | "failed";
    analyzeError?: string | null;
    summaryMarkdown: string;
    focus: string | null;


    // review
    reviewStatus: "idle" | "loading" | "succeeded" | "failed";
    reviewError?: string | null;
    reviewMarkdown: string;
    language: string;
    ruleset: "default" | "security" | "style";
    code: string;
};

const initialState: AnalyzerState = {
    uploadStatus: "idle",
    analyzeStatus: "idle",
    reviewStatus: "idle",
    summaryMarkdown: "",
    reviewMarkdown: "",
    focus: null,
    language: "python",
    ruleset: "default",
    code: "",
};


export const uploadProjectThunk = createAsyncThunk(
    "analyzer/uploadProject",
    async (args: { userId: number; projectName: string; file: File }) => {
        const res: UploadResponse = await uploadProject(args);
        return res;
    }
);

export const analyzeProjectThunk = createAsyncThunk(
    "analyzer/analyzeProject",
    async (args: { collectionName: string; focus?: string | null }) => {
        const res = await analyzeProject({ collectionName: args.collectionName, focus: args.focus ?? null });
        return res;
    }
);


export const reviewCodeThunk = createAsyncThunk(
    "analyzer/reviewCode",
    async (args: { collectionName: string; code: string; language?: string; ruleset?: "default" | "security" | "style" }) => {
        const res = await reviewCode({
            collectionName: args.collectionName,
            code: args.code,
            language: args.language,
            ruleset: args.ruleset,
        });
        return res;
    }
);

const analyzerSlice = createSlice({
    name: "analyzer",
    initialState,
    reducers: {
        setFocus(state, action: PayloadAction<string | null>) { state.focus = action.payload; },
        setLanguage(state, action: PayloadAction<string>) { state.language = action.payload; },
        setRuleset(state, action: PayloadAction<"default" | "security" | "style">) { state.ruleset = action.payload; },
        setCode(state, action: PayloadAction<string>) { state.code = action.payload; },
        resetAnalyzer(state) {
            Object.assign(state, initialState);
        },
        setImportedProject(
            state,
            action: PayloadAction<{ collectionName: string; filesIndexed: number; chunksIndexed: number }>
        ) {
            state.collectionName = action.payload.collectionName;
            state.filesIndexed = action.payload.filesIndexed;
            state.chunksIndexed = action.payload.chunksIndexed;
            state.uploadStatus = "succeeded";
            state.uploadError = null;
        },
    },
    extraReducers: (builder) => {
        // upload
        builder.addCase(uploadProjectThunk.pending, (state) => {
            state.uploadStatus = "loading"; state.uploadError = null;
        });
        builder.addCase(uploadProjectThunk.fulfilled, (state, { payload }) => {
            state.uploadStatus = "succeeded";
            state.collectionName = payload.qdrant_collection;
            state.filesIndexed = payload.files_indexed;
            state.chunksIndexed = payload.chunks_indexed;
        });
        builder.addCase(uploadProjectThunk.rejected, (state, action) => {
            state.uploadStatus = "failed"; state.uploadError = action.error.message || "Upload failed";
        });


        // analyze
        builder.addCase(analyzeProjectThunk.pending, (state) => {
            state.analyzeStatus = "loading"; state.analyzeError = null;
        });
        builder.addCase(analyzeProjectThunk.fulfilled, (state, { payload }) => {
            state.analyzeStatus = "succeeded";
            state.summaryMarkdown = payload.summary_markdown;
        });
        builder.addCase(analyzeProjectThunk.rejected, (state, action) => {
            state.analyzeStatus = "failed"; state.analyzeError = action.error.message || "Analysis failed";
        });


        // review
        builder.addCase(reviewCodeThunk.pending, (state) => {
            state.reviewStatus = "loading"; state.reviewError = null;
        });
        builder.addCase(reviewCodeThunk.fulfilled, (state, { payload }) => {
            state.reviewStatus = "succeeded";
            state.reviewMarkdown = payload.review_markdown;
        });
        builder.addCase(reviewCodeThunk.rejected, (state, action) => {
            state.reviewStatus = "failed"; state.reviewError = action.error.message || "Review failed";
        });
    },
});

export const { setFocus, setLanguage, setRuleset, setCode, resetAnalyzer, setImportedProject } = analyzerSlice.actions;
export default analyzerSlice.reducer;