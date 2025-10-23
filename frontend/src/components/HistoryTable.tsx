// src/components/HistoryTable.tsx
import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import axios from 'axios';
import { format } from 'date-fns';

// Define the shape of the data based on your FastAPI endpoint
interface HistoryItem {
    history_id: number;
    prompt_text: string;
    generated_content: string;
    request_type: string;
    content_language: string;
    created_at: string;
}

const HistoryTable: React.FC = () => {
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            // Set loading state at the start
            setLoading(true);
            setError(null); // Clear previous errors

            try {
                const response = await axios.get('http://127.0.0.1:8000/api/v1/history');

                const mappedData = response.data.history.map((item: HistoryItem) => ({
                    ...item,
                    id: item.history_id,
                }));

                setHistoryData(mappedData);
            } catch (err) {
                console.error("Error fetching history:", err);
                setError("Failed to load history data. Is the backend running?");
            } finally {
                setLoading(false);
            }
        };

        // The function is called immediately, and any external error is caught.
        // This is the clean way to run an async function inside useEffect.
        fetchHistory()
            .catch(e => {
                // This catch handles errors during the *initiation* of fetchHistory,
                // though most errors are handled inside the try/catch block.
                console.error("Unexpected error during history fetch initiation:", e);
            });

    }, []); // Dependency array remains empty

    // Define the columns for the DataGrid
    const columns: GridColDef[] = [
        { field: 'history_id', headerName: 'ID', width: 60 },
        { field: 'prompt_text', headerName: 'Request Prompt', flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <div className="line-clamp-2" title={params.value as string}>
                    {params.value}
                </div>
            )
        },
        { field: 'content_language', headerName: 'Lang', width: 80 },
        { field: 'request_type', headerName: 'Type', width: 100 },
        {
            field: 'created_at',
            headerName: 'Date',
            width: 150,
            // 👈 USE GridColDef instead for the formatter's parameters
            // This is the common workaround when the specific parameter type is hidden
            valueFormatter: (params) => {
                // Check if params is an object and has a value property before casting
                const dateValue = params && typeof params === 'object' && 'value' in params
                    ? (params as { value: string }).value
                    : null;

                if (dateValue) {
                    return format(new Date(dateValue as string), 'MMM dd, HH:mm');
                }
                return '';
            }
        },
        {
            field: 'view',
            headerName: 'Actions',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <button
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                    onClick={() => alert(`Content: \n\n${params.row.generated_content}`)}
                >
                    View Code
                </button>
            ),
            sortable: false,
            filterable: false,
        },
    ];

    if (loading) return <div className="text-center text-xl p-10">Loading History...</div>;
    if (error) return <div className="text-center text-red-600 text-xl p-10">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl" style={{ height: 600, width: '100%' }}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Request History</h2>
            <DataGrid
                rows={historyData}
                columns={columns}
                initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[5, 10, 25]}
                // Optional: Add a simple toolbar for searching/filtering if needed later
                // slots={{ toolbar: GridToolbar }}
            />
        </div>
    );
};

export default HistoryTable;