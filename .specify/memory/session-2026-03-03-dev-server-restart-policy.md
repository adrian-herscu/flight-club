# Session Introspection: Dev Server Restart Policy

**Date**: 3 March 2026  
**Session Type**: Workflow Preference / Developer Experience  
**Scope**: Local development runtime behavior

---

## Decision

During local development, **do not restart the dev server after each code change**.

Restart the server **only when required**, such as:
- environment variable changes (`.env.local`, runtime env injection)
- port/process conflicts (`EADDRINUSE`)
- stale runtime state that cannot be recovered with hot reload

---

## Rationale

- Next.js hot reload is sufficient for most UI and route-level changes.
- Avoids unnecessary interruption and lost time.
- Keeps feedback loop faster and more predictable.

---

## Operating Rule for Future Sessions

Default behavior: keep server running and rely on hot reload.

Escalate to restart only if one of the explicit restart conditions is observed.