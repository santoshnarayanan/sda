// src/components/AgentWorkspace.tsx
// import { useState } from "react";
// import { useSelector } from "react-redux";
// import type { RootState } from "../redux/store";
// import { runAgentTask, type AgentStep } from "../lib/api";

// type TaskType = "analyze_architecture" | "refactor_code" | "generate_deployment" | "repo_overview";

// export default function AgentWorkspace() {
//   const [taskType, setTaskType] = useState<TaskType>("repo_overview");
//   const [userQuery, setUserQuery] = useState("");
//   const [codeSnippet, setCodeSnippet] = useState("");
//   const [language, setLanguage] = useState("python");

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [steps, setSteps] = useState<AgentStep[]>([]);
//   const [finalAnswer, setFinalAnswer] = useState("");

//   // Use the current analyzer collection, if any (GitHub import or upload)
//   const activeCollection = useSelector(
//     (state: RootState) => state.analyzer.collectionName
//   );

//   const handleRun = async () => {
//     setLoading(true);
//     setError(null);
//     setSteps([]);
//     setFinalAnswer("");

//     try {
//       const resp = await runAgentTask({
//         taskType,
//         collectionName: activeCollection ?? null,
//         userQuery: userQuery || null,
//         codeSnippet: taskType === "refactor_code" ? codeSnippet || null : null,
//         language,
//       });

//       setSteps(resp.steps);
//       setFinalAnswer(resp.final_answer_markdown);
//     } catch (e: any) {
//       console.error("Agent run failed:", e);
//       setError(e?.response?.data?.detail || e?.message || "Agent execution failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const showCodeInput = taskType === "refactor_code";

//   return (
//     <div className="mx-auto max-w-6xl space-y-6 p-4">
//       <h2 className="text-2xl font-bold">Agent Workspace</h2>
//       <p className="text-sm text-gray-600">
//         Multi-agent assistant that can analyze architecture, refactor code, and generate deployment artifacts
//         using your imported repositories and project collections.
//       </p>

//       {/* Task selection + context */}
//       <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
//         <h3 className="text-lg font-semibold">1. Configure Task</h3>

//         <div className="flex flex-wrap gap-3">
//           <div className="w-full sm:w-64">
//             <label className="text-sm font-medium text-gray-700">Task Type</label>
//             <select
//               className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
//               value={taskType}
//               onChange={(e) => setTaskType(e.target.value as TaskType)}
//             >
//               <option value="repo_overview">Repository Overview</option>
//               <option value="analyze_architecture">Analyze Architecture</option>
//               <option value="refactor_code">Refactor / Review Code</option>
//               <option value="generate_deployment">Generate Deployment Config</option>
//             </select>
//             {taskType === "generate_deployment" && (
//               <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-2">
//                 <strong>Hint:</strong> If the DevOps Agent detects multiple runtimes (e.g. Python + Node.js),
//                 it will ask you which service to target.
//                 Update the task description with your choice (e.g. “Generate deployment for the Python backend only”)
//                 and click <strong>Run Agent</strong> again.
//               </p>
//             )}
//           </div>

//           <div className="w-full sm:flex-1">
//             <label className="text-sm font-medium text-gray-700">
//               Active Collection (from Code Analyzer / GitHub)
//             </label>
//             <input
//               className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm"
//               value={activeCollection || ""}
//               readOnly
//               placeholder="No collection selected yet"
//             />
//             <p className="mt-1 text-xs text-gray-500">
//               Import a repository or upload a project in the Code Analyzer or GitHub tabs first.
//             </p>
//           </div>
//         </div>

//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Task Description / Question
//           </label>
//           <textarea
//             className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
//             rows={3}
//             value={userQuery}
//             onChange={(e) => setUserQuery(e.target.value)}
//             placeholder={
//               taskType === "generate_deployment"
//                 ? "Example: Generate Dockerfile and Kubernetes manifests for this repo."
//                 : "Describe what you want the agents to do."
//             }
//           />
//         </div>

//         {showCodeInput && (
//           <div>
//             <label className="text-sm font-medium text-gray-700">
//               Code Snippet (for refactor / review)
//             </label>
//             <textarea
//               className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
//               rows={6}
//               value={codeSnippet}
//               onChange={(e) => setCodeSnippet(e.target.value)}
//               placeholder="Paste the code you want the Refactor Agent to improve."
//             />
//             <div className="mt-2 flex flex-wrap items-center gap-2">
//               <label className="text-xs font-medium text-gray-600">Language:</label>
//               <select
//                 className="rounded-lg border px-2 py-1 text-xs"
//                 value={language}
//                 onChange={(e) => setLanguage(e.target.value)}
//               >
//                 <option value="python">Python</option>
//                 <option value="typescript">TypeScript</option>
//                 <option value="javascript">JavaScript</option>
//                 <option value="java">Java</option>
//                 <option value="csharp">C#</option>
//               </select>
//             </div>
//           </div>
//         )}

