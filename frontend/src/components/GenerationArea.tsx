import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { setPrompt, setLanguage, setLoading, setGeneratedCode, setError } from '../redux/generationSlice';
import axios from 'axios'; // We'll use axios for API calls

const GenerationArea: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { prompt, language, isLoading } = useSelector((state: RootState) => state.generation);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/v1/generate', {
                prompt_text: prompt,
                content_language: language,
            });

            dispatch(setGeneratedCode(response.data.generated_content));
        } catch (err) {
            console.error(err);
            dispatch(setError('Failed to connect to the AI service. Check your backend server.'));
        }
    };

    return (
        <div className="p-6 bg-white shadow-xl rounded-lg space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Generate Code / Documentation</h2>

            {/* Prompt Textarea */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Request:</label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    rows={5}
                    value={prompt}
                    onChange={(e) => dispatch(setPrompt(e.target.value))}
                    placeholder="e.g., Write a Python function to read a CSV file into a list of dictionaries."
                />
            </div>

            {/* Language Input and Button */}
            <div className="flex items-end space-x-4">
                <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Language/Framework:</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={language}
                        onChange={(e) => dispatch(setLanguage(e.target.value))}
                        placeholder="e.g., python, javascript/react, SQL"
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className={`px-6 py-2 rounded-md font-semibold transition duration-200 ${
                        isLoading
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    }`}
                >
                    {isLoading ? 'Generating...' : 'Generate'}
                </button>
            </div>
        </div>
    );
};

export default GenerationArea;