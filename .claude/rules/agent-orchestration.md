# Agent Routing Rules

These rules are auto-loaded alongside CLAUDE.md and apply to every session. They cover failure modes and process guards for the multi-agent workflow.

---

## PM Must Not Implement

The `@project-manager` is a router, not an implementer. It must never:

- Write, edit, or create any code or implementation files
- Perform the work of a specialist agent inline
- Skip using the `Agent` tool to delegate to the next agent in the chain

Every agent in the tier chain **must** be invoked via the `Agent` tool. The user invokes `@project-manager` once — the PM orchestrates the full chain automatically without requiring the user to call each agent manually.

If the PM produces anything other than the Handoff Trio and an `Agent` tool call, it has overstepped its role.

---

## Missing Agent Files

If an agent in the Agent Registry has Status = **Placeholder** (its `.md` file does not exist yet), **stop and tell the user** rather than inferring or inventing its behavior. Do not guess what the agent would do.

## Skip Logic Guard

You may only skip an agent if the user explicitly approves it in the task prompt.

- **Never skip `@task-logger`** for Tier 1 or Tier 2 tasks without explicit user approval.
- **Never skip `@integration-contract`** for Tier 2 tasks without explicit user approval.

## Token Discipline

Keep agent handoffs token-light. Pass the **Handoff Trio** only:

- Task ID (or "pending")
- Relevant file paths (specific, not vague)
- Last decision (one sentence)

Do not re-summarize the full conversation history in each handoff.

## Gap-Handling Default

When a backend endpoint is marked `MISSING`:

- Disable the relevant UI controls.
- Show an explanatory hint to the user (not a silent failure).
- Never silently mock an endpoint or fabricate a response without logging it in the integration contract doc.

**All-MISSING escalation:** If `@integration-contract` marks 50% or more of the required endpoints as `MISSING`, do not proceed to `@task-logger`. Stop and notify the user with the full list of missing endpoints and ask whether to: (a) proceed with fully disabled UI, (b) request backend work first, or (c) reduce scope.

## Post-Validation Loop (BLOCKED verdict)

When `@validator-agent` issues a **BLOCKED** verdict, the orchestration must not stop. The PM must automatically continue the chain:

1. Invoke `@fullstack-developer` with the blocker list from the validator report as the task input.
2. After `@fullstack-developer` completes, invoke `@validator-agent` again for a re-audit.
3. Repeat until `@validator-agent` issues **APPROVED** or **APPROVED WITH CONDITIONS**.
4. Only surface to the user if:
   - The same blocker reappears after 2 fix attempts (likely a design conflict — needs human decision)
   - `@fullstack-developer` cannot resolve a blocker without architectural changes outside the current task scope

Do not ask the user to trigger the fix loop manually — it runs automatically as part of the chain.

---

## Requirements Blocking Questions

When `@requirements-engineer` surfaces an Open Question it cannot resolve from context:

1. It must pause the chain and notify the user explicitly with the blocking question(s).
2. The PM resumes the chain only after the user provides answers.
3. `@requirements-engineer` re-runs with the answers and produces the Feature Specification.
4. Do not proceed to `@task-logger` until the Feature Specification has no Open Questions remaining.

---

## Release Manager Retry Limit

When `@release-manager` sends NEEDS CHANGES back to `@fullstack-developer`:

1. Track the retry count per failing criterion.
2. If the same criterion FAILs twice in a row after fixes, stop and surface to the user — do not loop again.
3. Include: the criterion text, both fix attempts, and why they are still failing.

---

## Ambiguous Requests

If a request is ambiguous, route through `@project-manager` → `@requirements-engineer`. Do not guess intent.

## Unknown Tech Stack

If the tech stack for a given layer is still TBD, do not assume a framework or library. Check `docs/tech-stack.md` first, then ask the user or route through `@requirements-engineer`.
