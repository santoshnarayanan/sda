// src/lib/api/chat.ts
import api from "../api";

/*
    * Send a chat message to the server and receive a response.
        * @param params - An object containing the user ID, message, and session ID.
        * @return The response from the server, which may include a reply to the message.
        * Example usage:
        * const response = await sendChatMessage({
        *   userId: 1,
        *   message: "Hello, how are you?",
        *   sessionId: "abc123"
        * });
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
