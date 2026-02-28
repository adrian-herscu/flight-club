# Implementation Plan: School Management System

**Branch**: `001-school-management-system` | **Date**: 24 February 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-school-management-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Multi-tenant SaaS platform for managing paragliding and hang gliding schools. Supports four roles (super-admin, school-admin, instructor, student) authenticated via Google OIDC through Supabase Auth. Core workflows: super-admins define reusable syllabuses; school admins create courses from syllabuses, enroll students, and assign instructors; instructors record evaluations per-lesson; students self-register and track progress. Built as a unified Next.js 14 full-stack application (TypeScript) deployed on Vercel + Supabase (Tier 0 — free). Full multi-tenant row-level isolation from day 1.

## Technical Context

**Language/Version**: TypeScript, Node.js 20 LTS runtime
**Primary Dependencies**: 
- Full-Stack: Next.js 14, React 18, Prisma ORM 5, Zod, Supabase Auth (Google OIDC), Resend (email), jose (JWT), Vitest, Playwright
**Storage**: PostgreSQL 16 via Supabase (free tier — 500 MB)
**Testing**: Vitest (unit, contract, integration), Playwright (E2E)
**Target Platform**: Vercel (full-stack hosting, Hobby free), Supabase (DB + Auth)
**Project Type**: web-application (unified Next.js full-stack at root)
**Performance Goals**: < 3 s page load on mobile (SC-006); email delivery within 5 min (SC-005); auth + dashboard within 30 s (SC-001)
**Constraints**: Tier 0 — fully free hosting; stateless backend (no cookies, no sessions); row-level tenant isolation on every query; no custom password storage; backwards-compatible schema migrations
**Scale/Scope**: Tier 0 proof-of-concept — < 20 concurrent users, < 1 GB DB, single school initially; architecture multi-tenant-ready from day 1 (all tables carry `school_id`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Pre-Design | Post-Design | Notes |
|---|-----------|------------|-------------|-------|
| I | **Domain-First Data Model** — entities reflect paragliding/hang gliding domain; no ambiguous/redundant entities; `school_id` FK on all tenant-scoped entities | ✅ PASS | ✅ PASS | 10 domain entities defined. `school_id` on all tenant-scoped tables. `discipline` field on `School` + `Syllabus` for future general aviation. `Syllabus` is system-global (super-admin owned, no `school_id`) — by design. |
| II | **API-First Design** — versioned REST API with OpenAPI 3.x before any frontend consumption; `request_id` on all responses | ✅ PASS | ✅ PASS | Full `/api/v1/` documented in `contracts/api-v1.md`. `X-Request-ID` middleware. Next.js API routes with Zod validation. |
| III | **Test-First Development** — failing tests before implementation; ≥ 80% line coverage on `src/`; `npm test` single command | ✅ PASS | ✅ PASS | Vitest stack. Coverage gate (80% threshold enforced). `npm test` entry point. |
| IV | **Security & Data Privacy** — Supabase Auth + Google OIDC; stateless JWTs; no custom passwords; RBAC via JWT claims + DB table; TLS only | ✅ PASS | ✅ PASS | `UserRole` table + JWT custom claims for RBAC. `admin_notes` hidden from students at API layer. No custom session store. |
| V | **Cost-Conscious Cloud Deployment** — Tier 0: free services only; no paid services without documented cost/benefit | ✅ PASS | ✅ PASS | Vercel Hobby + Supabase Free + Cloudflare R2 Free + Resend Free (3k/month). Zero new paid dependencies. |
| VI | **Simplicity & Incremental Delivery** — MVP before enhancement; no premature abstraction; Next.js SSR for primary pages; background jobs only when synchronous inadequate | ✅ PASS | ✅ PASS | Progress computed from aggregates (no denorm table). Syllabus customization via copy-on-create. Async email via Promise.allSettled at Tier 0 (no queue). Next.js SSR confirmed. |

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
src/
├── app/                  # Next.js 14 App Router (SSR + API routes)
│   ├── (auth)/           # Login/logout pages
│   ├── admin/            # School admin dashboard
│   ├── instructor/       # Instructor schedule and evaluations
│   ├── student/          # Student course browser and schedule
│   └── api/v1/           # REST API routes (49 endpoints)
│       ├── health/
│       ├── me/
│       ├── schools/
│       ├── courses/
│       ├── syllabuses/
│       ├── enrollments/
│       ├── instructors/
│       └── evaluations/
├── lib/
│   ├── middleware/       # Auth, RBAC, error handling, request-id
│   └── services/         # Business logic (7 service files)
├── components/           # Shared UI components (responsive, touch-friendly)
└── services/             # API client (fetch wrappers)

tests/
├── setup.ts              # Test utilities and fixtures
├── sample.test.ts        # Unit tests
├── contract/             # API contract tests
├── integration/          # Full-stack integration tests
└── e2e/                  # Playwright E2E tests

prisma/
└── schema.prisma         # Prisma ORM schema (11 models)
```

**Technology Stack**: 
- **Full-Stack**: Next.js 14 + React 18 + TypeScript 5 + Prisma 5 + Zod 3 + Vitest 1.2.2
- **Database**: PostgreSQL 16 (Supabase)
- **Auth**: jose + Supabase OIDC (Google)

**Structure**: Unified full-stack Next.js application with all code at repository root.

## Complexity Tracking

*No constitution violations requiring justification — all principles pass.*
