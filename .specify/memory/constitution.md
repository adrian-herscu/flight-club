<!--
SYNC IMPACT REPORT
==================
Version change: 1.4.0 → 1.4.1
Modified principles: none
Added guidance:
  - NEW Principle V: "Test Infrastructure & Development Methodology" — ERROR vs
    FAILURE doctrine, fixture architecture (dedicated clients + factories), fixture
    dependency graphs, static analysis before dynamic testing (Pylance first),
    model truth principle, TDD phases with success criteria.
  - Development Workflow: added step 2 (Pylance check) to local development cycle.
  - Principles V–VII renumbered (Cloud Deployment now VI, Technology Stack now VII).
  - .github/copilot/copilot-instructions.md ✅ — test infrastructure guidance
    added to Python/FastAPI section.
Removed: N/A
Templates checked:
  - .specify/templates/plan-template.md ✅ — no structural change needed
  - .specify/templates/spec-template.md ✅ — no structural change needed
  - .specify/templates/tasks-template.md ✅ — no structural change needed
  - .specify/templates/commands/*.md ⚠ PENDING — directory does not exist in repo
Follow-up TODOs: none
-->

# Flight Club CRM Constitution

## Core Principles

### I. Domain-First Data Model

The data model MUST reflect the target sport-aviation domain precisely before any
UI or API layer is designed.

**Current focus — paragliding and hang gliding schools (school management feature).**
Core entities for this feature (001-school-management-system):
School, User, UserRole, Syllabus, Lesson, Course, CourseLesson, StudentEnrollment,
InstructorAssignment, StudentLessonEvaluation.
No feature may introduce an entity whose domain meaning is ambiguous or redundant.

**Note on core entities**: Different features may define different core entities based
on their domain focus. This feature prioritizes training program management (syllabuses,
courses, evaluations); future features (e.g., tandem bookings, maintenance) may
introduce Pilot, Glider, FlightBooking, RatingCertificate, Endorsement if their specs
ratify them. Entities MUST NOT be duplicated across features; if a future feature
needs an overlapping entity, architecture refactoring will be prioritized.

**Planned future entities** (not yet in scope; reserve namespace only):
Equipment (harnesses, reserves, instruments), SupplyOrder, RepairOrder,
RepairTechnician. These MUST NOT be implemented until a dedicated feature spec
is ratified.

**Planned future expansion**: general aviation (powered aircraft) schools. The
data model MUST NOT hard-code paragliding-specific assumptions in shared
infrastructure; use a `discipline` field on School and sport-specific sub-models
where terminology diverges.

- All entities MUST have clear ownership semantics (who can create/mutate/delete).
- Schema migrations MUST be backwards-compatible unless a MAJOR version bump is
  declared and a migration plan is documented.
- All tenant-scoped entities MUST carry a `school_id` foreign key from day 1,
  even while the system is deployed for a single school.
- Domain terminology MUST follow the relevant governing body: FAI (Fédération
  Aéronautique Internationale), USHPA, BHPA, or the national authority of the
  deployed school (e.g. "P2 rating", "tandem endorsement", "SIV course").

**Rationale**: Paragliding/hang gliding schools have specific rating systems and
safety protocols distinct from powered aviation. Conflating them causes scheduling
errors and certification record failures.

### II. API-First Design

Every unit of business logic MUST be reachable via a versioned REST API documented
with OpenAPI 3.x before any frontend or automation consumes it.

- Endpoints MUST follow REST conventions: nouns for resources, HTTP verbs for
  actions, status codes per RFC 9110.
- Breaking changes to any public endpoint require a new `/vN/` path prefix and a
  deprecation notice of at least one release cycle.
- All responses MUST include a `request_id` field for end-to-end traceability.

**Rationale**: An API-first approach decouples the web frontend from business
logic, enabling future mobile apps, instructor portals, or third-party integrations
without rework.

### III. Test-First Development (NON-NEGOTIABLE)

Tests are written and reviewed **before** implementation begins. No pull request
introducing business logic will be merged without prior failing tests.

- Red-Green-Refactor cycle is strictly enforced for all domain services.
- Coverage gate: ≥ 80% line coverage on `backend/src/` at merge time.
- Integration tests MUST cover at minimum: booking conflict detection, certificate
  expiry checks, and role-based access control enforcement.
- Tests MUST be runnable with a single command (`make test`) in CI and locally.

**Rationale**: Booking and compliance errors in a flight school have real safety
consequences; catching them via automated tests before production is non-negotiable.

### IV. Security & Data Privacy

The system handles sensitive PII (pilot licences, medical certificates, logbook
data). Security controls are mandatory, not optional.

- **Authentication**: delegated entirely to **Supabase Auth** with **Google OIDC**
  as the identity provider. No custom password storage or session management.
  Users authenticate via Google; Supabase issues short-lived JWTs (default ≤ 1h)
  that the FastAPI backend verifies against Supabase's public JWKS endpoint.
- **No server-side sessions**: the system is stateless. Every API request MUST
  carry an `Authorization: Bearer <jwt>` header. No cookies, no session store.
- **Authorisation**: role-based access control with four roles (`super_admin`,
  `school_admin`, `instructor`, `student`), stored as a custom claim in the JWT
  and mirrored in the `UserRole` table. Privilege escalation requires explicit
  admin approval recorded in the audit log.
- Data at rest MUST be encrypted (managed by Supabase / cloud provider).
- Data in transit MUST use TLS 1.2+; HTTP is forbidden in production.
- Certificate and medical document uploads MUST be stored in private Cloudflare R2
  buckets (never publicly accessible URLs without signed, expiring tokens).
- Payment data MUST NOT be stored on application servers; tokenisation is handled
  by Stripe / PayPal client-side SDKs only.
- GDPR-compliant data deletion MUST be implementable on member request.

**Rationale**: Delegating auth to Supabase + Google eliminates password management,
credential storage risk, and custom token rotation logic. Stateless JWTs keep
the backend horizontally scalable from day 1 with zero session-store infrastructure.

### V. Test Infrastructure & Development Methodology

Test failures have two orthogonal classes with fundamentally different meanings.
Confusing them causes wasted debugging time and false confidence in incorrect code.

**ERROR (Test Infrastructure Broken)**
- Cause: missing fixtures, import errors, type mismatches, conflicting mocks
- Impact: blocks all progress on that test file
- Resolution: fix before running any implementation code
- Example: `ModuleNotFoundError: No module named 'backend'` or `TypeError: 'school_id' unexpected`
- Gate: **ZERO ERROR tests allowed before implementation phase begins**

**FAILURE (Missing Implementation)**
- Cause: endpoint not implemented, business logic missing, assertion on unimplemented feature
- Impact: test runs, code executes, result doesn't match expectation
- Resolution: implement the missing feature
- Example: `AssertionError: 422 != 201` (endpoint returns Unprocessable Entity instead of created)
- Gate: FAILURE tests are **expected** and drive development; TDD promises them

**Fixture Architecture**: FastAPI's `app.dependency_overrides` is a global singleton,
not request-scoped. Multiple concurrent fixtures overwriting the same override cause
conflicts. Solution: two-tier fixture design.

*Tier 1 — Dedicated client fixtures* for single-user tests (90% of cases):
```python
@pytest_asyncio.fixture
async def admin_client(db: AsyncSession, admin_user: User) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db
    async def override_get_current_user() -> User:
        return admin_user
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
```

*Tier 2 — Factory fixtures* with async context managers for multi-user workflows:
```python
@pytest_asyncio.fixture
async def client_factory(db: AsyncSession) -> Callable:
    async def create_client(user: User) -> AsyncGenerator[AsyncClient, None]:
        async def override_get_current_user() -> User:
            return user
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
        app.dependency_overrides.clear()
    
    return create_client

# Usage in test:
async with client_factory(admin_user) as admin_client:
    response = await admin_client.post(...)
async with client_factory(student_user) as student_client:
    response = await student_client.post(...)
```

**Fixture Dependency Graph**: Design fixtures explicitly with clear ownership.
Example for multi-tenant tests:
```
db (session)
├── test_school (school 1)
│   ├── admin_user → admin_client
│   ├── student_user → student_client
│   └── test_course
├── school_b (school 2)
│   ├── school_b_admin → school_b_admin_client
│   ├── school_b_student → school_b_student_client
│   └── school_b_course
├── super_admin_user (no school) → super_admin_client
└── test_syllabus (global)
```

**Model Truth Principle**: Tests are subordinate to the data model, not vice versa.
- All assertions about structure (columns, relationships, type constraints) MUST
  reflect the actual models in `src/models/`.
- When a test assumes a field name or type that doesn't exist, the test is wrong,
  not the model.
- Example: if `Course.name` exists but test uses `Course.title`, the test MUST
  be fixed immediately.

**Static Analysis Before Dynamic Testing**: Pylance/Pyright catch structural errors
(imports, types, unexpected attributes) in 0.1s; pytest takes 1.6s and obscures
the root cause in a runtime stack trace.

Workflow:
1. Edit files
2. Run `pylance check src/ tests/` (0.1s) — catches import errors, type mismatches, invalid kwargs
3. Fix all reported issues
4. Run `pytest tests/` (1.6s) — verifies behavior and integration
5. Commit

Skipping step 2 guarantees multiple pytest iterations per issue.

**TDD Phases** (strictly sequential):
- **Phase 1**: Contracts written; tests exist in `tests/contract/` with failing assertions
- **Phase 2**: Test infrastructure to 0 ERRORs; all fixtures created and valid
- **Phase 3**: Implement features until tests pass
- **Phase 4**: Refactor and polish

Success criterion for each phase:
- Phase 1: Contracts reviewed and approved
- Phase 2: **Zero ERROR tests**; FAILURE tests expected
- Phase 3: Failing tests become passing as endpoints are implemented
- Phase 4: Refactoring doesn't introduce new FIALUREs

Do **not** skip Phase 2. Do **not** mix Phase 2 and Phase 3. Do **not** run tests
without Pylance check first.

**Rationale**: Test infrastructure failures and implementation failures require
different debugging mindsets. Confusing them leads to chasing phantom bugs in test
code while the real issue (fixture conflict or import typo) remains hidden.
Stateless fixture designs with explicit dependency graphs prevent conflicts entirely.
Static analysis saves 85% of iteration cycles on structural issues.

### VI. Cost-Conscious Cloud Deployment

Infrastructure choices MUST maximise value for money. Managed complexity is
acceptable only when it replaces disproportionate operational burden.

**Tier 0 — proof-of-concept (current)**: single school, < 20 concurrent users,
< 1 GB data, no long-term persistence guarantee. Target cost: **$0/month**.

| Service | Provider | Plan |
|---|---|---|
| Frontend | Vercel | Free (Hobby) — GitHub push-to-deploy |
| Backend API | Render | Free — spins down after 15 min inactivity (acceptable for demos) |
| Database + Auth | Supabase | Free — 500 MB DB, Google OIDC built-in |
| Object storage | Cloudflare R2 | Free tier (10 GB storage, zero egress) |
| Email | Resend | Free (3k emails/month, 100/day) |
| CI/CD | GitHub Actions | Free for public repos |

**Tier 1 — first paying school**: keep Vercel + Supabase + Cloudflare R2;
upgrade Render to **Starter ($7/month)** to eliminate cold starts; critical for
reliable payment webhooks.

**Tier 2 — multi-school / sustained traffic**: migrate backend to **Railway Pro**
or **DigitalOcean App Platform**; upgrade Supabase to Pro ($25/month) for
daily backups and no pause-on-inactivity.

**Tier 3 — enterprise / multi-region**: AWS ECS Fargate + RDS Aurora, only if
SLA or data-residency requirements demand it.

**Future multi-tenant architecture**: the system is envisioned to serve multiple
schools as separate tenants. Infrastructure MUST NOT be designed in ways that
prevent eventual multi-tenant operation:
- All tenant-scoped database tables MUST include a `school_id` FK from day 1
  (see Principle I).
- Application-level tenant isolation (row-level filtering) MUST be implemented
  even in single-tenant mode, so that adding a second tenant requires no schema
  migration.

- No paid third-party service MUST be introduced without a documented cost/benefit
  note in the relevant feature spec.
- Infrastructure-as-code (Vercel `vercel.json`, Render `render.yaml`, Supabase
  migrations) MUST be committed to `infra/`.

**Rationale**: The prototype is shown to a single friend; spending money now is
waste. The tiered path ensures each upgrade is triggered by real demand, not
anticipation.

### VI. Simplicity & Incremental Delivery

Features are built in the smallest independently deployable slices. Complexity
MUST be justified; YAGNI applies everywhere.

- Each feature MUST ship as a working MVP before enhancement work begins.
- No premature abstraction: generalise only after the third concrete use-case.
- Background jobs and queues are permitted only when synchronous alternatives
  are provably inadequate.
- The web frontend MUST use Next.js server-side rendering for all primary pages;
  client-side-only rendering is forbidden for core workflows.

**Rationale**: Over-engineering flight-school software has historically delayed
projects by months; shipping a simple, working tool delivers real value early.

## Technology Stack & Architecture

The following choices are **canonical** for this project. Deviations require an
amendment to this section with documented justification.

| Layer | Choice | Rationale |
|---|---|---|
| Backend language | Python 3.12 | Rich aviation/data libraries, fast development cycle |
| API framework | FastAPI | Async-native, auto-OpenAPI docs, Pydantic validation |
| Frontend | Next.js 14 (React) | SSR, excellent DX, Vercel push-to-deploy |
| Database | PostgreSQL 16 via Supabase | Managed, free tier, built-in auth |
| ORM / migrations | SQLAlchemy 2 + Alembic | Mature, async-compatible, strong migration support |
| Auth | Supabase Auth (Google OIDC) | Zero config Google login; JWKS JWT verification; no sessions |
| Object storage | Cloudflare R2 | Zero egress fees; S3-compatible `boto3` SDK |
| Email | Resend | 3k/month free; single API call; excellent deliverability |
| Frontend hosting | Vercel | Free Hobby; GitHub push-to-deploy; preview environments |
| Backend hosting | Render | Free tier (Tier 0); Starter $7/mo (Tier 1+) |
| CI/CD | GitHub Actions | Free for public repos; deploys to Vercel + Render on merge |
| Backend tests | pytest + httpx | Standard, well-documented async test support |
| E2E tests | Playwright | Cross-browser; integrates with GitHub Actions |
| Logging (Tier 0) | Render / Supabase / Vercel dashboards | Built-in, zero setup, free |
| Logging (Tier 1+) | Betterstack Logtail or Axiom | Structured search, free tier available |

**Current scale assumptions** (proof-of-concept / Tier 0):
< 20 concurrent users · < 1 GB database · single school tenant · fully free hosting.

**External integration extensibility**: the stack imposes no restrictions on
integrating third-party services. The FastAPI backend is a stateless HTTP
process with no vendor SDK lock-in; any external API is reachable via standard
async `httpx` calls. Inbound webhooks are plain HTTP POST endpoints. The only
operational constraint is the Render free-tier cold start for inbound webhooks
(resolved at Tier 1 — see Principle V). Scheduled polling tasks use APScheduler
(Tier 0) or Supabase pg_cron (Tier 1+).

**Observability & Logging**

All application logs MUST be structured JSON emitted to `stdout`/`stderr`.
Every log entry that relates to an API request MUST include the `request_id`
field (see Principle II) to enable cross-service correlation.

*Backend (FastAPI / Render)*: Python `logging` module configured with a JSON
formatter; Render captures `stdout`/`stderr` and exposes them in the Render
dashboard (7-day retention on free tier; live-tail available). No log agent to
install.

*Database & Auth (Supabase)*: Supabase Logs Explorer provides pre-categorised
views — API, Auth, Postgres, Storage — each filterable by `request_id`,
status code, and time range. Free tier retains 1 day; Pro retains 7 days.

*Frontend (Next.js / Vercel)*: Vercel Functions tab captures server-side logs
per invocation. Free tier retains 1 hour (Pro: 1 day). Client-side JS errors
are NOT captured — add **Sentry** (free tier) at Tier 1 for real-user monitoring.

*Structured log search (Tier 1+)*: pipe Render log drain to **Betterstack
Logtail** or **Axiom** (both free up to generous limits) for full-text search,
alerting, and retention beyond platform defaults.

*Standard debugging workflow*:
1. Identify approximate time and affected user from the report.
2. Supabase Auth logs → locate the session → copy `request_id`.
3. Render logs → filter by `request_id` → read FastAPI exception + stack trace.
4. Supabase Postgres logs → find the failing query → identify constraint or
   timeout.
5. Vercel logs → confirm what the frontend sent and received.

*Tier 0 caveat*: Render free instances pause after 15 min of inactivity; wake
the instance by hitting the app URL before attempting to reproduce an issue
and live-tail logs.

**Planned future modules** (not yet in scope; require separate feature specs):
- *Payments*: Stripe (credit/debit cards) + PayPal; client-side tokenisation
  (PCI SAQ-A); webhook receiver on Render Starter or Vercel API route.
- *Messaging notifications*: Telegram Bot API first (free, long-polling avoids
  cold-start issues); WhatsApp Business API when going to market.
- *Email notifications*: Resend for all transactional email (bookings, reminders,
  certificate expiry); Supabase SMTP settings used for auth emails.
- *Weather alerts & forecasts*: OpenMeteo / aviationweather.gov (METAR, TAF,
  NOTAMs) / Windy API / meteoblue for paragliding-specific forecasts (thermals,
  wind gradient, XC suitability); scheduled daily briefings and threshold-based
  push alerts to instructors.
- *Social media integration*: post flight achievements, course completions, and
  school announcements to Instagram / Facebook / X via their REST APIs; inbound
  social webhooks (comments, enquiries) routed to CRM member records.
- *Equipment catalogue & ordering*: gliders, harnesses, reserves, instruments;
  supplier management; purchase orders.
- *Repair workflow*: repair requests, technician assignments, parts tracking,
  return-to-service sign-off.

**Repository layout** (monorepo):

```text
backend/    # FastAPI application (src/, tests/)
frontend/   # Next.js application (src/, tests/)
infra/      # Vercel vercel.json, Render render.yaml, Supabase CLI migrations
docs/       # ADRs, data-model diagrams, API changelog
```

## Development Workflow

- **Branching**: `main` is always deployable. Feature branches named
  `###-short-description` (e.g. `001-member-registration`).
- **Pull requests**: MUST reference a spec (`specs/###-*/spec.md`).
  MUST include a filled Constitution Check section in the linked plan.
- **Local development cycle**:
  1. Edit Python/TypeScript files
  2. Run `pylance check src/ tests/` (static analysis, 0.1s)
  3. Fix all reported import errors, type mismatches, unexpected attributes
  4. Run `pytest tests/` or `npm test` (dynamic testing, 1.6–10s)
  5. Fix failing tests by implementing features (Phase 3) or fixtures (Phase 2)
  6. Commit once all checks pass
  
  Skipping step 2 guarantees multiple pytest iterations on the same structural issue.
- **CI gates** (ALL MUST pass before merge):
  1. `make lint` — ruff + mypy (backend), ESLint (frontend).
  2. `make test` — pytest coverage ≥ 80%, Playwright smoke suite.
  3. `make build` — production build succeeds without warnings.
- **Deployment**: Vercel auto-deploys `main` (frontend) and Render auto-deploys
  `main` (backend) on every push via GitHub integration. Feature branches deploy
  to Vercel preview environments automatically.
- **Database & Data Migrations**: all schema and data changes are managed through
  the same versioned pipeline — Alembic for backend models, Supabase CLI for
  Supabase-managed objects. Both run via `make migrate` in the deploy pipeline.
  Manual SQL changes to production are forbidden.

  *Schema migrations (DDL)*: column additions, table renames, index changes.
  MUST be backwards-compatible (see Principle I) unless a MAJOR version bump is
  declared with a documented migration plan.

  *Data migrations (DML)*: row backfills, data reshaping, reference/seed data
  loading, destructive cleanups. Rules:
  - MUST live in versioned Alembic migration scripts alongside the DDL that
    necessitates them — never in ad-hoc scripts or applied out-of-band.
  - Every data migration MUST be **idempotent**: safe to run multiple times
    without producing duplicate or inconsistent results.
  - Backfills on existing rows MUST be **batched** (e.g. process 500 rows per
    transaction) to avoid long table locks, even while the dataset is small.
  - Reference / seed data (FAI rating levels, country codes, glider
    manufacturers) MUST be loaded via a dedicated seed migration, not hardcoded
    in application logic.
  - Tenant CSV / spreadsheet onboarding (importing an existing school's members,
    aircraft, log records) is an **application feature** implemented through the
    API — not a database migration.
- **Secrets**: stored exclusively in Vercel environment variables (frontend) and
  Render environment variables (backend). Supabase service-role key MUST only be
  held server-side (never exposed to the browser). Nothing secret is ever
  committed to the repository.

## Governance

This Constitution supersedes all other development practices and documentation.
Any practice conflicting with it MUST be updated to conform within the same PR
that introduces the conflict.

- **Amendments**: Proposed via pull request modifying this file. MUST be reviewed
  by at least one other contributor before merging. Version MUST be bumped per the
  versioning policy below.
- **Versioning policy**:
  - MAJOR — principle removed, redefined, or governance fundamentally restructured.
  - MINOR — new principle or section added; material guidance expansion.
  - PATCH — clarifications, wording improvements, typo fixes.
- **Compliance review**: Every feature plan MUST include a completed "Constitution
  Check" gate (see `plan-template.md`). Reviewers MUST reject any plan that
  bypasses a principle without explicit, documented justification.
- **Complexity justification**: Any deviation from Principle VI (Simplicity) MUST
  be recorded in the plan's "Complexity Tracking" section with measurable
  justification.

**Version**: 1.4.1 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-27
