import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../redux/store";
import { analyzeProjectThunk, setFocus } from "../redux/analyzerSlice";
import ProjectUpload from "./ProjectUpload";
import AnalysisDisplay from "./AnalysisDisplay";
import CodeReviewPanel from "./CodeReviewPanel";


export default function CodeAnalyzer() {
    const dispatch = useDispatch<AppDispatch>();
    const { collectionName, focus, analyzeStatus, analyzeError, summaryMarkdown } = useSelector((s: RootState) => s.analyzer);


    const runAnalyze = async () => {
        if (!collectionName) return;
        await dispatch(analyzeProjectThunk({ collectionName, focus }));
    };


    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4">
            <h2 className="text-2xl font-bold">Code Analyzer</h2>
            <p className="text-sm text-gray-600">Upload a project ZIP, generate an architecture summary, and run code reviews.</p>


            <section className="space-y-3">
                <h3 className="text-lg font-semibold">1. Upload Project</h3>
                <ProjectUpload />
            </section>


            <section className="space-y-3">
                <h3 className="text-lg font-semibold">2. Analyze Architecture</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium">Focus</label>
                        <select className="mt-1 rounded-xl border p-2" value={focus ?? ""} onChange={(e) => dispatch(setFocus(e.target.value || null))}>
                            <option value="">General</option>
                            <option value="architecture">Architecture</option>
                            <option value="dependencies">Dependencies</option>
                            <option value="entrypoints">Entrypoints</option>
                            <option value="risks">Risks</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={runAnalyze} className="w-full rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white shadow hover:opacity-90">
                            Analyze Project
                        </button>
                    </div>
                </div>
                <div className="text-sm text-gray-600">Status: <span className="font-semibold">{analyzeStatus}</span></div>
                {analyzeError && <div className="text-sm text-red-600">{analyzeError}</div>}
                <AnalysisDisplay markdown={summaryMarkdown} />
            </section>


            <section className="space-y-3">
                <h3 className="text-lg font-semibold">3. Code Review</h3>
                <CodeReviewPanel />
            </section>
        </div>
    );
}