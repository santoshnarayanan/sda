import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GenerationState {
    prompt: string;
    generatedCode: string;
    isLoading: boolean;
    error: string | null;
    language: string;
}

const initialState: GenerationState = {
    prompt: 'Write a simple login component in React with Tailwind CSS.',
    generatedCode: '',
    isLoading: false,
    error: null,
    language: 'javascript/react',
};

const generationSlice = createSlice({
    name: 'generation',
    initialState,
    reducers: {
        setPrompt: (state, action: PayloadAction<string>) => {
            state.prompt = action.payload;
            state.error = null;
        },
        setLanguage: (state, action: PayloadAction<string>) => {
            state.language = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setGeneratedCode: (state, action: PayloadAction<string>) => {
            state.generatedCode = action.payload;
            state.isLoading = false;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
    },
});

export const { setPrompt, setLanguage, setLoading, setGeneratedCode, setError } = generationSlice.actions;

export default generationSlice.reducer;