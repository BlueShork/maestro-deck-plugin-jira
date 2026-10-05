const SUBDOMAIN = /^[a-z0-9][a-z0-9-]*$/;

/** Turn whatever the user pasted into `https://<name>.atlassian.net`. */
export function normalizeSite(input: string): { ok: true; site: string } | { ok: false; error: string } {
  let s = input.trim().toLowerCase();
  if (!s) return { ok: false, error: "Enter your Jira site, e.g. acme.atlassian.net" };
  if (s.startsWith("http://")) return { ok: false, error: "Jira Cloud sites use https://" };
  s = s.replace(/^https:\/\//, "").split(/[/?#]/)[0];
  const host = s.includes(".") ? s : `${s}.atlassian.net`;
  const name = host.endsWith(".atlassian.net") ? host.slice(0, -".atlassian.net".length) : null;
  if (!name || !name.split(".").every((label) => SUBDOMAIN.test(label))) {
    return { ok: false, error: "Only Jira Cloud sites (…atlassian.net) are supported for now" };
  }
  return { ok: true, site: `https://${host}` };
}