//         <button
//           onClick={handleRun}
//           disabled={loading}
//           className={`mt-2 rounded-2xl px-4 py-2 text-sm font-medium text-white shadow ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
//             }`}
//         >
//           {loading ? "Running agent..." : "Run Agent"}
//         </button>

//         {error && <div className="text-sm text-red-600">{error}</div>}
//       </section>

//       {/* Agent Steps */}
//       <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
//         <h3 className="text-lg font-semibold">2. Agent Steps</h3>
//         {steps.length === 0 ? (
//           <p className="text-sm text-gray-500">
//             Agent steps will appear here after you run a task.
//           </p>
//         ) : (
//           <ol className="space-y-3">
//             {steps.map((step, idx) => (
//               <li key={idx} className="rounded-xl border bg-gray-50 p-3 text-sm">
//                 <div className="flex items-center justify-between gap-2">
//                   <div className="font-semibold">
//                     {idx + 1}. {step.step_name}
//                   </div>
//                   <div className="text-xs text-gray-500">{step.agent}</div>
//                 </div>
//                 <p className="mt-1 text-gray-700">{step.summary}</p>
//                 {step.tool_calls?.length > 0 && (
//                   <details className="mt-2">
//                     <summary className="cursor-pointer text-xs font-medium text-blue-600">
//                       View tool calls
//                     </summary>
//                     <ul className="mt-1 space-y-1 text-xs text-gray-600">
//                       {step.tool_calls.map((tc, i2) => (
//                         <li key={i2}>
//                           <span className="font-semibold">{tc.tool_name}</span>:{" "}
//                           {tc.status}
//                         </li>
//                       ))}
//                     </ul>
//                   </details>
//                 )}
//               </li>
//             ))}
//           </ol>
//         )}
//       </section>

//       {/* Final Answer */}
//       <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
//         <h3 className="text-lg font-semibold">3. Final Answer</h3>
//         {finalAnswer ? (
//           <pre className="max-h-[400px] overflow-auto rounded-xl bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
//             {finalAnswer}
//           </pre>
//         ) : (
//           <p className="text-sm text-gray-500">
//             When the agent finishes, its consolidated answer (architecture summary, code review, or deployment config)
//             will appear here.
//           </p>
//         )}
//       </section>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api/v1";

type AgentStatusResponse = {
  task_id: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
};

const AgentWorkspace: React.FC = () => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("Explain the architecture");

  /**
   * Trigger async agent execution
   */
  const runAgent = async () => {
    try {
      setStatus("queued");
      setResult(null);
      setError(null);

      const payload = {
        task_type: "analyze_architecture",
        collection_name: "project_1_demo",
        user_query: query
      };

      const response = await axios.post(`${API_BASE}/agent_run_async`, payload);

      const id = response.data.task_id;

      setTaskId(id);
      setStatus("running");

    } catch (err: any) {
      setError("Failed to start agent");
      setStatus("failed");
    }
  };

  /**
   * Poll task status
   */
  useEffect(() => {
    if (!taskId) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get<AgentStatusResponse>(
          `${API_BASE}/agent_status/${taskId}`
        );

        const data = response.data;

        setStatus(data.status);

        if (data.status === "completed") {
          setResult(data.result);
          clearInterval(interval);
        }

        if (data.status === "failed") {
          setError(data.error || "Agent execution failed");
          clearInterval(interval);
        }

      } catch (err) {
        setError("Error polling task status");
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);

  }, [taskId]);

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="text-xl font-semibold text-gray-800">
        AI Agent Workspace
      </div>

      {/* Query Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Agent Query
        </label>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded p-3"
          rows={3}
        />
      </div>

      {/* Run Button */}
      <button
        onClick={runAgent}
        disabled={status === "running"}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Run Agent
      </button>

      {/* Status Indicator */}
      <div className="text-sm text-gray-600">
        Status: <span className="font-semibold">{status}</span>
      </div>

      {/* Loading */}
      {status === "running" && (
        <div className="animate-pulse text-blue-600">
          Agent is analyzing the project...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="border rounded p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">Agent Result</h3>

          <pre className="whitespace-pre-wrap text-sm">
            {result.final_answer_markdown}
          </pre>
        </div>
      )}

    </div>
  );
};

export default AgentWorkspace;