# Research: School Management System

**Phase**: 0 — Outline & Research  
**Date**: 24 February 2026  
**Feature**: `001-school-management-system`

All technical context fields were fully resolved from the project Constitution (v1.4.0) and spec clarifications. No NEEDS CLARIFICATION items remained after loading those documents. This file documents the key decisions, rationale, and alternatives considered for each design area.

---

## 1. Authentication & Session Management

**Decision**: Supabase Auth with Google OIDC; stateless JWT verification on every FastAPI request; no server-side sessions.

**Rationale**:
- Eliminates password storage, credential rotation, and session-store infrastructure.
- Supabase issues short-lived JWTs (≤ 1 h by default); the FastAPI backend verifies them against Supabase's JWKS endpoint via `python-jose` or `PyJWT` + `cryptography`.
- The `Authorization: Bearer <jwt>` pattern keeps the backend horizontally scalable from day 1.

**Implementation pattern**:
```python
# FastAPI dependency for JWT verification
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserClaims:
    payload = jwt.decode(token, supabase_jwks, algorithms=["RS256"])
    return UserClaims(**payload)
```

**Alternatives considered**:
- Custom JWT + password auth — rejected (password storage risk, maintenance burden).
- Supabase client-side auth only — rejected (server-side verification required for API security).

---

## 2. Multi-Tenant Row-Level Isolation

**Decision**: Application-level row filtering — every query scoped by `school_id` extracted from the authenticated user's JWT claims or `school_member` table. Supabase RLS as a defence-in-depth layer.

**Rationale**:
- Constitution Principle I mandates `school_id` FK on all tenant-scoped tables from day 1.
- Application-level scoping catches errors at development time (unit tests); RLS is a runtime safety net.
- Adding a second tenant later requires zero schema migrations.

**Pattern**: A `TenantScoped` SQLAlchemy mixin emits a `WHERE school_id = :school_id` clause on every query; FastAPI dependencies inject `school_id` from JWT.

**Alternatives considered**:
- Separate DB schemas per tenant — rejected (overkill at Tier 0; schema explosion at scale; Supabase free tier is single-schema).
- Supabase RLS only (no app-layer filtering) — rejected (RLS bypass risk if service-role key is used; harder to unit-test).

---

## 3. Instructor Overbooking Detection

**Decision**: Interval overlap check at the database query level: `(new_start < existing_end) AND (new_end > existing_start)` across all `course_lesson` rows where the instructor is assigned.

**Rationale**:
- Spec clarification: start time + duration model. `existing_end = start_time + duration * interval '1 hour'`.
- A single SQL query (or SQLAlchemy expression) can detect all conflicts before committing the assignment.
- Conflict check also scopes by location per FR-010: "same location" means lessons at different locations don't block.

**SQL pattern**:
```sql
SELECT 1 FROM instructor_assignment ia
JOIN course_lesson cl ON cl.id = ia.course_lesson_id
WHERE ia.instructor_id = :instructor_id
  AND cl.location = :location
  AND cl.start_time < (:new_start + :duration * interval '1 hour')
  AND (cl.start_time + cl.duration_hours * interval '1 hour') > :new_start
LIMIT 1;
```

**Alternatives considered**:
- Application-level Python datetime comparison — acceptable but less efficient; chosen to do it in DB for atomicity.
- Trigger-based constraint — rejected (harder to surface user-friendly error messages; Alembic migration complexity).

---

## 4. Enrollment State Machine

**Decision**: `StudentEnrollment.status` as a PostgreSQL enum with states: `pending_approval → approved → enrolled → completed | rejected | unenrolled | waitlist`.

**Rationale**:
- Spec clarification: explicit admin approval queue; waitlist uses FIFO ordering.
- DB enum prevents invalid state values; Python `enum.Enum` mirrors it for type safety.
- `waitlist_position` integer column (nullable) enables FIFO ordering without a separate table.

**State transitions**:
```
pending_approval  ──(admin approve, capacity available)──► enrolled
pending_approval  ──(admin approve, at capacity)──────────► waitlist
pending_approval  ──(admin reject)────────────────────────► rejected
enrolled          ──(student unenroll / admin remove)──────► unenrolled
waitlist          ──(spot opens)────────────────────────────► enrolled (auto, FIFO)
enrolled          ──(all lessons complete)─────────────────► completed
```

**Alternatives considered**:
- Separate `waitlist` table — rejected (single table with status + position is simpler and sufficient; avoids dual-write).
- Polymorphic status via string column — rejected (no DB-level constraint; risk of invalid values).

---

## 5. Email Notification Strategy

**Decision**: Resend (free tier: 3k/month, 100/day) for all transactional email. Notifications triggered synchronously from FastAPI service methods at Tier 0; APScheduler for retry / scheduled reminders at Tier 1.

**Rationale**:
- Constitution specifies Resend explicitly.
- Synchronous send acceptable at Tier 0 (< 20 users); if Resend API call fails, log and continue (non-blocking via `asyncio.create_task`).
- Triggered events: lesson scheduled → enrolled students; evaluation submitted → student; feedback note saved → student.

**Pattern**:
```python
async def notify_lesson_scheduled(lesson: CourseLesson, students: list[User]):
    await asyncio.gather(*[
        resend.emails.send({"to": s.email, "subject": "...", "html": "..."})
        for s in students
    ], return_exceptions=True)  # don't fail request on email error
```

