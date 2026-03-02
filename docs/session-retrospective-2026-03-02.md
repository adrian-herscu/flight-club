# Session Retrospective — 2026-03-02

## Scope

This session validated acceptance scenarios for:

- User Story 1 (Super-admin syllabus lifecycle)
- User Story 2 (Admin course/enrollment/instructor workflow)

## Executive Summary

User Story 1 is now validated end-to-end (API and click-only UI).
User Story 2 was blocked by a critical implementation gap and is now validated after a service-layer fix.

Primary technical outcome:

- Fixed `createCourse()` so course instances are created with copied `course_lessons` from the selected FINAL syllabus.

## What Was Found

### 1) Authorization and RBAC correctness issues (early in validation)

Observed failures were caused by:

- Role lookup assumptions not matching actual `UserRole` model usage
- Incorrect API error constructor usage in middleware

These were corrected before acceptance validation proceeded.

### 2) User Story 1 functional gaps

Gaps discovered and closed:

- School syllabus visibility logic was too narrow
- Final syllabus versioning flow was incomplete
- No endpoint/UI action to create a new draft version from FINAL
- Super-admin dashboard quick actions had non-clickable text
- Course detail page crashed on incorrect response shape assumptions

### 3) User Story 2 critical gap

Acceptance Scenario #1 expected:

- Creating a course from a syllabus produces a course with all syllabus lessons

Actual behavior before fix:

- Course was created, but `course_lessons` remained empty

Root cause:

- `createCourse()` validated FINAL syllabus but did not copy lessons to `course_lessons`

Fix applied:

- Transactional course creation in `src/lib/services/courses.service.ts`
- Query syllabus with ordered template lessons
- `createMany()` into `course_lessons` with mapped title/description/sequence order
- Set valid initial status and non-null `durationHours`
- Return course with included ordered lessons

## Validation Evidence Summary

### User Story 1

- Scenario 1: Create draft syllabus — PASS
- Scenario 2: Edit draft without versioning — PASS
- Scenario 3: Finalize draft to FINAL — PASS
- Scenario 4: Create new draft version from FINAL — PASS
- Scenario 5: School admin sees relevant FINAL syllabuses — PASS
- Scenario 6: Admin can choose among syllabus versions — PASS

### User Story 2

- Scenario 1: Course creation copies lessons from syllabus — PASS (after fix)
- Scenario 2: Enrollment + approval workflow — PASS
- Scenario 3: Instructor assignment — PASS (conflict detection also verified)
- Scenario 4: Course roster visibility — PASS
- Scenario 5: Email notifications — identified as User Story 7 scope (not implemented yet)

## Process Introspection (What We Learned)

1. **Acceptance validation must include UI realism**
   API-only checks are useful but insufficient for workflow acceptance. Click-only navigation surfaced issues API checks did not reveal.

2. **Service-layer invariants are essential**
   Invariant: course creation from syllabus must always materialize `course_lessons`. This must live in the service transaction, not UI assumptions.

3. **Static checks first prevented rework**
   TypeScript checks quickly caught invalid enum/nullable assumptions before runtime verification.

4. **Conflict detection behavior is a feature, not noise**
   Instructor assignment conflicts validated expected scheduling safeguards.

5. **Separate acceptance from adjacent roadmap scope**
   Email notification expectations in US2 were clarified against US7 ownership to avoid false negative validation.

## Documentation / Governance Follow-up Captured in This PR

- Constitution clarified with an acceptance validation protocol under testing methodology.
- Copilot instructions updated with practical acceptance-validation workflow learned here.
- Documentation index updated with this retrospective.

## Open Follow-ups

- Implement User Story 7 email delivery infrastructure and event triggers.
- Add deterministic fixture data for non-conflicting instructor assignment scenarios in integration tests.
- Add regression tests ensuring `createCourse()` always populates `course_lessons`.
