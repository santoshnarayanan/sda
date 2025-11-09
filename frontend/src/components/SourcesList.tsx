// frontend/src/components/SourcesList.tsx
// Phase 2 – shows document sources returned from RAG
// ----------------------------------------------------

import React from "react";
import type { SourceChunk } from "../lib/api";

interface Props {
  sources: SourceChunk[] | null | undefined;
}

export default function SourcesList({ sources }: Props) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Sources
      </h3>

      <ul className="space-y-2">
        {sources.map((s, idx) => (
          <li
            key={`${s.source}-${s.chunk_id}-${idx}`}
            className="p-3 rounded-xl bg-gray-50 border flex flex-col gap-1"
          >
            <div className="text-sm text-gray-800 font-medium">
              {s.source}{" "}
              <span className="text-gray-400"># {s.chunk_id}</span>
            </div>

            {typeof s.score === "number" && (
              <div className="text-xs text-gray-500">
                score: {s.score.toFixed(4)}
              </div>
            )}

            {s.snippet && (
              <div className="text-xs text-gray-600 italic">
                {s.snippet}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
