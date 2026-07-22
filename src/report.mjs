function asDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function daysSince(value, now = new Date()) {
  const date = asDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function issueTitle(item) {
  return String(item.title ?? "(untitled)").replace(/\s+/g, " ").trim();
}

function issueUrl(item) {
  return item.html_url ?? "";
}

function sortOldest(items) {
  return [...items].sort((a, b) => {
    const left = asDate(a.updated_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const right = asDate(b.updated_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

export function analyzeSnapshot(snapshot, { now = new Date(), staleDays = 30 } = {}) {
  // GitHub's /issues endpoint includes pull requests. Pulls have their own
  // endpoint here, so remove them before counting or classifying issues.
  const issues = (Array.isArray(snapshot.issues) ? snapshot.issues : [])
    .filter((item) => !item.pull_request);
  const pulls = Array.isArray(snapshot.pulls) ? snapshot.pulls : [];
  const releases = Array.isArray(snapshot.releases) ? snapshot.releases : [];
  const commits = Array.isArray(snapshot.commits) ? snapshot.commits : [];
  const cutoff = new Date(now.getTime() - staleDays * 86_400_000);

  const staleIssues = sortOldest(issues.filter((item) => {
    const updated = asDate(item.updated_at);
    return updated && updated < cutoff;
  }));
  const stalePulls = sortOldest(pulls.filter((item) => {
    const updated = asDate(item.updated_at);
    return updated && updated < cutoff;
  }));

  const latestRelease = releases[0] ?? null;
  const latestCommit = commits[0] ?? null;
  const releaseDate = latestRelease?.published_at ?? latestRelease?.created_at;
  const commitDate = latestCommit?.commit?.author?.date ?? latestCommit?.commit?.committer?.date;
  const releaseAgeDays = daysSince(releaseDate, now);
  const commitAgeDays = daysSince(commitDate, now);

  const signals = [];
  if (stalePulls.length) signals.push({ level: "attention", key: "stale-pulls", count: stalePulls.length });
  if (staleIssues.length) signals.push({ level: "attention", key: "stale-issues", count: staleIssues.length });
  if (releaseAgeDays === null) signals.push({ level: "info", key: "no-release", count: 0 });
  else if (releaseAgeDays > 180) signals.push({ level: "attention", key: "stale-release", count: releaseAgeDays });
  if (commitAgeDays !== null && commitAgeDays > 60) signals.push({ level: "attention", key: "stale-commit", count: commitAgeDays });

  const score = Math.max(
    0,
    100 -
      Math.min(35, stalePulls.length * 10) -
      Math.min(25, staleIssues.length * 5) -
      (releaseAgeDays === null ? 5 : releaseAgeDays > 180 ? 15 : 0) -
      (commitAgeDays !== null && commitAgeDays > 60 ? 15 : 0),
  );

  return {
    repository: snapshot.repository,
    generatedAt: now.toISOString(),
    staleDays,
    score,
    openIssues: issues.length,
    openPulls: pulls.length,
    staleIssues,
    stalePulls,
    latestRelease,
    latestCommit,
    releaseAgeDays,
    commitAgeDays,
    signals,
  };
}

function dateLabel(value) {
  const date = asDate(value);
  return date ? date.toISOString().slice(0, 10) : "—";
}

function link(label, url) {
  return url ? `[${label}](${url})` : label;
}

export function renderMarkdown(report) {
  const name = `${report.repository?.full_name ?? "unknown/unknown"}`;
  const attention = [];
  if (report.stalePulls.length) attention.push(`- **PR:** ${report.stalePulls.length}件が${report.staleDays}日以上更新なし`);
  if (report.staleIssues.length) attention.push(`- **Issue:** ${report.staleIssues.length}件が${report.staleDays}日以上更新なし`);
  if (report.releaseAgeDays === null) attention.push("- **Release:** リリースがまだありません");
  else if (report.releaseAgeDays > 180) attention.push(`- **Release:** 最新リリースから${report.releaseAgeDays}日経過`);
  if (report.commitAgeDays !== null && report.commitAgeDays > 60) attention.push(`- **Commit:** 最新コミットから${report.commitAgeDays}日経過`);

  const staleRows = [
    ...report.stalePulls.map((item) => ["PR", item]),
    ...report.staleIssues.map((item) => ["Issue", item]),
  ].map(([kind, item]) => `| ${kind} | ${link(`#${item.number} ${issueTitle(item)}`, issueUrl(item))} | ${dateLabel(item.updated_at)} |`).join("\n");

  return [
    `# oss-pulse: ${name}`,
    "",
    `保守スコア: **${report.score}/100**　生成日: ${dateLabel(report.generatedAt)}`,
    "",
    "## Snapshot",
    "",
    "| 指標 | 値 |",
    "| --- | ---: |",
    `| Stars | ${report.repository?.stargazers_count ?? "—"} |`,
    `| Forks | ${report.repository?.forks_count ?? "—"} |`,
    `| Open issues sampled | ${report.openIssues} |`,
    `| Open PRs sampled | ${report.openPulls} |`,
    `| Latest release | ${dateLabel(report.latestRelease?.published_at ?? report.latestRelease?.created_at)} |`,
    `| Latest commit | ${dateLabel(report.latestCommit?.commit?.author?.date ?? report.latestCommit?.commit?.committer?.date)} |`,
    "",
    "## Attention",
    "",
    attention.length ? attention.join("\n") : "- 今すぐ対応が必要なシグナルはありません",
    "",
    "## Stale items",
    "",
    staleRows || "該当なし",
    "",
    "---",
    "Generated by [oss-pulse](https://github.com/toki0001/oss-pulse).",
    "",
  ].join("\n");
}

export function renderJson(report) {
  return JSON.stringify(report, null, 2);
}
