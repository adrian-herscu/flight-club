# GitHub Copilot Instructions

## Priority Guidelines

When generating code for this repository:

1. **Version Compatibility**: Detect and respect the exact versions of tools, shell environments, and document formats in use
2. **Context Files**: Prioritize patterns defined in `.github/copilot/`, `.github/agents/`, and `.specify/templates/`
3. **Codebase Patterns**: When context files don't provide specific guidance, scan the codebase for established patterns
4. **Architectural Consistency**: Maintain the spec-driven, agent-orchestrated workflow architecture
5. **Code Quality**: Prioritize maintainability, clarity, and consistency with existing patterns in all generated artifacts

---

## Technology Version Detection

Before generating code, scan the codebase to identify:

1. **Shell Environment**: All scripts use `#!/usr/bin/env bash` with `set -e`, `set -u`, and `set -o pipefail`
   - Bash 4+ features are used (associative arrays, `[[ ]]`, `${var:-}` parameter expansion)
   - Never use `sh`-only syntax; always use `bash`-specific constructs matching existing scripts

2. **Markdown Dialect**: GitHub Flavored Markdown (GFM)
   - Agent files use ` ```chatagent ` fenced code blocks for their outer wrapper
   - Prompt files use ` ```prompt ` fenced code blocks
   - YAML frontmatter with `---` delimiters is used in agent and prompt files
   - Callout blocks use GitHub GFM syntax: `> [!CAUTION]`, `> [!IMPORTANT]`, `> [!NOTE]`

3. **YAML Frontmatter**: Used only in `.agent.md` and `.prompt.md` files
   - Never add frontmatter to template files, constitution, or plan/spec/task documents

---

## Context Files

Prioritize the following files in `.github/copilot/` and adjacent directories:

- **`.specify/memory/constitution.md`**: Project governance and core principles; **SUPERSEDES ALL OTHER GUIDANCE** including this file
- **`copilot-instructions.md`** (this file): Code generation standards implementing constitution principles
- **`.specify/templates/`**: Canonical templates for all document types; always match their structure

> [!IMPORTANT]
> The constitution is the single source of truth. When any conflict arises between constitution principles and copilot instructions, **the constitution wins**. Flag the conflict and request clarification rather than proceeding with conflicting guidance.

---

## Project Architecture

This repository is a **Flight Club CRM** — a web-based system for managing
paragliding and hang gliding schools (members, bookings, certifications, instructors).
It uses the **SpecKit** spec-driven workflow for all feature development.

### Application Directory Structure

```text
src/             # Unified Next.js 14 full-stack application
├── app/         # Pages, API routes, components
├── lib/         # Services, middleware, utilities
└── middleware.ts # Auth + RBAC middleware

tests/           # All tests (unit, integration, E2E)
├── contract/    # API route handler tests
├── integration/ # Full-stack API tests
└── e2e/         # End-to-end workflow tests

infra/           # Infrastructure-as-code

docs/            # ADRs, data-model diagrams, API changelog
specs/           # Created at runtime; one subdirectory per feature
docs/            # ADRs, data-model diagrams, API changelog

prisma/          # Database schema and migrations
```

### SpecKit Workflow Directory Structure

```text
.github/
├── agents/          # Agent definition files (*.agent.md)
├── copilot/         # GitHub Copilot context (this file)
└── prompts/         # Prompt shortcut files (*.prompt.md)

.specify/
├── memory/          # Runtime state (constitution.md)
├── scripts/bash/    # Automation scripts
└── templates/       # Canonical document templates

specs/               # Created at runtime; one subdirectory per feature
└── ###-feature-name/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── contracts/
    ├── tasks.md
    └── checklists/
```

### SpecKit Development Pipeline

```
spec → clarify → plan → tasks → implement → analyze
```

### Agent File Locations

| Agent | Path |
|-------|------|
| GitHub Copilot context | `.github/copilot/copilot-instructions.md` |
| Agent definitions | `.github/agents/speckit.*.agent.md` |
| Prompt shortcuts | `.github/prompts/speckit.*.prompt.md` |

