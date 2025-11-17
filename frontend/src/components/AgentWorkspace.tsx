// src/components/AgentWorkspace.tsx
import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { runAgentTask, type AgentStep } from "../lib/api";

type TaskType = "analyze_architecture" | "refactor_code" | "generate_deployment" | "repo_overview";

export default function AgentWorkspace() {
  const [taskType, setTaskType] = useState<TaskType>("repo_overview");
  const [userQuery, setUserQuery] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [language, setLanguage] = useState("python");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [finalAnswer, setFinalAnswer] = useState("");

  const [deploymentFiles, setDeploymentFiles] = useState<any[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // Use the current analyzer collection, if any (GitHub import or upload)
  const activeCollection = useSelector(
    (state: RootState) => state.analyzer.collectionName
  );

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setSteps([]);
    setFinalAnswer("");

    try {
      const resp = await runAgentTask({
        taskType,
        collectionName: activeCollection ?? null,
        userQuery: userQuery || null,
        codeSnippet: taskType === "refactor_code" ? codeSnippet || null : null,
        language,
      });

      if (resp.deployment_files) {
        setDeploymentFiles(resp.deployment_files);
        setActiveFileIndex(0);
      } else {
        setDeploymentFiles([]);
      }


      setSteps(resp.steps);
      setFinalAnswer(resp.final_answer_markdown);
    } catch (e: any) {
      console.error("Agent run failed:", e);
      setError(e?.response?.data?.detail || e?.message || "Agent execution failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadZipBundle = async () => {
    if (!deploymentFiles || deploymentFiles.length === 0) {
      alert("No deployment files to export.");
      return;
    }

    const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/export_deployment_bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deploymentFiles),
    });

    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "deployment_bundle.zip";
    a.click();

    window.URL.revokeObjectURL(url);
  };


  const showCodeInput = taskType === "refactor_code";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <h2 className="text-2xl font-bold">Agent Workspace</h2>
      <p className="text-sm text-gray-600">
        Multi-agent assistant that can analyze architecture, refactor code, and generate deployment artifacts
        using your imported repositories and project collections.
      </p>

      {/* Task selection + context */}
      <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">1. Configure Task</h3>

        <div className="flex flex-wrap gap-3">
          <div className="w-full sm:w-64">
            <label className="text-sm font-medium text-gray-700">Task Type</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
            >
              <option value="repo_overview">Repository Overview</option>
              <option value="analyze_architecture">Analyze Architecture</option>
              <option value="refactor_code">Refactor / Review Code</option>
              <option value="generate_deployment">Generate Deployment Config</option>
            </select>
            {taskType === "generate_deployment" && (
              <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-2">
                <strong>Hint:</strong> If the DevOps Agent detects multiple runtimes (e.g. Python + Node.js),
                it will ask you which service to target.
                Update the task description with your choice (e.g. “Generate deployment for the Python backend only”)
                and click <strong>Run Agent</strong> again.
              </p>
            )}
          </div>

          <div className="w-full sm:flex-1">
            <label className="text-sm font-medium text-gray-700">
              Active Collection (from Code Analyzer / GitHub)
            </label>
            <input
              className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm"
              value={activeCollection || ""}
              readOnly
              placeholder="No collection selected yet"
            />
            <p className="mt-1 text-xs text-gray-500">
              Import a repository or upload a project in the Code Analyzer or GitHub tabs first.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Task Description / Question
          </label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            rows={3}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={
              taskType === "generate_deployment"
                ? "Example: Generate Dockerfile and Kubernetes manifests for this repo."
                : "Describe what you want the agents to do."
            }
          />
        </div>

        {showCodeInput && (
          <div>
            <label className="text-sm font-medium text-gray-700">
              Code Snippet (for refactor / review)
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              rows={6}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste the code you want the Refactor Agent to improve."
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Language:</label>
              <select
                className="rounded-lg border px-2 py-1 text-xs"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={loading}
          className={`mt-2 rounded-2xl px-4 py-2 text-sm font-medium text-white shadow ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {loading ? "Running agent..." : "Run Agent"}
        </button>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </section>

      {/* Agent Steps */}
      <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">2. Agent Steps</h3>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-500">
            Agent steps will appear here after you run a task.
          </p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, idx) => (
              <li key={idx} className="rounded-xl border bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    {idx + 1}. {step.step_name}
                  </div>
                  <div className="text-xs text-gray-500">{step.agent}</div>
                </div>
                <p className="mt-1 text-gray-700">{step.summary}</p>
                {step.tool_calls?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-blue-600">
                      View tool calls
                    </summary>
                    <ul className="mt-1 space-y-1 text-xs text-gray-600">
                      {step.tool_calls.map((tc, i2) => (
                        <li key={i2}>
                          <span className="font-semibold">{tc.tool_name}</span>:{" "}
                          {tc.status}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Final Answer */}
      <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">3. Final Answer</h3>
        {finalAnswer ? (
          <pre className="max-h-[400px] overflow-auto rounded-xl bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
            {finalAnswer}
          </pre>
        ) : (
          <p className="text-sm text-gray-500">
            When the agent finishes, its consolidated answer (architecture summary, code review, or deployment config)
            will appear here.
          </p>
        )}
      </section>

      {/* UI Viewer Section */}
      {deploymentFiles.length > 0 && (
        <div className="mt-10 p-4 border rounded-xl bg-white shadow-sm">
          <h2 className="text-lg font-bold mb-4">4. Deployment Artifacts</h2>

          {/* Tab Buttons */}
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {deploymentFiles.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3 py-1 rounded-xl text-sm ${idx === activeFileIndex
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                  }`}
              >
                {file.filename}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <pre className="p-4 bg-gray-900 text-white rounded-xl overflow-auto text-sm whitespace-pre-wrap">
            {deploymentFiles[activeFileIndex]?.content}
          </pre>

          {/* Download ZIP */}
          <button
            onClick={downloadZipBundle}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Download All as ZIP
          </button>
        </div>
      )}

    </div>
  );
}
