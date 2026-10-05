import { describe, expect, it, vi } from "vitest";
import { createClient, JiraError, type Fetcher } from "./client";

const creds = { site: "https://acme.atlassian.net", email: "me@acme.com", token: "tok" };
const res = (status: number, body: unknown) => ({ status, headers: {}, body: JSON.stringify(body) });

describe("jira client", () => {
  it("sends Basic auth and JSON headers", async () => {
    const f = vi.fn<Fetcher>(async () => res(200, { displayName: "Me" }));
    await createClient(creds, f).myself();
    const req = f.mock.calls[0][0];
    expect(req.url).toBe("https://acme.atlassian.net/rest/api/3/myself");
    expect(req.headers?.Authorization).toBe(`Basic ${btoa("me@acme.com:tok")}`);
    expect(req.headers?.Accept).toBe("application/json");
  });

  it("pages through projects until isLast", async () => {
    const f = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(res(200, { values: [{ id: "1", key: "A", name: "Alpha" }], isLast: false }))
      .mockResolvedValueOnce(res(200, { values: [{ id: "2", key: "B", name: "Beta" }], isLast: true }));
    const projects = await createClient(creds, f).projects();
    expect(projects.map((p) => p.key)).toEqual(["A", "B"]);
    expect(f.mock.calls[1][0].url).toContain("startAt=50");
  });

  it("drops sub-task issue types and accepts both response shapes", async () => {
    const f = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(res(200, { issueTypes: [{ id: "1", name: "Bug", subtask: false }, { id: "2", name: "Sub-task", subtask: true }] }))
      .mockResolvedValueOnce(res(200, { values: [{ id: "3", name: "Task", subtask: false }] }));
    const c = createClient(creds, f);
    expect((await c.issueTypes("A")).map((t) => t.name)).toEqual(["Bug"]);
    expect((await c.issueTypes("A")).map((t) => t.name)).toEqual(["Task"]);
  });

  it("creates an issue with an ADF description and returns its browse URL", async () => {
    const f = vi.fn<Fetcher>(async () => res(201, { key: "A-12" }));
    const out = await createClient(creds, f).createIssue({ projectKey: "A", issueTypeId: "1", summary: "Crash", description: "boom" });
    expect(out).toEqual({ key: "A-12", url: "https://acme.atlassian.net/browse/A-12" });
    const body = JSON.parse(f.mock.calls[0][0].body!);
    expect(body.fields.project).toEqual({ key: "A" });
    expect(body.fields.issuetype).toEqual({ id: "1" });
    expect(body.fields.description.type).toBe("doc");
  });

  it("omits an empty description", async () => {
    const f = vi.fn<Fetcher>(async () => res(201, { key: "A-1" }));
    await createClient(creds, f).createIssue({ projectKey: "A", issueTypeId: "1", summary: "x", description: " " });
    expect(JSON.parse(f.mock.calls[0][0].body!).fields.description).toBeUndefined();
  });

  it("classifies errors", async () => {
    const auth = createClient(creds, async () => res(401, {}));
    await expect(auth.myself()).rejects.toMatchObject({ kind: "auth" });
    const bad = createClient(creds, async () => res(400, { errorMessages: ["Nope"], errors: { summary: "Too long" } }));
    const err = await bad.createIssue({ projectKey: "A", issueTypeId: "1", summary: "x", description: "" }).catch((e) => e);
    expect(err).toBeInstanceOf(JiraError);
    expect(err.kind).toBe("validation");
    expect(err.details).toEqual(["Nope", "summary: Too long"]);
    const net = createClient(creds, async () => {
      throw Object.assign(new Error("offline"), { code: "network" });
    });
    await expect(net.myself()).rejects.toMatchObject({ kind: "network" });
  });
});
