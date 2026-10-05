import type { host } from "../sdk";
import { textToAdf } from "./adf";

export interface Credentials { site: string; email: string; token: string }
export interface Project { id: string; key: string; name: string }
export interface IssueType { id: string; name: string; iconUrl?: string }
export type Fetcher = typeof host.http.fetch;

export class JiraError extends Error {
  constructor(
    public readonly kind: "auth" | "validation" | "network" | "other",
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

const MAX_PROJECTS = 500;

export function createClient(creds: Credentials, fetcher: Fetcher) {
  const headers = {
    Authorization: `Basic ${btoa(`${creds.email}:${creds.token}`)}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res;
    try {
      res = await fetcher({ url: `${creds.site}${path}`, method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (err) {
      const code = (err as { code?: string }).code;
      const kind = code === "network" || code === "timeout" ? "network" : "other";
      throw new JiraError(kind, kind === "network" ? "Could not reach Jira. Check your connection." : String((err as Error).message));
    }
    const data = res.body ? safeJson(res.body) : null;
    if (res.status === 401 || res.status === 403) throw new JiraError("auth", "Jira rejected the credentials.");
    if (res.status === 400) {
      const d = (data ?? {}) as { errorMessages?: string[]; errors?: Record<string, string> };
      const details = [...(d.errorMessages ?? []), ...Object.entries(d.errors ?? {}).map(([k, v]) => `${k}: ${v}`)];
      throw new JiraError("validation", "Jira refused the issue.", details);
    }
    if (res.status < 200 || res.status >= 300) throw new JiraError("other", `Jira answered HTTP ${res.status}.`);
    return data as T;
  }

  return {
    myself: () => request<{ displayName: string }>("GET", "/rest/api/3/myself"),

    async projects(): Promise<Project[]> {
      const out: Project[] = [];
      for (let startAt = 0; out.length < MAX_PROJECTS; startAt += 50) {
        const page = await request<{ values: Project[]; isLast?: boolean }>(
          "GET",
          `/rest/api/3/project/search?startAt=${startAt}&maxResults=50&orderBy=name`,
        );
        out.push(...page.values.map(({ id, key, name }) => ({ id, key, name })));
        if (page.isLast !== false || page.values.length === 0) break;
      }
      return out;
    },

    async issueTypes(projectKey: string): Promise<IssueType[]> {
      const data = await request<{ issueTypes?: (IssueType & { subtask?: boolean })[]; values?: (IssueType & { subtask?: boolean })[] }>(
        "GET",
        `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`,
      );
      return (data.issueTypes ?? data.values ?? []).filter((t) => !t.subtask).map(({ id, name, iconUrl }) => ({ id, name, iconUrl }));
    },

    async createIssue(input: { projectKey: string; issueTypeId: string; summary: string; description: string }) {
      const fields: Record<string, unknown> = {
        project: { key: input.projectKey },
        issuetype: { id: input.issueTypeId },
        summary: input.summary.trim(),
      };
      const description = textToAdf(input.description);
      if (description) fields.description = description;
      const created = await request<{ key: string }>("POST", "/rest/api/3/issue", { fields });
      return { key: created.key, url: `${creds.site}/browse/${created.key}` };
    },
  };
}

function safeJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
