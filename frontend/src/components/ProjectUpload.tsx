import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../redux/store";
import { uploadProjectThunk } from "../redux/analyzerSlice";

export default function ProjectUpload() {
    const dispatch = useDispatch<AppDispatch>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [projectName, setProjectName] = useState("My Project");
    const [userId] = useState(1);

    const { uploadStatus, uploadError, collectionName, filesIndexed, chunksIndexed } = useSelector((s: RootState) => s.analyzer);


    const onChoose = () => fileRef.current?.click();


    const onFile = async (f: File | null) => {
        if (!f) return;
        await dispatch(uploadProjectThunk({ userId, projectName, file: f }));
    };

    return (
        <div className="w-full space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col">
                    <label className="text-sm font-medium">Project Name</label>
                    <input
                        className="mt-1 rounded-xl border p-2 outline-none focus:ring"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="SDA Demo"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={onChoose}
                        className="w-full rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white shadow hover:opacity-90"
                    >
                        Choose ZIP & Upload
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={(e) => onFile(e.target.files?.[0] || null)}
                    />
                </div>
            </div>


            <div className="rounded-2xl border p-4">
                <div className="text-sm text-gray-600">Status: <span className="font-semibold">{uploadStatus}</span></div>
                {uploadError && <div className="mt-1 text-sm text-red-600">{uploadError}</div>}
                {collectionName && (
                    <div className="mt-3 grid gap-1 text-sm">
                        <div><span className="font-semibold">Collection:</span> {collectionName}</div>
                        <div><span className="font-semibold">Files Indexed:</span> {filesIndexed}</div>
                        <div><span className="font-semibold">Chunks Indexed:</span> {chunksIndexed}</div>
                    </div>
                )}
            </div>
        </div>
    );
}