**Alternatives considered**:
- SendGrid — rejected (Resend is simpler API, better free tier for this scale).
- Supabase Edge Functions for email — rejected (additional runtime to maintain; FastAPI is sufficient).
- Background job queue (Celery/Redis) — deferred to Tier 1 (YAGNI at Tier 0).

---

## 6. Role-Based Access Control (RBAC)

**Decision**: Four roles — `super_admin` (system-wide), `school_admin`, `instructor`, `student` (both school-scoped). Roles stored in `user_role` table and mirrored as a custom claim in Supabase JWT (`app_metadata.roles`).

**Rationale**:
- Spec FR-002 and FR-011 require role-specific UX and permission enforcement.
- Storing roles in JWT custom claims enables zero-DB-query auth checks on hot paths.
- DB-level `user_role` table provides authoritative source for role management (admin can revoke without waiting for JWT expiry — check DB on sensitive mutations).

**FastAPI dependency pattern**:
```python
def require_role(*roles: Role):
    async def dep(user: UserClaims = Depends(get_current_user)):
        if not any(r in user.roles for r in roles):
            raise HTTPException(403)
    return dep
```

**Alternatives considered**:
- Supabase RLS policies for role enforcement — supplementary only; complex to maintain and test.
- Flat `is_admin` boolean — rejected (insufficient for 4-role model).

---

## 7. Course Progress Tracking

**Decision**: Computed from `course_lesson.status` aggregation — no separate `course_progress` table. `CourseLesson.status` enum: `not_started | in_progress | completed`. Course `status` derived: `upcoming` (no lessons started) → `in_progress` (≥ 1 completed) → `completed` (all completed).

**Rationale**:
- Avoids denormalized state that can drift out of sync.
- Progress query is a single `COUNT` aggregate: `SELECT COUNT(*) FILTER (WHERE status='completed') FROM course_lesson WHERE course_id=:id`.

**Alternatives considered**:
- Materialized view for progress — deferred to Tier 1 (YAGNI; query is trivial at this scale).
- Separate `course_progress` table — rejected (denormalization without benefit at this scale).

---

## 8. Syllabus Customization

**Decision**: When a school admin creates a course from a syllabus and selects "customize," the system **copies** lesson definitions into `CourseLesson` rows (which can be freely modified) rather than maintaining a foreign key link to the original `Lesson`. The `source_lesson_id` nullable FK is preserved for traceability.

**Rationale**:
- Spec FR-006: admins can add, remove, or change lessons when creating a course.
- Decoupling course lessons from the syllabus template prevents retroactive changes to the template from breaking existing courses.
- `source_lesson_id` allows future reporting ("which courses derived from syllabus X").

**Alternatives considered**:
- Keep FK to lesson + allow overrides via a delta table — rejected (complex; hard to reason about final state).
- Deep copy with no traceability link — rejected (loses audit trail).

---

## 9. Responsive Frontend Architecture

**Decision**: Next.js 14 App Router with Server Components for primary data-fetching pages (SSR). Tailwind CSS for responsive design. Mobile-first breakpoints: 320px base, md:768px, lg:1280px, xl:1920px.

**Rationale**:
- Constitution mandates Next.js SSR for all primary pages; client-only rendering forbidden for core workflows.
- Instructor mobile use case (at lesson site, outdoors) requires touch-friendly layout and < 3 s load.
- Tailwind utility classes enable rapid responsive iteration without custom CSS.

**Mobile-specific patterns**:
- Instructor evaluation form uses large touch targets (min 44px hit area).
- Student schedule uses card layout on mobile, table layout on desktop.
- Admin dashboard collapses side nav to bottom tab bar on mobile.

**Alternatives considered**:
- React SPA (Vite) — rejected (SSR required by constitution; no Vercel preview env benefit).
- React Native — rejected (spec explicitly states web app, not native mobile).

---

## 10. API Versioning Strategy

**Decision**: `/api/v1/` prefix on all routes from day 1. FastAPI `APIRouter` with `prefix="/api/v1"`. Breaking changes introduce `/api/v2/` with one-release deprecation notice.

**Rationale**:
- Constitution Principle II mandates versioned REST API before frontend consumes it.
- Starting at v1 immediately avoids unversioned tech debt.

**`request_id` implementation**: middleware generates `uuid4` per request, injects into response headers (`X-Request-ID`) and structlog context.

---

## 11. Database Migration Strategy

**Decision**: Alembic for all schema and data migrations; `make migrate` runs in deploy pipeline; manual SQL changes to production are forbidden.

**Key rules** (from constitution):
- All data migrations in versioned Alembic scripts alongside DDL.
- Every data migration idempotent.
- Backfills batched at 500 rows/transaction.
- Seed data (e.g., default roles) via dedicated seed migration, not app startup code.

---

## Summary of All Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Auth | Supabase Auth + Google OIDC; stateless JWT |
| 2 | Multi-tenancy | App-level `school_id` scoping + Supabase RLS |
| 3 | Overbooking | DB interval overlap query |
| 4 | Enrollment | Single table with status enum + FIFO waitlist_position |
| 5 | Email | Resend; async `asyncio.create_task` at Tier 0 |
| 6 | RBAC | 4-role enum; JWT claims + DB `user_role` table |
| 7 | Progress | Computed from `course_lesson.status` aggregate |
| 8 | Syllabus customization | Copy-on-create with nullable `source_lesson_id` |
| 9 | Frontend | Next.js 14 App Router SSR; Tailwind CSS; mobile-first |
| 10 | API versioning | `/api/v1/` from day 1; `X-Request-ID` middleware |
| 11 | Migrations | Alembic only; idempotent; batched backfills |
