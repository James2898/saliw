# CLAUDE.md — Saliw Music Portal

Entry point for Claude Code. Read this fully before taking any action.

---

## Project Overview

**Saliw** (sa·líw) is a professional web-based music portal for worship leaders and musicians. It provides dynamic chord transposition, song-specific performance keys, and setlist management with a premium "Artisan" aesthetic.

- **Frontend:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first configuration)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Hosting:** Vercel
- **Base branch:** develop

---

## Multi-Agent Workflow

Always invoke the Project Manager first:

@project-manager [your task description here]

The PM classifies tasks by tier and routes to specialist agents. Do not invoke a specialist directly unless the PM has already handed off to it.

| Tier | Size   | Full Path                                                                                                                                                          |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | Small  | @project-manager → @codebase-explorer → @fullstack-developer → @release-manager → @validator-agent                                                                 |
| 1    | Medium | @project-manager → @codebase-explorer → @requirements-engineer → @task-logger → @fullstack-developer → @release-manager → @validator-agent                         |
| 2    | Large  | @project-manager → @codebase-explorer → @requirements-engineer → @integration-contract → @task-logger → @fullstack-developer → @release-manager → @validator-agent |

---

## Agent Registry

All agents are defined globally in ~/.claude/agents/. This repository does not contain project-specific agent overrides.

| Agent Handle           | Role              | Responsibility                                                                                        | Key Output                                |
| ---------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| @project-manager       | Router            | Classifies complexity, determines agent chain, routes tasks.                                          | Handoff Trio (Task ID, Files, Decision)   |
| @requirements-engineer | Gatekeeper        | Identifies ambiguities and missing musical or access control details.                                 | Feature Specification                     |
| @codebase-explorer     | Context Finder    | Scans for reusable patterns (transpose logic, chord regex) and Artisan UI components.                 | Context Bundle (file paths + snippets)    |
| @integration-contract  | Bridge            | Maps FE payloads to Supabase tables; verifies RLS policies and Server Action schemas.                 | Technical Schema (Supabase/Data contract) |
| @task-logger           | Scribe            | Consolidates decisions into a single instruction document.                                            | tasks/TASK-NNN.md                         |
| @fullstack-developer   | Executor          | Implements code; handles Next.js Server Components, Actions, and Supabase client logic.               | Feature Implementation                    |
| @release-manager       | QA/Auditor        | Reviews code against original requirements and musical integrity.                                     | Verification Report + CHANGELOG.md        |
| @debug-memory          | Learner           | Analyzes bug root causes (transposition, SSR hydration, or auth sync issues) and records resolutions. | MEMORY.md                                 |
| @validator-agent       | Security/Refactor | Audits for security (RLS gaps), performance, and artisan architecture cleanliness.                    | Refactor Suggestions + Security Approval  |

---

## Development Workflow

1. Invoke @project-manager with your task description.
2. Follow PM output exactly — do not skip steps.
3. **Branding:** Maintain the Artisan Palette (Cream, Tan, Brown, Espresso). Refer to docs/coding-guidelines.md.
4. **Architecture:** Use Next.js Server Components for data fetching. Use Client Components ('use client') only for interactive musical elements.
5. **Data:** All database interactions must respect Supabase RLS. Only users with the `music_director` role can edit/create.
6. **Musical Logic:** Musical transposition must remain song-specific within a setlist using performanceKey logic.
7. Post-implementation: @release-manager reviews against requirements and updates CHANGELOG.md.
8. Post-implementation: @validator-agent audits for RLS security and UI contrast.
9. On bug resolution: @debug-memory records root cause and fix in MEMORY.md.
