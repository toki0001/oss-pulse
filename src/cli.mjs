#!/usr/bin/env node

import { createGitHubClient, fetchSnapshot, parseRepository } from "./github.mjs";
import { analyzeSnapshot, renderJson, renderMarkdown } from "./report.mjs";

function usage() {
  return `Usage: oss-pulse <owner/repo|GitHub URL> [options]

Options:
  --json             Output machine-readable JSON
  --days <number>    Stale threshold in days (default: 30)
  --token <token>    GitHub token (or set GITHUB_TOKEN)
  --help             Show this help

Examples:
  npx oss-pulse toki0001/My-firstCompany
  GITHUB_TOKEN=... npx oss-pulse vercel/next.js --days 14 --json`;
}

function parseArgs(argv) {
  const options = { days: 30, json: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--days") options.days = Number(argv[++index]);
    else if (arg === "--token") options.token = argv[++index];
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (!options.help && positional.length !== 1) throw new Error("Pass exactly one GitHub repository.");
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 3650) {
    throw new Error("--days must be an integer from 1 to 3650.");
  }
  return { ...options, repository: positional[0] };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    process.exit(0);
  }
  const repository = parseRepository(options.repository);
  const client = createGitHubClient({ token: options.token });
  const snapshot = await fetchSnapshot(repository, client);
  const report = analyzeSnapshot(snapshot, { staleDays: options.days });
  console.log(options.json ? renderJson(report) : renderMarkdown(report));
} catch (error) {
  console.error(`oss-pulse: ${error.message}`);
  process.exitCode = 1;
}
