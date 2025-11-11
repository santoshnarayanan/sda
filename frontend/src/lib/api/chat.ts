// src/lib/api/chat.ts
import api from "../api";

/** 
 * Sends a message to the AI chat endpoint.
 * Backend expects: { user_id, message, session_id }
 */
export async function sendChatMessage(params: {
  userId: number;
  message: string;
  sessionId: string;
}): Promise<{ response: string }> {
  const { data } = await api.post("/api/chat", {
    user_id: params.userId,
    message: params.message,
    session_id: params.sessionId,
  });
  return data;
}
