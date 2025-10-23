import { configureStore } from '@reduxjs/toolkit';
import generationReducer from './generationSlice';

export const store = configureStore({
    reducer: {
        generation: generationReducer,
        // Add other reducers here for future phases (e.g., history, user)
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;