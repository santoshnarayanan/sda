import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

/**
 * We render the backend response verbatim in a preformatted block.
 * (No extra dependencies like react-markdown to keep the stack lean.)
 */
const OutputDisplay: React.FC = () => {
  const { output, mode, loading } = useSelector(
    (state: RootState) => state.generation
  );

  if (loading) {
    return (
      <div className="p-4 text-gray-500 italic">
        Working on your {mode === "generate" ? "request" : "refactor"}...
      </div>
    );
  }

  if (!output) {
    return (
      <div className="p-4 text-gray-400 italic">
        {mode === "generate"
          ? "Generated output will appear here."
          : "Refactored code and explanation will appear here."}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-2xl shadow-inner">
      <pre className="whitespace-pre-wrap break-words text-sm leading-6">
        {output}
      </pre>
    </div>
  );
};

export default OutputDisplay;
