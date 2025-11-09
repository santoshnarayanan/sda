// frontend/src/components/GenerationArea.tsx
// Phase 2 – unified input form for Code and Docs Q&A modes
// --------------------------------------------------------

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../redux/store"; // Add AppDispatch
import {
  runCodeGen,
  runDocsQA,
  setPrompt,
  setLanguage,
  setTopK,
  setRerank,
} from "../redux/generationSlice";
import ModeToggle from "./ModeToggle";

export default function GenerationArea() {
  const dispatch = useDispatch<AppDispatch>();
  const { mode, prompt, language, loading, top_k, rerank } = useSelector(
    (s: RootState) => s.generation
  );
  const [localPrompt, setLocalPrompt] = useState(prompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setPrompt(localPrompt));

    if (mode === "code") {
      dispatch(runCodeGen({ prompt: localPrompt, language }));
    } else {
      dispatch(runDocsQA({ prompt: localPrompt, top_k, rerank }));
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-2xl shadow">
      {/* Top bar with toggle and settings */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <ModeToggle />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Lang</label>
          <select
            value={language}
            onChange={(e) => dispatch(setLanguage(e.target.value))}
            className="border rounded-xl px-3 py-2 text-sm"
          >
            <option value="markdown">Markdown</option>
            <option value="python">Python</option>
            <option value="jsx">React / JSX</option>
          </select>

          {mode === "docs" && (
            <>
              <label className="text-sm text-gray-600 ml-3">top k</label>
              <input
                type="number"
                min={1}
                max={20}
                value={top_k}
                onChange={(e) =>
                  dispatch(setTopK(parseInt(e.target.value || "6", 10)))
                }
                className="w-20 border rounded-xl px-3 py-2 text-sm"
              />
              <label className="text-sm text-gray-600 ml-3">rerank</label>
              <input
                type="checkbox"
                checked={rerank}
                onChange={(e) => dispatch(setRerank(e.target.checked))}
                className="h-5 w-5"
              />
            </>
          )}
        </div>
      </div>

      {/* Prompt box */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          rows={6}
          placeholder={
            mode === "code"
              ? "Describe the code you want..."
              : "Ask a question about your docs..."
          }
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          className="w-full border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-2xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Working..."
              : mode === "code"
              ? "Generate"
              : "Ask Docs"}
          </button>
          <span className="text-sm text-gray-500">
            API → {import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}
          </span>
        </div>
      </form>
    </div>
  );
}
