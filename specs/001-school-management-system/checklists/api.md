# API & Data Model Requirements Checklist: School Management System

**Purpose**: Thorough gate review of API contract and data model requirements quality before coding begins
**Created**: 24 February 2026
**Audience**: Spec author — for revision
**Feature**: [spec.md](../spec.md) | [data-model.md](../data-model.md) | [contracts/api-v1.md](../contracts/api-v1.md)

---

## Data Model — Completeness

- [ ] CHK001 - Are requirements defined for how a course-level instructor assignment (`course_lesson_id IS NULL`) applies to lessons added to the course *after* the assignment is created — are new lessons automatically covered? [Completeness, Gap — data-model.md §InstructorAssignment]
- [ ] CHK002 - Is the lifecycle of `StudentLessonEvaluation` row creation specified — specifically who creates the row (instructor on first edit, system on lesson start, or admin on enrollment) and whether a `result = NULL` stub row is expected before any notes are written? [Completeness, Gap — data-model.md §StudentLessonEvaluation]
- [ ] CHK003 - Are uniqueness requirements for `InstructorAssignment` defined for the case where `course_lesson_id IS NULL` (course-level), preventing the same instructor being assigned to the same course multiple times at that level? [Completeness, Gap — data-model.md §InstructorAssignment]
- [ ] CHK004 - Is "similar course" defined for the waitlist auto-enrollment trigger in FR-025 — what criteria (same syllabus, same school, same discipline, overlapping dates) qualify a newly created course as "similar"? [Completeness, Gap — spec.md §FR-025, data-model.md §StudentEnrollment]
- [ ] CHK005 - Are data retention and visibility requirements defined for `StudentLessonEvaluation` records when a student unenrolls from a partially completed course — are completed evaluations retained or deleted? [Completeness, Gap — data-model.md §StudentEnrollment, §StudentLessonEvaluation]

---

## Data Model — Clarity

- [ ] CHK006 - Is "structural edit" defined to clarify which types of changes to a `Syllabus` increment `version` (e.g., adding a lesson vs. changing a description vs. reordering lessons)? [Clarity, Ambiguity — data-model.md §Syllabus]
- [ ] CHK007 - Is the overbooking check behavior specified for `CourseLesson` rows where `start_time IS NULL` — are unscheduled lessons skipped, treated as always-conflicting, or blocked from instructor assignment entirely? [Clarity, Ambiguity — data-model.md §CourseLesson, spec.md §FR-010]
- [ ] CHK008 - Is it specified whether `cancelled` `CourseLesson` rows count toward — or block — the condition that triggers `Course.status → completed`? [Clarity, Ambiguity — data-model.md §State Transitions]
- [ ] CHK009 - Is the `CourseLesson.status → in_progress` transition defined as a manual instructor action or an automatic system trigger (e.g., when current time passes `start_time`)? [Clarity, Ambiguity — data-model.md §CourseLesson]
- [ ] CHK010 - Is the impact of editing a `Syllabus` (via `PUT`) on derived `CourseLesson` records in already-created courses specified — are existing course lessons unaffected, updated, or flagged as diverged? [Clarity, Ambiguity — data-model.md §Syllabus, §CourseLesson, contracts/api-v1.md §Syllabuses]

---

## Data Model — Consistency

- [ ] CHK011 - Is the `StudentEnrollment.status = 'approved'` enum value reconciled with the state machine diagram, which shows `pending_approval` transitioning directly to `enrolled` or `waitlist` with no `approved` intermediate state? [Consistency, Conflict — data-model.md §StudentEnrollment]
- [ ] CHK012 - Is the uniqueness of `CourseLesson.sequence_order` within a course defined as a constraint, given that `PATCH /courses/{course_id}/lessons/{lesson_id}` allows updating `sequence_order` and could create duplicates? [Consistency, Gap — data-model.md §CourseLesson, contracts/api-v1.md §Course Lessons]
- [ ] CHK013 - Is the `UserRole` validation rule (`super_admin` iff `school_id IS NULL`) consistently enforced across the `POST /schools/{school_id}/members` endpoint, which assigns roles within a school? [Consistency — data-model.md §Validation Rules, contracts/api-v1.md §School Members]

