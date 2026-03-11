import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";

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
  // Use the current analyzer collection, if any (GitHub import or upload)
  const activeCollection = useSelector(
    (state: RootState) => state.analyzer.collectionName,
  );

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
        collection_name: activeCollection,
        user_query: query,
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
          `${API_BASE}/agent_status/${taskId}`,
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
        <label className="block text-sm font-medium">Agent Query</label>

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
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
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
