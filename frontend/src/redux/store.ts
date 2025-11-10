import { configureStore } from "@reduxjs/toolkit";
import generationReducer from "./generationSlice";
import analyzerReducer from "./analyzerSlice";

export const store = configureStore({
  reducer: {
    generation: generationReducer,
    analyzer: analyzerReducer,
  },
});

// Export typed hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
