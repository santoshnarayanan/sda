import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../redux/store";
import { addUserMessage, sendChatThunk } from "../redux/chatSlice";

export default function ChatInput() {
  const dispatch = useDispatch<AppDispatch>();
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!message.trim()) return;
    dispatch(addUserMessage(message));
    setMessage("");
    await dispatch(sendChatThunk(message));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Type your message..."
        rows={1}
        className="flex-1 resize-none rounded-2xl border p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <button
        onClick={handleSend}
        className="px-5 py-2 rounded-2xl bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
      >
        Send
      </button>
    </div>
  );
}
