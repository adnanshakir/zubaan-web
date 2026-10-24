<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

## Project rules (Zubaan web prototype)

- Read DESIGN.md before any UI work and follow it exactly.
- Never open docs/API_REFERENCE.md. Call the backend only through
  src/lib/api/client.ts and use types from src/lib/api/types.ts. For call
  order, error rules or limits, open docs/api/INDEX.md and read ONLY the one
  file it points to.
- TypeScript strict: no any, no @ts-ignore. Server Components by default;
  "use client" only for state, effects and browser APIs (recording, audio,
  localStorage).
- Run `npm run typecheck` after each major change; lint, format:check and build once
  at the end.
- Do not add dependencies or files outside src/, docs/, scripts/ without asking & Reasoning why should I add the dependency.
- Keep replies short: files changed, and anything you could not do.

<!-- END:nextjs-agent-rules -->