---

## API Contract — Completeness

- [ ] CHK014 - Is there an API endpoint for students to browse available (not-yet-enrolled) courses within their school — `GET /schools/{school_id}/courses` is scoped to enrolled courses for students, leaving no discovery path? [Completeness, Gap — contracts/api-v1.md §Courses, spec.md §US-3]
- [ ] CHK015 - Is the first-login user provisioning flow defined in the API contract — specifically whether `GET /api/v1/me` upserts the user record or whether a dedicated endpoint handles initial profile creation from the Supabase Auth JWT? [Completeness, Gap — contracts/api-v1.md §Auth, plan.md §Technical Context]
- [ ] CHK016 - Are pagination response metadata requirements specified (total item count, current page, page size, has_next indicator) for all endpoints with `page`/`page_size` query params? [Completeness, Gap — contracts/api-v1.md]
- [ ] CHK017 - Is there an API endpoint for a student to view their complete evaluation and progress history across all enrolled courses (a transcript or progress summary)? [Completeness, Gap — contracts/api-v1.md]
- [ ] CHK018 - Are individual lesson management endpoints defined for `Syllabus` (add, remove, reorder a single lesson without replacing the entire syllabus via `PUT`)? [Completeness, Gap — contracts/api-v1.md §Syllabuses]
- [ ] CHK019 - Are requirements defined for what happens to enrolled students and instructor assignments when a course is cancelled — specifically whether cancellation triggers email notifications to students and instructors? [Completeness, Gap — contracts/api-v1.md §Courses, spec.md §Edge Cases]
- [ ] CHK020 - Is the structure of the `error.details` field specified for validation error responses (400/422) — field names, error codes, and format — to enable consistent client-side error display? [Completeness, Gap — contracts/api-v1.md §Standard Response Envelope]
- [ ] CHK021 - Is there a dedicated API endpoint or filter for a school admin to retrieve only `pending_approval` enrollments as an approval queue, separate from the full enrollment list? [Completeness, Gap — contracts/api-v1.md §Enrollments, spec.md §FR-007]

---

## API Contract — Clarity

- [ ] CHK022 - Is the behavior of `GET /api/v1/syllabuses` specified separately for super-admins vs. school admins — specifically whether super-admins can retrieve inactive (`is_active = false`) syllabuses while school admins see only active ones? [Clarity, Ambiguity — contracts/api-v1.md §Syllabuses, data-model.md §Syllabus]
- [ ] CHK023 - Is the cross-school data exposure defined for `GET /api/v1/instructors/{instructor_id}/schedule` when a `school_admin` requests the schedule of an instructor who holds roles at multiple schools — does the response include lessons from other schools? [Clarity, Ambiguity — contracts/api-v1.md §Instructor Assignments, spec.md §FR-003]
- [ ] CHK024 - Is the student visibility of `result` (PASS/FAIL) in `StudentLessonEvaluation` specified independently from `feedback_notes` visibility — can students see their result before the lesson is marked `completed`, or is the entire evaluation record gated? [Clarity, Ambiguity — contracts/api-v1.md §Student Lesson Evaluations, spec.md §FR-012]
- [ ] CHK025 - Is the email notification trigger for upcoming lessons (FR-015) defined with a specific lead time or triggering event — e.g., when `start_time` is first set via PATCH, when an instructor is assigned, or a fixed duration before lesson start? [Clarity, Ambiguity — spec.md §FR-015, contracts/api-v1.md §Course Lessons]
- [ ] CHK026 - Is `bypass_approval: true` in the admin manual enroll endpoint specified to clarify whether it also bypasses capacity limits and waitlist logic, or only the approval queue? [Clarity, Ambiguity — contracts/api-v1.md §Enrollments, spec.md §FR-007, §FR-023]
- [ ] CHK027 - Is the effect of `PATCH /courses/{course_id}` setting `status` manually specified in relation to the derived status rules — can an admin force a status transition that contradicts the lesson-completion state machine? [Clarity, Ambiguity — contracts/api-v1.md §Courses, data-model.md §Course]

