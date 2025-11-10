export default function AnalysisDisplay({ markdown }: { markdown: string }) {
    return (
        <div className="rounded-2xl border p-4">
            <h3 className="mb-2 text-lg font-semibold">Architecture Summary</h3>
            {/* Minimal renderer: show as preformatted text. You can swap to react-markdown later. */}
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{markdown || "(No summary yet)"}</pre>
        </div>
    );
}