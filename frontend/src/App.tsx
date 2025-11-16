import { Provider } from "react-redux";
import { store } from "./redux/store";
import GenerationArea from "./components/GenerationArea";
import OutputDisplay from "./components/OutputDisplay";
import HistoryTable from "./components/HistoryTable";
import CodeAnalyzer from "./components/CodeAnalyzer";
import GithubIntegration from "./components/GithubIntegration";
import ChatPage from "./components/ChatPage";
import { useState } from "react";
/**
 * Lightweight app-level tabs with Tailwind.
 * We keep "reloaded from history" output in local state so we don't need to
 * touch the Redux slice. If present, we render that output above the standard OutputDisplay.
 */

function AppShell() {
  const [tab, setTab] = useState<"generate" | "analyze" | "github">("generate");


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <h1 className="text-xl font-bold">Smart Developer Assistant</h1>
          <nav className="flex gap-2">
            <button
              className={`rounded-2xl px-4 py-2 text-sm ${
                tab === "generate" ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
              onClick={() => setTab("generate")}
            >
              Generate
            </button>
            <button
              className={`rounded-2xl px-4 py-2 text-sm ${
                tab === "analyze" ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
              onClick={() => setTab("analyze")}
            >
              Code Analyzer
            </button>
             <button
              className={`rounded-2xl px-4 py-2 text-sm ${
                tab === "github" ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
              onClick={() => setTab("github")}
            >
              GitHub
            </button>
          </nav>
        </div>
      </header>

       <main className="mx-auto max-w-6xl p-4">
        {tab === "generate" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <GenerationArea />
            </div>
            <div className="space-y-4">
              <OutputDisplay />
              <HistoryTable />
            </div>
          </div>
        ) : tab === "analyze" ? (
          <CodeAnalyzer />
        ) : (
          <GithubIntegration />
        )}
      </main>
    </div>
  );
}


export default function App() {
  return (
    <Provider store={store}>
      <AppShell />
    </Provider>
  );
}
