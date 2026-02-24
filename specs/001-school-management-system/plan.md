# Implementation Plan: School Management System

**Branch**: `001-school-management-system` | **Date**: 24 February 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-school-management-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Multi-tenant SaaS platform for managing paragliding and hang gliding schools. Supports four roles (super-admin, school-admin, instructor, student) authenticated via Google OIDC through Supabase Auth. Core workflows: super-admins define reusable syllabuses; school admins create courses from syllabuses, enroll students, and assign instructors; instructors record evaluations per-lesson; students self-register and track progress. Built as a FastAPI (Python 3.12) + Next.js 14 monorepo deployed on Render + Vercel + Supabase (Tier 0 — free). Full multi-tenant row-level isolation from day 1.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript / Next.js 14 (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy 2 + Alembic, Pydantic v2, Supabase Auth (Google OIDC), Resend (email), httpx, pytest, Playwright
**Storage**: PostgreSQL 16 via Supabase (free tier — 500 MB)
**Testing**: pytest + httpx (backend unit/integration), Playwright (E2E)
**Target Platform**: Render (backend, Tier 0 free), Vercel (frontend, Hobby free), Supabase (DB + Auth), Cloudflare R2 (object storage)
**Project Type**: web-service (monorepo: `backend/` + `frontend/` + `infra/`)
**Performance Goals**: < 3 s page load on mobile (SC-006); email delivery within 5 min (SC-005); auth + dashboard within 30 s (SC-001)
**Constraints**: Tier 0 — fully free hosting; stateless backend (no cookies, no sessions); row-level tenant isolation on every query; no custom password storage; backwards-compatible schema migrations
**Scale/Scope**: Tier 0 proof-of-concept — < 20 concurrent users, < 1 GB DB, single school initially; architecture multi-tenant-ready from day 1 (all tables carry `school_id`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Pre-Design | Post-Design | Notes |
|---|-----------|------------|-------------|-------|
| I | **Domain-First Data Model** — entities reflect paragliding/hang gliding domain; no ambiguous/redundant entities; `school_id` FK on all tenant-scoped entities | ✅ PASS | ✅ PASS | 10 domain entities defined. `school_id` on all tenant-scoped tables. `discipline` field on `School` + `Syllabus` for future general aviation. `Syllabus` is system-global (super-admin owned, no `school_id`) — by design. |
| II | **API-First Design** — versioned REST API with OpenAPI 3.x before any frontend consumption; `request_id` on all responses | ✅ PASS | ✅ PASS | Full `/api/v1/` documented in `contracts/api-v1.md`. `X-Request-ID` middleware. FastAPI auto-generates OpenAPI spec. |
| III | **Test-First Development** — failing tests before implementation; ≥ 80% line coverage on `backend/src/`; `make test` single command | ✅ PASS | ✅ PASS | pytest + Playwright stack. Coverage gate. `make test` entry point documented in quickstart. |
| IV | **Security & Data Privacy** — Supabase Auth + Google OIDC; stateless JWTs; no custom passwords; RBAC via JWT claims + DB table; TLS only | ✅ PASS | ✅ PASS | `UserRole` table + JWT custom claims for RBAC. `admin_notes` hidden from students at API layer. No custom session store. |
| V | **Cost-Conscious Cloud Deployment** — Tier 0: free services only; no paid services without documented cost/benefit | ✅ PASS | ✅ PASS | Vercel Hobby + Render Free + Supabase Free + Cloudflare R2 Free + Resend Free (3k/month). Zero new paid dependencies. |
| VI | **Simplicity & Incremental Delivery** — MVP before enhancement; no premature abstraction; Next.js SSR for primary pages; background jobs only when synchronous inadequate | ✅ PASS | ✅ PASS | Progress computed from aggregates (no denorm table). Syllabus customization via copy-on-create. Async email via `asyncio.gather` at Tier 0 (no queue). Next.js SSR confirmed. |

## Project Structure

### Documentation (this feature)

```text
specs/001-school-management-system/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # SQLAlchemy ORM models (School, User, Syllabus, Course, etc.)
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/        # Business logic (enrollment, scheduling, notifications)
│   ├── api/
│   │   └── v1/          # Versioned FastAPI routers (auth, schools, courses, lessons, etc.)
│   ├── core/            # Config, DB session, JWT middleware, request_id middleware
│   └── main.py
└── tests/
    ├── contract/        # OpenAPI contract validation tests
    ├── integration/     # Multi-entity flows (booking conflicts, RBAC, tenant isolation)
    └── unit/            # Per-service unit tests

frontend/
├── src/
│   ├── app/             # Next.js 14 App Router pages (SSR)
│   │   ├── (auth)/      # Login/logout
│   │   ├── admin/       # School admin dashboard
│   │   ├── instructor/  # Instructor schedule and evaluations
│   │   └── student/     # Student course browser and schedule
│   ├── components/      # Shared UI components (responsive, touch-friendly)
│   └── services/        # API client (fetch wrappers)
└── tests/               # Playwright E2E tests

infra/
├── supabase/            # Supabase CLI migrations and config
├── vercel.json          # Vercel deployment config
└── render.yaml          # Render deployment config
```

**Structure Decision**: Option 2 (Web application) — separate `backend/` and `frontend/` directories within a monorepo, with shared `infra/` and `docs/`. Matches the canonical repository layout from the constitution.

## Complexity Tracking

*No constitution violations requiring justification — all principles pass.*
