import { useState } from "preact/hooks";
import { createClient, JiraError, type Credentials } from "../jira/client";
import { normalizeSite } from "../jira/site";
import { host } from "../sdk";

const TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";

export function ConnectScreen(props: { notice?: string; prefill?: Partial<Credentials>; onConnected: (c: Credentials) => void }) {
  const [site, setSite] = useState(props.prefill?.site?.replace(/^https:\/\//, "") ?? "");
  const [email, setEmail] = useState(props.prefill?.email ?? "");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect(e: Event) {
    e.preventDefault();
    setError(null);
    const norm = normalizeSite(site);
    if (!norm.ok) return setError(norm.error);
    if (!email.trim() || !token.trim()) return setError("Email and API token are required.");
    const creds = { site: norm.site, email: email.trim(), token: token.trim() };
    setBusy(true);
    try {
      const me = await createClient(creds, host.http.fetch).myself();
      await host.secrets.set("credentials", JSON.stringify(creds));
      void host.ui.toast({ kind: "success", message: `Connected to Jira as ${me.displayName}` });
      props.onConnected(creds);
    } catch (err) {
      setError(err instanceof JiraError && err.kind === "auth" ? "Wrong email or API token." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="stack pad" onSubmit={connect}>
      <h1>Connect to Jira</h1>
      {props.notice ? <p class="banner">{props.notice}</p> : null}
      <label>Site<input value={site} onInput={(e) => setSite(e.currentTarget.value)} placeholder="acme.atlassian.net" autoFocus /></label>
      <label>Email<input type="email" value={email} onInput={(e) => setEmail(e.currentTarget.value)} placeholder="you@company.com" /></label>
      <label>
        API token
        <input type="password" value={token} onInput={(e) => setToken(e.currentTarget.value)} />
      </label>
      <button type="button" class="link" onClick={() => void host.ui.openExternal(TOKEN_URL)}>Create an API token ↗</button>
      {error ? <p class="error">{error}</p> : null}
      <button type="submit" class="primary" disabled={busy}>{busy ? "Connecting…" : "Connect"}</button>
    </form>
  );
}
