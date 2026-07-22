const API_VERSION = "2022-11-28";

export function parseRepository(input) {
  const value = String(input ?? "").trim().replace(/\/$/, "");
  const withoutUrl = value
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, "")
    .replace(/^github\.com\//i, "");
  const match = withoutUrl.match(/^([^/\s]+)\/([^/\s#?]+)$/);

  if (!match || match[1].startsWith(".") || match[2].startsWith(".")) {
    throw new Error(`GitHub repository must look like owner/repo: ${input}`);
  }

  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

export function createGitHubClient({
  fetchImpl = globalThis.fetch,
  token = process.env.GITHUB_TOKEN,
  apiBase = "https://api.github.com",
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("This tool requires Node.js 20+ with global fetch support.");
  }

  async function get(path) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "oss-pulse/0.1.0",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchImpl(`${apiBase}${path}`, { headers });
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body.message ? `: ${body.message}` : "";
      } catch {
        // Keep the status error useful even when GitHub did not return JSON.
      }
      throw new Error(`GitHub API ${response.status} for ${path}${detail}`);
    }
    return response.json();
  }

  return { get };
}

export async function fetchSnapshot(repository, client) {
  const base = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  const [repo, issues, pulls, releases, commits] = await Promise.all([
    client.get(base),
    client.get(`${base}/issues?state=open&per_page=100&sort=updated&direction=desc`),
    client.get(`${base}/pulls?state=open&per_page=100&sort=updated&direction=desc`),
    client.get(`${base}/releases?per_page=10`),
    client.get(`${base}/commits?per_page=1`),
  ]);

  return { repository: repo, issues, pulls, releases, commits };
}
