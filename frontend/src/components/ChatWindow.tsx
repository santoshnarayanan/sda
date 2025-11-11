import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";

export default function ChatWindow() {
  const { messages, loading } = useSelector((state: RootState) => state.chat);

  return (
    <div className="flex flex-col gap-3 p-4 h-[70vh] overflow-y-auto rounded-2xl border bg-white shadow-inner">
      {messages.length === 0 && (
        <div className="text-gray-400 italic text-center my-auto">
          Start a conversation below 👇
        </div>
      )}

      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {msg.content}
            </p>
            <span className="block text-[10px] mt-1 opacity-70">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}

      {loading && (
        <div className="text-gray-500 text-sm italic text-center mt-2">
          Thinking…
        </div>
      )}
    </div>
  );
}