---

## Codebase Scanning Instructions

When context files don't provide specific guidance:

1. Identify similar files to the one being modified or created
2. Analyze patterns for:
   - Naming conventions (see Agent & File Naming below)
   - Script argument parsing style
   - Output formatting (JSON vs. human-readable)
   - Error handling and message routing
   - Documentation style and callout usage
3. Follow the most consistent patterns found in the codebase
4. Never introduce patterns not found in the existing codebase

---

## Code Quality Standards

### Maintainability

- Write self-documenting code with clear naming matching existing conventions
- Keep functions focused on single responsibilities, matching the size and scope of functions in `common.sh`
- Limit function complexity; use helper functions and meaningful variable names
- Follow the established organization: utility functions before business logic

### Security

- Route all error messages to `stderr` — never to `stdout`
- Never log or expose secrets; handle sensitive data with `${VAR:-}` safe defaults
- Validate all inputs before use; prefer early-return error guards (matching existing scripts)
- Use `set -e`, `set -u`, `set -o pipefail` in all bash scripts

### Testability

- Scripts must accept `--help` and produce clean usage output (matching existing scripts)
- Use `--json` flag for machine-parseable output (matches `check-prerequisites.sh`, `create-new-feature.sh`, etc.)
- Keep side effects isolated so scripts can be audited with `--paths-only` or dry-run modes

---

## Documentation Requirements

### For Agent Files (`.agent.md`)

- Follow the exact format found in `.github/agents/speckit.*.agent.md`:
  - Outer `chatagent` fenced code block
  - YAML frontmatter with `description`, optional `handoffs`, optional `tools`
  - `## User Input` section with `$ARGUMENTS` block
  - `## Outline` section with numbered execution steps
  - `> [!CAUTION]` or `> [!IMPORTANT]` callouts for non-negotiable constraints
- Handoff entries follow this exact structure:
  ```yaml
  handoffs:
    - label: Human-readable label
      agent: speckit.target-agent
      prompt: Pre-filled message for the target agent
      send: true  # omit if not auto-sending
  ```

### For Prompt Files (`.prompt.md`)

- Follow the exact format found in `.github/prompts/speckit.*.prompt.md`:
  - Outer `prompt` fenced code block
  - YAML frontmatter with `agent: speckit.<name>`
  - No body content beyond the frontmatter (prompts are thin wrappers for agents)

### For Template Files (`.specify/templates/`)

