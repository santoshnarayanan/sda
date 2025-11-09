// frontend/src/components/OutputDisplay.tsx
// Phase 2 – displays AI output and retrieved document sources
// ------------------------------------------------------------

import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import SourcesList from "./SourcesList";

export default function OutputDisplay() {
  const { output, sources, error, loading } = useSelector(
    (s: RootState) => s.generation
  );

  return (
    <div className="w-full p-4 bg-white rounded-2xl shadow mt-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Output</h2>

      {/* Error */}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
          {String(error)}
        </div>
      )}

      {/* Main content */}
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-xl border min-h-[160px] overflow-x-auto">
        {loading ? "… Generating response …" : output || "No output yet."}
      </pre>

      {/* Retrieved context sources */}
      {sources && sources.length > 0 && <SourcesList sources={sources} />}
    </div>
  );
}