---

## API Contract — Consistency

- [ ] CHK028 - Is the overbooking re-trigger on `PATCH /course_lessons/{lesson_id}` confirmed to also fire when `duration_hours` changes (not only `start_time` and `location` as stated) — since a duration increase can create new conflicts with adjacent lessons? [Consistency, Conflict — contracts/api-v1.md §Course Lessons, data-model.md §InstructorAssignment]
- [ ] CHK029 - Are the role-based response fields for `GET /courses/{course_id}/instructors` consistently specified — the contract says students see "names only" but does not define which other fields (assignment_id, assigned_at, contact info) students must not receive? [Consistency, Ambiguity — contracts/api-v1.md §Instructor Assignments, spec.md §FR-002]
- [ ] CHK030 - Is the JWT token expiry and refresh strategy specified in the API contract — specifically what HTTP status and response body a client receives when the Supabase JWT expires mid-session, and whether the API handles refresh transparently? [Consistency, Gap — contracts/api-v1.md §Auth, plan.md §Constraints]

---

## Scenario Coverage

- [ ] CHK031 - Are requirements defined for the race condition where two concurrent `approve` requests for different students both see the last available spot in a course — which student gets `enrolled` vs. `waitlist`? [Coverage, Edge Case — spec.md §FR-023, §FR-024, contracts/api-v1.md §Enrollments]
- [ ] CHK032 - Are requirements defined for instructor assignment when the instructor has unscheduled lessons (`start_time IS NULL`) in another course at the same location — should NULL start times block the assignment or be ignored by the overbooking check? [Coverage, Edge Case — spec.md §FR-010, data-model.md §InstructorAssignment]
- [ ] CHK033 - Are requirements defined for the scenario where all enrolled students in a lesson have unenrolled before the lesson is marked complete — can the lesson be completed with zero evaluations? [Coverage, Edge Case — contracts/api-v1.md §Course Lessons, data-model.md §BusinessRules]
- [ ] CHK034 - Are requirements defined for a student re-enrolling in a course they previously unenrolled from — is a new `StudentEnrollment` row created or the existing row reactivated, and how is FIFO waitlist position assigned? [Coverage, Edge Case — data-model.md §StudentEnrollment]
- [ ] CHK035 - Are requirements defined for the scenario where an instructor is assigned at the course level (all lessons) and then a conflicting individual-lesson assignment is attempted for the same instructor within that course? [Coverage, Edge Case — contracts/api-v1.md §Instructor Assignments, data-model.md §InstructorAssignment]

---

## Non-Functional Requirements

- [ ] CHK036 - Are rate limiting requirements specified for the API — particularly for high-frequency endpoints like availability checks and evaluation submissions? [Coverage, Gap — contracts/api-v1.md]
- [ ] CHK037 - Are per-endpoint or per-category response time SLOs defined beyond the aggregate SC-006 threshold — e.g., overbooking check latency, email trigger latency, or bulk evaluation submission? [Clarity, Gap — spec.md §SC-006]
- [ ] CHK038 - Are API versioning strategy requirements defined — what constitutes a breaking change, how deprecated endpoints are communicated, and what the support window for `v1` is? [Completeness, Gap — contracts/api-v1.md]
- [ ] CHK039 - Are audit trail requirements defined for sensitive state mutations — which entities (enrollment status changes, role assignments, evaluation immutability) require audit logging, and at what granularity (who, when, previous value)? [Completeness, Gap — data-model.md §Validation Rules]

---

## Traceability

- [ ] CHK040 - Is there a traceability matrix linking each API endpoint to the functional requirement(s) (FR-001–FR-027) it fulfils, to verify full coverage and detect any FRs with no corresponding endpoint? [Traceability, Gap — contracts/api-v1.md, spec.md §Requirements]