- Use `[ALL_CAPS_IDENTIFIER]` placeholder tokens for every field requiring substitution
- Include HTML comments (`<!-- ... -->`) explaining each section's purpose and providing examples
- Wrap the entire template in a Markdown fenced code block labeled `markdown` or ` ```markdown `
- Match the section hierarchy, heading levels, and comment style of existing templates

### For Bash Scripts (`.specify/scripts/bash/`)

- Begin every script with the standard header block:
  ```bash
  #!/usr/bin/env bash
  # Brief one-line description
  #
  # MAIN FUNCTIONS:
  # 1. ...
  #
  # Usage: ./script-name.sh [OPTIONS]
  # OPTIONS:
  #   --json   Output in JSON format
  #   --help   Show help
  ```
- Source `common.sh` for shared functions; call `get_feature_paths` and `check_feature_branch` at startup
- Use `log_info`, `log_success`, and `log_error` helpers (defined in `common.sh`) for output

### For Specification Documents (`specs/*/`)

- Follow the exact section structure from `.specify/templates/spec-template.md`, `plan-template.md`, `tasks-template.md`, and `checklist-template.md`
- Never add sections not present in the template
- Replace all `[PLACEHOLDER]` tokens before writing final output
- Do not leave unexplained bracket tokens in delivered documents

---

## Testing Approach

### Script Validation

- All scripts handle the `--help` flag and print clear usage instructions
- All scripts support `--json` output mode where applicable for automated parsing
- Scripts use `eval $(get_feature_paths)` to reliably resolve paths regardless of working directory

### Agent Workflow Validation

- Agent files contain explicit `Abort`/`ERROR` conditions with clear recovery instructions
- Checklists (`.specify/templates/checklist-template.md` format) serve as "unit tests for requirements" — they validate the quality of spec documents, not implementation correctness
- Analyze phase (`speckit.analyze`) is read-only; never modify documents during analysis

### UI & Refactor Validation

- For broad, cross-cutting changes that affect many routes (e.g., global CSS
  consolidation, shared middleware/hooks, layout shell changes), static checks
  (`npm run build`, type-checking) are **necessary but not sufficient**.
- After static checks pass, always:
  - Start a fresh dev server (kill old processes, clear `.next`/`.turbo` if errors
    appear inconsistent with current source).
  - Perform a minimal runtime smoke pass: use dev login, then navigate to at least
    one primary page for each affected role (Admin, Instructor, Student, Super Admin).
- Do not mark cross-cutting refactor tasks as done until this smoke pass succeeds
  without runtime errors in the browser console.

---

## Technology-Specific Guidelines


### TypeScript / Next.js (unified full-stack)
  scripts alongside the DDL, never in ad-hoc scripts. Every data migration MUST
- Target **TypeScript 5.x**; use strict mode throughout.
- **Code Validation**: After generating TypeScript code, validate compilation by running
  `npm run build` or `npx tsc --noEmit`. Never commit code that fails type checking.
  Fix all type errors before presenting code to the user.
- All API route handlers in `src/app/api/v1/` MUST be `async` functions.
- Zod schemas for all request/response validation; use `.parse()` for validation.
- Every API response MUST include `request_id` in the envelope (see Principle II).
- Business logic lives in `src/lib/services/`; route handlers in `src/app/api/v1/`
  are thin — no logic beyond input validation and service delegation.
- All tenant-scoped DB queries MUST filter by `school_id` (see Principle I).
- JWT verification uses `jose` library with Supabase's public JWKS endpoint; never hardcode keys.
- Supabase service-role key is server-side only (in `.env.local`); never expose to frontend.
- **Error Handling**:
  - **Database Errors**: Never wrap Prisma calls in try/catch. Global middleware in
    `src/lib/prisma.ts` handles error mapping (P2002 → CONFLICT, P2003/P2025 → NOT_FOUND, P2004 → CONFLICT).
  - **Null Checks**: Use `requireNotNull<T>(value, message)` from `src/lib/require-not-null.ts`
    for business logic presence validation. **Always assign the return value** to achieve type narrowing:
    ```typescript
    const userRaw = await prisma.user.findUnique({ where: { id } });
    const user = requireNotNull(userRaw, "User not found");
    // 'user' is now type-narrowed to non-null; TypeScript allows safe access to properties
    ```
  - **Route Handlers**: Delegate error handling to error middleware; never catch errors
    in route logic unless performing explicit fallback/recovery.
- **Logging**: use structured logging with JSON output to `stdout`. Every log record
  related to a request MUST include `request_id`. Use log levels: `debug` for internal
  state, `info` for normal operations, `warn` for recoverable issues, `error` for exceptions.
  Never log PII (email, name, ID numbers) at `debug`/`info` level.
- **Migrations**: all schema and data changes use Prisma migrations.
  Data migrations (backfills, reshaping, seed data) generated via `npx prisma migrate`.
  be idempotent. Backfills MUST process rows in batches (≤ 500 rows/transaction)
  to avoid table locks. Tenant CSV onboarding is an API feature, not a migration.
- Follow `backend/src/` naming: `snake_case` modules, `PascalCase` models,
  `snake_case` functions.

### Next.js / React (frontend)

- Target **Next.js 14** with the App Router; use Server Components by default.
- Client Components (`'use client'`) only when interactivity or browser APIs
  are strictly required (see Principle VI — no premature client-side rendering).
- Auth state comes from Supabase Auth client (`@supabase/ssr`); never store
  tokens in `localStorage` — use the Supabase cookie helper.
- API calls to the Next.js API backend include `Authorization: Bearer <jwt>` header;
  never call the backend from Server Components without the user's token.
- Tailwind CSS for styling; no CSS-in-JS libraries.
- In this codebase, styling is currently implemented via a consolidated global CSS
  file (`src/app/globals.css`) with shared utility classes migrated from legacy CSS
  modules and inline styles. Treat edits to `globals.css` and other cross-cutting
  styling changes as **high-risk refactors**:
  - Prefer working feature-by-feature (e.g., admin, student, instructor) instead of
    editing every page at once.
  - After significant CSS/layout changes, always run the dev server and perform a
    quick runtime smoke pass (dev login + navigation to key dashboards) before
    declaring the work complete.
- Follow `frontend/src/` naming: `PascalCase` components, `camelCase` hooks
  prefixed `use`, `camelCase` utility functions.

### Testing

- **Backend**: Vitest for API route testing; run with `npm test`.
  Coverage gate: ≥ 80% line coverage on `backend/src/` enforced in CI.
  Integration tests MUST cover booking conflicts, certificate expiry, and RBAC.
- **Frontend / E2E**: Playwright; smoke suite runs on every PR via GitHub Actions.
- Tests are written **before** implementation (Red-Green-Refactor — see Principle III).
  No PR merges without prior failing tests.
- **Dev Mode Authentication**: The `/api/v1/me` endpoint and auth middleware (`src/lib/middleware/auth.ts`)
  accept `Authorization: Bearer dev-mode-local-testing-token` when `NODE_ENV === "development"`.
  Contract tests MUST use this exact token value. Optional headers (`x-dev-user-email`,
  `x-dev-user-name`, `x-dev-user-role`) override mock user attributes. In production,
  dev token is rejected with HTTP 401. See `AUTH_SETUP.md` Part 5 and `TESTING.md`
  Authentication section for complete usage.
- **Acceptance Validation Workflow** (when validating spec scenarios):
  1. Run an API/data pass first (endpoint behavior + database invariants).
  2. Run a click-only UI pass second (links/buttons/forms only; no URL shortcutting).
  3. Report outcomes per scenario as `PASS` / `FAIL` / `BLOCKED` with explicit evidence.
  4. Separate true implementation defects from UX/navigation workflow defects.

### Secrets & Environment

- Frontend secrets: Vercel environment variables only.
- Backend secrets: Render environment variables only.
- Supabase service-role key: backend Render env var; never in frontend or git.
- Local development: `.env.local` (git-ignored); never commit `.env` files.

### Bash Scripting

- Use `#!/usr/bin/env bash` (not `#!/bin/bash`) to ensure portability
- Parse arguments with a `while` / `case` loop (matching `create-new-feature.sh`) for multi-value flags; use a `for` loop (matching `check-prerequisites.sh`) for single-value flags
- Output JSON using `printf '{"key":"%s"}\n'` — never use external tools like `jq` for generation
- Use `$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)` for reliable script-relative paths
- All user-facing error messages include a remediation instruction (e.g., "Run /speckit.specify first")
- Quote all variable expansions: `"$VAR"` not `$VAR`; use `[[ ]]` not `[ ]` for conditionals
- Use `${var:-default}` for safe optional variable access

### Markdown / Agent Files

- Use `#### ` (4th-level headings) for sub-steps within agent outline sections
- Code blocks within agents use the language identifier appropriate to the content (bash, text, markdown, json, yaml)
- Variable references in agent instructions use `ALL_CAPS` naming consistent with the `$ARGUMENTS` convention
- File path references use absolute paths constructed from `REPO_ROOT` / `FEATURE_DIR` variables
- Short-circuit conditions are written as: `If empty: ERROR "message"` — not as code, but as plain instruction prose

### Document Templates

- Placeholder tokens: `[FEATURE_NAME]`, `[DATE]`, `[SECTION_NAME]` — always `ALL_CAPS_WITH_UNDERSCORES`
- Section markers for manual additions use HTML comment delimiters:
  `<!-- MANUAL ADDITIONS START -->` / `<!-- MANUAL ADDITIONS END -->`
- Templates are wrapped in a Markdown fenced block (` ```markdown `) so they render safely when previewed

---

## Naming Conventions

### Files and Directories

| Artifact | Pattern | Example |
|----------|---------|---------|
| Agent definition | `speckit.<name>.agent.md` | `speckit.plan.agent.md` |
| Prompt shortcut | `speckit.<name>.prompt.md` | `speckit.plan.prompt.md` |
| Feature branch | `###-short-name` | `001-user-auth` |
| Feature directory | `specs/###-short-name/` | `specs/001-user-auth/` |
| Checklist file | `<domain>.md` | `ux.md`, `security.md` |
| Bash script | `kebab-case.sh` | `create-new-feature.sh` |

### Document IDs

| Type | Pattern | Example |
|------|---------|---------|
| Task | `T###` | `T001`, `T042` |
| Checklist item | `CHK###` | `CHK001`, `CHK012` |
| Functional requirement | `FR-###` | `FR-001` |
| Success criterion | `SC-###` | `SC-001` |
| User story phase label | `[US#]` | `[US1]`, `[US3]` |

### Bash Variables

- Script-local constants: `ALL_CAPS` (e.g., `REPO_ROOT`, `FEATURE_DIR`, `JSON_MODE`)
- Loop variables: `lowercase` (e.g., `dir`, `arg`, `branch`)
- Function names: `snake_case` (e.g., `get_repo_root`, `check_feature_branch`)

---

## Version Control Guidelines

- Feature branches follow the `###-short-name` convention enforced by `check_feature_branch` in `common.sh`
- Branch numbers are always 3-digit zero-padded (`001`, `042`) derived from scanning all existing branches and spec directories
- Commit messages reference the affected agent, template, or script: `docs: update speckit.plan agent outline`
- The constitution version uses Semantic Versioning: MAJOR for principle removals/redefinitions, MINOR for additions, PATCH for clarifications

---

## General Best Practices

- **Constitution First**: Always scan `.specify/memory/constitution.md` before generating any workflow artifact — constitution principles are non-negotiable and supersede all other guidance
- **Principle Traceability**: When implementing patterns, cite which constitution principle they derive from (e.g., "Per Principle III, tests must be written before implementation")
- Match the prose style of surrounding agent steps: imperative verbs, numbered lists, inline code for paths and commands
- When generating task lists, organize by user story (Phase per story) so each story is independently testable
- Parallel tasks use the `[P]` marker; tasks with story affinity use the `[US#]` marker
- Never introduce patterns from external best-practice guides that conflict with existing codebase patterns or constitution principles
- When a template placeholder (`[PLACEHOLDER]`) is intentionally deferred, add a `TODO(<FIELD>): reason` comment and include it in any sync impact report

---

## Project-Specific Guidance

- **Constitution is law**: `.specify/memory/constitution.md` supersedes all other practices; flag conflicts rather than silently diluting principles
- **Spec-first**: No implementation tasks are generated without a completed and validated `spec.md` and `plan.md`
- **Read-only analysis**: The `speckit.analyze` agent MUST NOT modify any file; analysis is always a separate, explicit step from remediation
- **Agent context is auto-maintained**: `.specify/scripts/bash/update-agent-context.sh copilot` updates `.github/copilot/copilot-instructions.md` after each plan phase; do not manually edit that file
- **Template integrity**: Templates in `.specify/templates/` are the canonical source of truth for document structure; generated documents must not add or remove sections
- **Script idempotency**: Scripts are designed to be run multiple times safely; always check for existing files/branches before creating them
- **JSON machine interface**: All scripts that produce structured output support `--json` for consumption by agent workflows; preserve this contract when extending scripts
