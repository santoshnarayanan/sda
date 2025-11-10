// src/components/GenerationArea.tsx
import { useState } from "react";
import axios from "axios";
import VoiceRecorder from "./Recorder";

export default function GenerationArea() {
  // --- State management ---
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("python");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Generate handler (new implementation) ---
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post("http://localhost:8000/api/v1/generate", {
        prompt_text: prompt,
        content_language: language,
      });
      setGenerated(data.generated_content || data);
    } catch (err: any) {
      console.error("Error generating code:", err);
      setError("Generation failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* --- Prompt Input Area --- */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Enter your request or speak below
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-gray-300 bg-white p-3 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          placeholder="e.g., Write a Python function to reverse a string."
        />
      </div>

      {/* --- Controls Row --- */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
        </select>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`rounded-2xl px-4 py-2 font-medium text-white shadow transition ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        {/* 🎙️ Voice Recorder */}
        <VoiceRecorder onTranscribed={(text) => setPrompt(text)} />
      </div>

      {/* --- Error display --- */}
      {error && (
        <div className="text-sm text-red-600 font-medium">{error}</div>
      )}

      {/* --- Generated Output --- */}
      {generated && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-inner">
          <h3 className="text-md font-semibold mb-2">Generated Output</h3>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">
            {generated}
          </pre>
        </div>
      )}
    </div>
  );
}
