import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../redux/store";
import { reviewCodeThunk, setCode, setLanguage, setRuleset } from "../redux/analyzerSlice";


export default function CodeReviewPanel() {
    const dispatch = useDispatch<AppDispatch>();
    const { collectionName, language, ruleset, code, reviewStatus, reviewMarkdown, reviewError } = useSelector((s: RootState) => s.analyzer);


    const runReview = async () => {
        if (!collectionName) return;
        await dispatch(reviewCodeThunk({ collectionName, code, language, ruleset }));
    };


    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col">
                    <label className="text-sm font-medium">Language</label>
                    <select className="mt-1 rounded-xl border p-2" value={language} onChange={(e) => dispatch(setLanguage(e.target.value))}>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="jsx">JSX</option>
                        <option value="tsx">TSX</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium">Ruleset</label>
                    <select className="mt-1 rounded-xl border p-2" value={ruleset} onChange={(e) => dispatch(setRuleset(e.target.value as any))}>
                        <option value="default">Default</option>
                        <option value="security">Security</option>
                        <option value="style">Style</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button onClick={runReview} className="w-full rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white shadow hover:opacity-90">
                        Review Code
                    </button>
                </div>
            </div>


            <div>
                <label className="text-sm font-medium">Code</label>
                <textarea
                    className="mt-1 h-48 w-full rounded-2xl border p-3 font-mono text-sm"
                    placeholder="Paste code snippet here..."
                    value={code}
                    onChange={(e) => dispatch(setCode(e.target.value))}
                />
            </div>


            <div className="rounded-2xl border p-4">
                <div className="text-sm text-gray-600">Status: <span className="font-semibold">{reviewStatus}</span></div>
                {reviewError && <div className="mt-1 text-sm text-red-600">{reviewError}</div>}
                <h3 className="mt-2 text-lg font-semibold">Review Output</h3>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{reviewMarkdown || "(No review yet)"}</pre>
            </div>
        </div>
    );
}