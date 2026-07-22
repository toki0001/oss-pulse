# Contributing to oss-pulse

Thanks for helping make repository maintenance easier.

## Before you start

- Use Node.js 20 or newer.
- Search existing issues before opening a new one.
- Keep proposals focused on maintenance reporting for public GitHub repositories.
- Never include GitHub tokens, private repository data, or other secrets in an issue.

## Local development

```bash
git clone https://github.com/toki0001/oss-pulse.git
cd oss-pulse
npm test
node src/cli.mjs octocat/Hello-World
```

The project intentionally has no runtime dependencies, so there is no install step.

## Pull requests

1. Open an issue for behavior changes or larger features.
2. Create a focused branch and keep unrelated changes out of the pull request.
3. Add or update tests when behavior changes.
4. Run `npm test` before submitting.
5. Explain what changed and include a sample command or output when useful.

Small documentation fixes may be submitted without a prior issue.
