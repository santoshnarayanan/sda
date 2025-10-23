// src/components/OutputDisplay.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

const OutputDisplay: React.FC = () => {
    const { generatedCode, isLoading, error } = useSelector((state: RootState) => state.generation);

    // Simple syntax highlighting (can be replaced by a library like react-syntax-highlighter)
    const languageClass = 'language-text';

    return (
        <div className="p-6 bg-gray-900 shadow-xl rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Generated Output</h2>

            {error && (
                <div className="p-3 bg-red-500 text-white rounded-md mb-4">
                    Error: {error}
                </div>
            )}

            <pre className="relative p-4 bg-gray-800 rounded-md overflow-x-auto">
        {isLoading && generatedCode === '' ? (
            <div className="text-yellow-400 text-center py-8">Loading...</div>
        ) : generatedCode ? (
            <code className={`text-sm text-gray-100 ${languageClass}`}>
                {generatedCode}
            </code>
        ) : (
            <div className="text-gray-500 text-center py-8">
                Your generated code will appear here.
            </div>
        )}
      </pre>
        </div>
    );
};

export default OutputDisplay;