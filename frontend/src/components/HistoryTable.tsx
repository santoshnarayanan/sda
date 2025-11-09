import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef, GridValueGetter } from "@mui/x-data-grid";

/** Types that match your backend response_model=HistoryResponse */
export interface HistoryRow {
  history_id: number;
  prompt_text: string;
  generated_content: string;
  request_type: string;
  content_language?: string | null;
  created_at: string; // ISO string from DB
}

interface HistoryResponse {
  history: HistoryRow[];
}

export interface HistoryTableProps {
  onSelect?: (row: HistoryRow) => void;
}

/** Small helper to truncate large text safely for a cell */
const truncate = (v: string, n = 120) => {
  if (!v) return "";
  return v.length > n ? v.slice(0, n) + "…" : v;
};

const HistoryTable: React.FC<HistoryTableProps> = ({ onSelect }) => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await axios.get<HistoryResponse>("/api/v1/history");
        if (!cancelled) {
          // Defensive: ensure row has id property for DataGrid
          setRows(
            (res.data.history || []).map((h) => ({
              ...h,
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "When",
        flex: 1,
        minWidth: 160,
        valueGetter: (p: { value: any }) => {
          const d = new Date(p.value as string);
          if (Number.isNaN(d.getTime())) return p.value;
          // Localized short format
          return d.toLocaleString();
        },
      },
      {
        field: "request_type",
        headerName: "Type",
        flex: 0.7,
        minWidth: 120,
      },
      {
        field: "content_language",
        headerName: "Lang",
        flex: 0.5,
        minWidth: 90,
        valueGetter: (p: { value: any }) => p.value || "",
      },
      {
        field: "prompt_text",
        headerName: "Prompt",
        flex: 1.5,
        minWidth: 220,
        renderCell: (p) => <span title={p.value as string}>{truncate(String(p.value || ""), 140)}</span>,
      },
      {
        field: "generated_content",
        headerName: "Output (preview)",
        flex: 2,
        minWidth: 280,
        renderCell: (p) => (
          <span title={p.value as string}>{truncate(String(p.value || ""), 200)}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full">
      {err ? (
        <div className="text-red-600 text-sm mb-3">{err}</div>
      ) : null}

      <div style={{ width: "100%" }}>
        <DataGrid
          autoHeight
          rows={rows}
          getRowId={(r) => r.history_id}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 10 } },
            sorting: { sortModel: [{ field: "created_at", sort: "desc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          onRowClick={(params) => {
            if (onSelect) onSelect(params.row as HistoryRow);
          }}
          sx={{
            "& .MuiDataGrid-cell": { whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" },
            "& .MuiDataGrid-columnHeaders": { fontWeight: 600 },
            borderRadius: "12px",
          }}
        />
      </div>
    </div>
  );
};

export default HistoryTable;
