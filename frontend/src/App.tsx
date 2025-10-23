import React, { useState } from 'react';
import GenerationArea from './components/GenerationArea';
import OutputDisplay from './components/OutputDisplay';
import HistoryTable from './components/HistoryTable'; // Will be created in the next step

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-blue-800">Smart Developer Assistant (SDA)</h1>
                <p className="text-xl text-gray-600">Phase 1: Code Generation & History</p>
            </header>

            {/* Tabs for switching between Generator and History */}
            <div className="mb-6 flex justify-center space-x-2">
                <button
                    onClick={() => setActiveTab('generate')}
                    className={`px-6 py-2 rounded-t-lg font-semibold transition duration-150 ${
                        activeTab === 'generate' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                >
                    Code Generator
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2 rounded-t-lg font-semibold transition duration-150 ${
                        activeTab === 'history' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                >
                    Request History
                </button>
            </div>

            <main className="max-w-7xl mx-auto">
                {activeTab === 'generate' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <GenerationArea />
                        <OutputDisplay />
                    </div>
                ) : (
                    // History component placeholder
                    <HistoryTable />
                )}
            </main>
        </div>
    );
};

export default App;