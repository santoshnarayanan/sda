import React from "react";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";
import { useDispatch } from "react-redux";
import { resetChat } from "../redux/chatSlice";

export default function ChatPage() {
  const dispatch = useDispatch();

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Chat Assistant</h2>
        <button
          onClick={() => dispatch(resetChat())}
          className="text-sm text-blue-600 hover:underline"
        >
          New Chat
        </button>
      </div>

      <ChatWindow />
      <ChatInput />
    </div>
  );
}
