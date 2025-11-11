import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { sendChatMessage } from "../lib/api/chat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatState {
  sessionId: string;
  userId: number;
  messages: ChatMessage[];
  loading: boolean;
  error?: string | null;
}

const initialState: ChatState = {
  sessionId: crypto.randomUUID(), // unique session
  userId: 1,                      // demo default
  messages: [],
  loading: false,
  error: null,
};

/** Async thunk to send a message to backend /api/chat */
export const sendChatThunk = createAsyncThunk<
  { response: string },
  string,
  { state: { chat: ChatState } }
>("chat/sendChat", async (message, { getState }) => {
  const { userId, sessionId } = getState().chat;
  const res = await sendChatMessage({ userId, message, sessionId });
  return res;
});

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addUserMessage(state, action: PayloadAction<string>) {
      state.messages.push({
        role: "user",
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    resetChat(state) {
      state.messages = [];
      state.sessionId = crypto.randomUUID();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendChatThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          role: "assistant",
          content: action.payload.response,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendChatThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to send chat message.";
      });
  },
});

export const { addUserMessage, resetChat } = chatSlice.actions;
export default chatSlice.reducer;
