import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../redux/store";
import {
  getGithubLoginUrl,
  completeGithubAuth,
  getGithubRepos,
  importGithubRepo,
  type GithubRepo,
  type ImportRepoResponse,
} from "../lib/api";
import { setImportedProject } from "../redux/analyzerSlice";

const USER_ID = 1;

export default function GithubIntegration() {
  const dispatch = useDispatch<AppDispatch>();

  const [connected, setConnected] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubScope, setGithubScope] = useState<string | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposError, setReposError] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(false);

  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportRepoResponse | null>(null);

  /** -----------------------------
   *  1. Handle OAuth callback
   *  ----------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code) return;

    // Clean URL BEFORE causing any React re-render
    window.history.replaceState({}, "", window.location.pathname);

    const run = async () => {
      setAuthLoading(true);
      setAuthError(null);

      try {
        const resp = await completeGithubAuth(code, state, USER_ID);

        setGithubLogin(resp.github_login);
        setGithubScope(resp.scope ?? null);
        setConnected(true);
      } catch (err: any) {
        console.error("OAuth complete failed:", err);
        setAuthError(
          err?.response?.data?.detail ||
          err?.message ||
          "GitHub OAuth failed"
        );
      } finally {
        setAuthLoading(false);
      }
    };

    run();
  }, []); // IMPORTANT: empty deps (runs once)

  /** -----------------------------
   *  2. Load repos after auth success
   *  ----------------------------- */
  useEffect(() => {
    if (!connected) return;

    const load = async () => {
      setReposLoading(true);
      setReposError(null);

      try {
        const data = await getGithubRepos(USER_ID);
        setRepos(data);

        if (data.length > 0) {
          setSelectedRepo(data[0].full_name);
          setSelectedBranch(data[0].default_branch || "");
        }
      } catch (err: any) {
        setReposError(
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load repositories"
        );
      } finally {
        setReposLoading(false);
      }
    };

    load();
  }, [connected]);

  /** -----------------------------
   *  3. Begin GitHub login
   *  ----------------------------- */
  const handleConnectGithub = async () => {
    try {
      const { login_url } = await getGithubLoginUrl();
      window.location.href = login_url;
    } catch (err: any) {
      setAuthError(
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to start GitHub login"
      );
    }
  };

  /** -----------------------------
   *  4. Import repository
   *  ----------------------------- */
  const handleImportRepo = async () => {
    if (!selectedRepo) {
      setImportError("Select a repository first");
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    try {
      const resp = await importGithubRepo({
        userId: USER_ID,
        repoFullName: selectedRepo,
        branch: selectedBranch || null,
      });

      setImportResult(resp);

      // Push into Analyzer
      dispatch(
        setImportedProject({
          collectionName: resp.qdrant_collection,
          filesIndexed: resp.files_indexed,
          chunksIndexed: resp.chunks_indexed,
        })
      );
    } catch (err: any) {
      console.error("Import failed:", err);
      setImportError(
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to import repository"
      );
    } finally {
      setImportLoading(false);
    }
  };

  /** -----------------------------
   *  RENDER
   *  ----------------------------- */
  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">

      <h2 className="text-2xl font-bold">GitHub Integration</h2>

      {/* Connect GitHub */}
      <section className="p-4 bg-white border rounded-2xl shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">1. Connect GitHub Account</h3>

        <button
          onClick={handleConnectGithub}
          disabled={authLoading}
          className={`rounded-2xl px-4 py-2 text-sm font-medium text-white shadow ${
            authLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {connected ? "Reconnect GitHub" : "Connect GitHub"}
        </button>

        {connected && githubLogin && (
          <div className="text-sm text-gray-700">
            Connected as <b>{githubLogin}</b>{" "}
            <span className="text-xs text-gray-500">(scope: {githubScope})</span>
          </div>
        )}

        {authError && <div className="text-sm text-red-600">{authError}</div>}
      </section>

      {/* Select Repo */}
      <section className="p-4 bg-white border rounded-2xl shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">2. Choose Repository</h3>

        {!connected && (
          <p className="text-sm text-gray-500">
            Connect GitHub first to load repositories.
          </p>
        )}

        {connected && (
          <>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={selectedRepo}
              onChange={(e) => {
                const full = e.target.value;
                setSelectedRepo(full);

                const repo = repos.find((r) => r.full_name === full);
                setSelectedBranch(repo?.default_branch || "");
              }}
            >
              {repos.map((r) => (
                <option key={r.id} value={r.full_name}>
                  {r.full_name} {r.private && "(private)"}
                </option>
              ))}
            </select>

            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Branch name (leave blank for default)"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            />

            <button
              onClick={handleImportRepo}
              disabled={importLoading}
              className={`rounded-2xl px-4 py-2 text-sm font-medium text-white shadow ${
                importLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {importLoading ? "Importing..." : "Import Repository"}
            </button>

            {reposError && <div className="text-sm text-red-600">{reposError}</div>}
          </>
        )}
      </section>

      {/* Import Result */}
      <section className="p-4 bg-white border rounded-2xl shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">3. Import Status</h3>

        {importResult ? (
          <div className="text-sm text-gray-700 space-y-1">
            <div>Repo: {importResult.repo_full_name}</div>
            <div>Branch: {importResult.branch}</div>
            <div>
              Collection:{" "}
              <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">
                {importResult.qdrant_collection}
              </code>
            </div>
            <div>Files Indexed: {importResult.files_indexed}</div>
            <div>Chunks Indexed: {importResult.chunks_indexed}</div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Import a repository to see details.</p>
        )}
      </section>
    </div>
  );
}
