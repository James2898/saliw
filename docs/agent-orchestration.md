# Saliw — Agent Orchestration Guide

This project uses a **global multi-agent workflow** to manage the development lifecycle of the Saliw Music Portal. This guide explains how to interact with the orchestration system.

---

## How It Works

All development tasks—whether adding a new worship song, adjusting transposition logic, or updating the Artisan UI—start with a single command:

```
@project-manager [describe your task here]
```

The Project Manager analyzes the request, assigns a **Tier** based on complexity, and coordinates the specialized global agents. You do not need to invoke specialist agents directly.

---

## Tiers at a Glance

| Tier  | Size   | Description                                                        | Agent Chain                                                              |
| ----- | ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **0** | Small  | UI tweaks, CSS brand adjustments, text fixes                       | explore → code → review → validate                                       |
| **1** | Medium | New components, simple hooks, local state logic                    | explore → clarify → log → code → review → validate                       |
| **2** | Large  | Database schema changes, Supabase SSR, Auth, Complex Transposition | explore → clarify → discover → contract → log → code → review → validate |

---

## Starting a Task

### Example — Tier 0 (UI Tweak)

```
@project-manager
Update the padding on the chord-item span to 4px and change the hover color to a lighter tan.
```

### Example — Tier 1 (Feature)

```
@project-manager
Add a "Copy to Clipboard" button in the Setlist View that copies the lyrics and chords
in a plain text format for printing.
```

### Example — Tier 2 (Infrastructure/Complex Logic)

```
@project-manager
Implement the Supabase Server Action to allow Music Directors to delete an entire setlist.
Ensure the RLS policy only allows a `music_director` to perform this action.
```

---

## Agent Reference

These agents are hosted globally and inherit project context from `CLAUDE.md`.

| Agent Handle           | Role              | Responsibility                                                                |
| ---------------------- | ----------------- | ----------------------------------------------------------------------------- |
| @project-manager       | Router            | Classifies tasks and determines the execution chain.                          |
| @requirements-engineer | Gatekeeper        | Identifies ambiguities in musical logic or access requirements.               |
| @codebase-explorer     | Context Finder    | Locates specific musical utils, brand variables, and SSR boundaries.          |
| @integration-contract  | Bridge            | Maps data between the Next.js frontend and Supabase PostgreSQL tables.        |
| @task-logger           | Scribe            | Generates the `tasks/TASK-NNN.md` file as the source of truth.                |
| @fullstack-developer   | Executor          | Implements logic across Next.js Server/Client components and Supabase.        |
| @release-manager       | QA/Auditor        | Verifies the implementation against the Artisan design and musical standards. |
| @validator-agent       | Security/Refactor | Performs final audits for RLS security, performance, and UI contrast.         |
| @debug-memory          | Learner           | Records root causes for transposition or hydration bugs in `MEMORY.md`.       |

---

## Key Project Documents

Refer to these files in the `docs/` directory to understand the "Saliw Way" of building:

- **`CLAUDE.md`**: The primary entry point and agent configuration.
- **`docs/tech-stack.md`**: Details on Next.js App Router, Supabase SSR, and Tailwind v4.
- **`docs/coding-guidelines.md`**: Essential rules for the Artisan UI and Musical Transposition integrity.
- **`docs/structure.md`**: The roadmap for the `src/app` directory and component placement.
- **`docs/api-discovery.md`**: Protocol for verifying Supabase tables and RLS policies.

---

## Tips for Success

- **Start with @project-manager:** It is the only entry point designed to handle the full workflow.
- **Musical Context:** When describing tasks, mention if they affect the "Original Key" or the "Performance Key."
- **Artisan Palette:** Always reference brand variables (e.g., `--brand-tan`) rather than hex codes in your descriptions.
- **Server vs. Client:** If you know a feature requires high interactivity (like a live tuner or metronome), mention it so the agents prioritize Client Components.
