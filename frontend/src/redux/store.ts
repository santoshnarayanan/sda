import { configureStore } from "@reduxjs/toolkit";
import generationReducer from "./generationSlice";

export const store = configureStore({
  reducer: {
    generation: generationReducer,
  },
});

// Export typed hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
