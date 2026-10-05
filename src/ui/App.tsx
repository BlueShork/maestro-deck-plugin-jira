import { useEffect, useState } from "preact/hooks";
import type { Credentials } from "../jira/client";
import { host } from "../sdk";
import { ConnectScreen } from "./ConnectScreen";
import { CreateScreen } from "./CreateScreen";

type State = { kind: "loading" } | { kind: "connect"; notice?: string; prefill?: Partial<Credentials> } | { kind: "create"; creds: Credentials };

export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    host.secrets
      .get("credentials")
      .then((raw) => setState(raw ? { kind: "create", creds: JSON.parse(raw) as Credentials } : { kind: "connect" }))
      .catch(() => setState({ kind: "connect", notice: "Could not read saved credentials." }));
  }, []);

  if (state.kind === "loading") return <p class="muted pad">Loading…</p>;
  if (state.kind === "connect") {
    return <ConnectScreen notice={state.notice} prefill={state.prefill} onConnected={(creds) => setState({ kind: "create", creds })} />;
  }
  return (
    <CreateScreen
      creds={state.creds}
      onDisconnect={async () => {
        await host.secrets.delete("credentials");
        setState({ kind: "connect" });
      }}
      onAuthFailed={() =>
        setState({ kind: "connect", notice: "Jira rejected the credentials. Reconnect.", prefill: { site: state.creds.site, email: state.creds.email } })
      }
    />
  );
}
