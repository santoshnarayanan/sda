import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import {
  setPrompt,
  setMode,
  setLanguage,
  generateCode,
  refactorCode,
} from "../redux/generationSlice";

const GenerationArea: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { prompt, mode, language, loading, error } = useSelector(
    (state: RootState) => state.generation
  );

  const onSubmit = () => {
    if (mode === "generate") {
      dispatch(generateCode({ prompt, language }));
    } else {
      dispatch(refactorCode({ code: prompt, language }));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-2 rounded-xl border ${
            mode === "generate"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300"
          }`}
          onClick={() => dispatch(setMode("generate"))}
        >
          Generate
        </button>
        <button
          className={`px-3 py-2 rounded-xl border ${
            mode === "refactor"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300"
          }`}
          onClick={() => dispatch(setMode("refactor"))}
        >
          Refactor
        </button>

        {/* Language Selector */}
        <select
          className="ml-auto px-3 py-2 border rounded-xl"
          value={language}
          onChange={(e) => dispatch(setLanguage(e.target.value))}
          title="Language hint"
        >
          <option value="python">Python</option>
          <option value="jsx">React/JSX</option>
          <option value="typescript">TypeScript</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="go">Go</option>
          <option value="csharp">C#</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      {/* Input */}
      <textarea
        className="w-full h-56 p-3 border rounded-2xl font-mono outline-none focus:ring-2 focus:ring-blue-600"
        placeholder={
          mode === "generate"
            ? "Enter your request (e.g., 'Write a Python function to parse a CSV...')"
            : "Paste code to refactor (it will be analyzed, optimized, and documented)..."
        }
        value={prompt}
        onChange={(e) => dispatch(setPrompt(e.target.value))}
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {mode === "generate"
            ? "Tips: Be explicit about the language and constraints."
            : "Tips: Provide runnable code and include context if needed."}
        </div>
        <button
          className={`px-4 py-2 rounded-xl text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:opacity-90"
          }`}
          onClick={onSubmit}
          disabled={loading || !prompt.trim()}
        >
          {loading
            ? "Processing..."
            : mode === "generate"
            ? "Generate"
            : "Refactor"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default GenerationArea;
