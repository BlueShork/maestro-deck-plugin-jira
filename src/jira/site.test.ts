import { describe, expect, it } from "vitest";
import { normalizeSite } from "./site";

describe("normalizeSite", () => {
  it("accepts the common shapes", () => {
    for (const input of ["acme", "acme.atlassian.net", "https://acme.atlassian.net", "https://acme.atlassian.net/jira/software/projects", " ACME.atlassian.net/ "]) {
      expect(normalizeSite(input)).toEqual({ ok: true, site: "https://acme.atlassian.net" });
    }
  });
  it("rejects non-Cloud or malformed sites", () => {
    expect(normalizeSite("").ok).toBe(false);
    expect(normalizeSite("jira.acme.com").ok).toBe(false);
    expect(normalizeSite("http://acme.atlassian.net").ok).toBe(false);
    expect(normalizeSite("acme.atlassian.net.evil.com").ok).toBe(false);
    expect(normalizeSite("ac me").ok).toBe(false);
  });
});
