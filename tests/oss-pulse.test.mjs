import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubClient, parseRepository } from "../src/github.mjs";
import { analyzeSnapshot, renderMarkdown } from "../src/report.mjs";

const now = new Date("2026-07-22T00:00:00.000Z");

test("parses repository shorthand and URL", () => {
  assert.deepEqual(parseRepository("toki0001/oss-pulse"), { owner: "toki0001", repo: "oss-pulse" });
  assert.deepEqual(parseRepository("https://github.com/toki0001/oss-pulse.git"), { owner: "toki0001", repo: "oss-pulse" });
  assert.throws(() => parseRepository("not-a-repository"), /owner\/repo/);
});

test("classifies stale pull requests and issues", () => {
  const report = analyzeSnapshot({
    repository: { full_name: "acme/widget", stargazers_count: 10, forks_count: 2 },
    issues: [
      { number: 1, title: "Old issue", updated_at: "2026-06-01T00:00:00Z", html_url: "https://github.com/acme/widget/issues/1" },
      { number: 2, title: "Fresh issue", updated_at: "2026-07-20T00:00:00Z", html_url: "https://github.com/acme/widget/issues/2" },
      { number: 3, title: "PR from issues endpoint", pull_request: { url: "https://api.github.com/repos/acme/widget/pulls/3" }, updated_at: "2026-06-01T00:00:00Z" },
    ],
    pulls: [
      { number: 3, title: "Old PR", updated_at: "2026-06-10T00:00:00Z", html_url: "https://github.com/acme/widget/pull/3" },
    ],
    releases: [{ tag_name: "v1.0.0", published_at: "2026-07-01T00:00:00Z" }],
    commits: [{ commit: { author: { date: "2026-07-21T00:00:00Z" } } }],
  }, { now, staleDays: 30 });

  assert.equal(report.openIssues, 2);
  assert.equal(report.openPulls, 1);
  assert.equal(report.staleIssues.length, 1);
  assert.equal(report.stalePulls.length, 1);
  assert.equal(report.releaseAgeDays, 21);
  assert.match(renderMarkdown(report), /Old PR/);
  assert.match(renderMarkdown(report), /Old issue/);
});

test("GitHub client sends auth and gives useful API errors", async () => {
  const calls = [];
  const client = createGitHubClient({
    token: "secret-token",
    apiBase: "https://example.test",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: false, status: 403, json: async () => ({ message: "rate limit exceeded" }) };
    },
  });

  await assert.rejects(client.get("/repos/acme/widget"), /GitHub API 403.*rate limit exceeded/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer secret-token");
  assert.equal(calls[0].init.headers["X-GitHub-Api-Version"], "2022-11-28");
});
