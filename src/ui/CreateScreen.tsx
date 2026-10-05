import { useEffect, useMemo, useState } from "preact/hooks";
import { createClient, JiraError, type Credentials, type IssueType, type Project } from "../jira/client";
import { host } from "../sdk";

type Last = { projectKey?: string; issueTypeId?: string };

export function CreateScreen(props: { creds: Credentials; onDisconnect: () => void; onAuthFailed: () => void }) {
  const client = useMemo(() => createClient(props.creds, host.http.fetch), [props.creds]);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [filter, setFilter] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [types, setTypes] = useState<IssueType[]>([]);
  const [issueTypeId, setIssueTypeId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<{ message: string; details: string[]; retry?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown, retry?: () => void) => {
    if (err instanceof JiraError && err.kind === "auth") return props.onAuthFailed();
    const e = err instanceof JiraError ? err : new JiraError("other", String((err as Error).message));
    setError({ message: e.message, details: e.details, retry: e.kind === "network" ? retry : undefined });
  };

  const loadProjects = () => {
    setError(null);
    Promise.all([client.projects(), host.storage.get<Last>("last")])
      .then(([list, last]) => {
        setProjects(list);
        const key = last?.projectKey && list.some((p) => p.key === last.projectKey) ? last.projectKey : list[0]?.key ?? "";
        setProjectKey(key);
        if (last?.issueTypeId) setIssueTypeId(last.issueTypeId);
      })
      .catch((err) => fail(err, loadProjects));
  };
  useEffect(loadProjects, [client]);

  useEffect(() => {
    if (!projectKey) return;
    client
      .issueTypes(projectKey)
      .then((list) => {
        setTypes(list);
        setIssueTypeId((cur) => (list.some((t) => t.id === cur) ? cur : list[0]?.id ?? ""));
      })
      .catch((err) => fail(err));
  }, [client, projectKey]);

  const shown = (projects ?? []).filter((p) => `${p.key} ${p.name}`.toLowerCase().includes(filter.toLowerCase()));

  async function submit(e: Event) {
    e.preventDefault();
    if (!summary.trim()) return setError({ message: "A summary is required.", details: [] });
    setBusy(true);
    setError(null);
    try {
      const issue = await client.createIssue({ projectKey, issueTypeId, summary, description });
      await host.storage.set("last", { projectKey, issueTypeId });
      await host.ui.toast({ kind: "success", message: `${issue.key} created`, action: { label: "Open", url: issue.url } });
      setSummary("");
      setDescription("");
    } catch (err) {
      fail(err, () => void submit(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="stack pad" onSubmit={submit}>
      <div class="row">
        <span class="muted small">{props.creds.email} · {props.creds.site.replace("https://", "")}</span>
        <button type="button" class="link" onClick={props.onDisconnect}>Disconnect</button>
      </div>
      {projects === null && !error ? <p class="muted">Loading projects…</p> : null}
      {projects ? (
        <label>
          Project
          <input value={filter} onInput={(e) => setFilter(e.currentTarget.value)} placeholder="Filter projects" />
          <select value={projectKey} onChange={(e) => setProjectKey(e.currentTarget.value)} size={Math.min(6, Math.max(2, shown.length))}>
            {shown.map((p) => <option key={p.key} value={p.key}>{p.key} — {p.name}</option>)}
          </select>
        </label>
      ) : null}
      <label>
        Type
        <select value={issueTypeId} onChange={(e) => setIssueTypeId(e.currentTarget.value)}>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label>Summary<input value={summary} maxLength={255} onInput={(e) => setSummary(e.currentTarget.value)} /></label>
      <label>Description<textarea rows={8} value={description} onInput={(e) => setDescription(e.currentTarget.value)} /></label>
      {error ? (
        <div class="error">
          <p>{error.message}</p>
          {error.details.length ? <ul>{error.details.map((d) => <li key={d}>{d}</li>)}</ul> : null}
          {error.retry ? <button type="button" class="link" onClick={error.retry}>Retry</button> : null}
        </div>
      ) : null}
      <button type="submit" class="primary" disabled={busy || !projectKey || !issueTypeId}>{busy ? "Creating…" : "Create issue"}</button>
    </form>
  );
}
