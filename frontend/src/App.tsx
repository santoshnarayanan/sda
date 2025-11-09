import React, { useMemo, useState } from "react";
import { Provider,useDispatch } from "react-redux";
import GenerationArea from "./components/GenerationArea";
import OutputDisplay from "./components/OutputDisplay";
import HistoryTable, { HistoryRow } from "./components/HistoryTable";
import { setPrompt, setMode } from "./redux/generationSlice";
import { store } from "./redux/store";
/**
 * Lightweight app-level tabs with Tailwind.
 * We keep "reloaded from history" output in local state so we don't need to
 * touch the Redux slice. If present, we render that output above the standard OutputDisplay.
 */

const MainShell: React.FC = () => {
  const dispatch = useDispatch<any>();
  const [activeTab, setActiveTab] = useState<"assistant" | "history">("assistant");
  const [hydratedOutput, setHydratedOutput] = useState<string | null>(null);

  const onHistorySelect = (row: HistoryRow) => {
    // Fill the editor prompt
    dispatch(setPrompt(row.prompt_text));

    // Choose mode based on request_type
    if ((row.request_type || "").toLowerCase() === "code_refactor") {
      dispatch(setMode("refactor"));
    } else {
      dispatch(setMode("generate"));
    }

    // Show the historical output in the UI without altering the slice structure
    setHydratedOutput(row.generated_content || "");

    // Switch to the assistant tab
    setActiveTab("assistant");
  };

  const TabButton = useMemo(
    () =>
      function TabButton({
        id,
        label,
      }: {
        id: "assistant" | "history";
        label: string;
      }) {
        const isActive = activeTab === id;
        return (
          <button
            onClick={() => setActiveTab(id)}
            className={[
              "px-4 py-2 rounded-xl border transition",
              isActive
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400",
            ].join(" ")}
          >
            {label}
          </button>
        );
      },
    [activeTab]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-xl font-semibold">Smart Developer Assistant</h1>
        <div className="flex gap-2">
          <TabButton id="assistant" label="Assistant" />
          <TabButton id="history" label="History" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4">
        {activeTab === "assistant" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="col-span-1">
              <div className="bg-white rounded-2xl shadow p-4">
                <h2 className="text-lg font-medium mb-3">Input</h2>
                <GenerationArea />
              </div>
            </div>

            <div className="col-span-1">
              <div className="bg-white rounded-2xl shadow p-4">
                <h2 className="text-lg font-medium mb-3">Output</h2>

                {/* If a history item was loaded, show that output first */}
                {hydratedOutput ? (
                  <div className="mb-4 border rounded-xl p-3 bg-blue-50">
                    <div className="text-xs font-semibold text-blue-700 mb-2">
                      Loaded from history
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                      {hydratedOutput}
                    </pre>
                    <div className="text-xs text-blue-700 mt-2">
                      Tip: You can edit the prompt and click{" "}
                      <span className="font-semibold">Generate</span> or{" "}
                      <span className="font-semibold">Refactor</span> to create a fresh result.
                    </div>
                  </div>
                ) : null}

                {/* Live output from the current Redux slice */}
                <OutputDisplay />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-medium mb-3">History</h2>
            <HistoryTable onSelect={onHistorySelect} />
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <Provider store={store}>
    <MainShell />
  </Provider>
);

export default App;
