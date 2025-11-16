            // frontend/src/components/ModeToggle.tsx
// Phase 2 – UI toggle between Code and Docs Q&A modes
// ----------------------------------------------------

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { setMode, type Mode } from "../redux/generationSlice";

export default function ModeToggle() {
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.generation.mode);

  const base =
    "px-4 py-2 rounded-xl border text-sm font-medium transition";
  const active =
    "bg-blue-600 text-white border-blue-600";
  const inactive =
    "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";

  const handleClick = (newMode: Mode) => {
    dispatch(setMode(newMode));
  };

  return (
    <div className="inline-flex gap-2 bg-white p-1 rounded-2xl shadow-sm">
      <button
        type="button"
        className={`${base} ${mode === "generate" ? active : inactive}`}
        onClick={() => handleClick("generate")}
      >
        Code
      </button>

      <button
        type="button"
        className={`${base} ${mode === "refactor" ? active : inactive}`}
        onClick={() => handleClick("refactor")}
      >
        Docs Q&A
      </button>
    </div>
  );
}
