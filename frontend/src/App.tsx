// frontend/src/App.tsx
// Phase 2 – main application layout
// ------------------------------------------------------------

import React from "react";
import GenerationArea from "./components/GenerationArea";
import OutputDisplay from "./components/OutputDisplay";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="p-5 bg-white shadow sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Smart Developer Assistant
          </h1>
          <div className="text-sm text-gray-500">Phase 2 · Docs Q&amp;A</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-5 grid grid-cols-1 gap-4">
        <GenerationArea />
        <OutputDisplay />
      </main>
    </div>
  );
}
