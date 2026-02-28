---

description: "Task list for School Management System implementation"
---

# Tasks: School Management System

**Input**: Design documents from /specs/001-school-management-system/
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Test-first development required per constitution Principle III. Contract tests
and integration tests MUST be written (and fail) before implementation tasks begin.
All test tasks are marked [P] to indicate parallelization with corresponding implementation.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create backend dependency files (now unified at root: package.json, package-lock.json)
- [x] T002 Create frontend project configuration (now unified at root: next.config.js, tsconfig.json)
- [x] T003 [P] Configure linting/formatting in root tsconfig.json, .eslintrc.cjs, .prettierrc (unified)
- [x] T004 [P] Add environment templates in root .env.local.example (unified)
- [x] T005 [P] Add project automation targets in package.json npm scripts (test, lint, build, migrate, seed)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T006 Setup Prisma schema in prisma/schema.prisma (unified)
- [x] T007 Create database client in src/lib/db.ts and base types in src/lib/ (unified)
- [x] T008 Create settings/config loader in src/lib/config.ts (unified)
- [x] T009 Implement response envelope + error helpers in src/lib/responses.ts and src/lib/errors.ts (unified)
- [x] T010 Add request-id middleware in src/lib/middleware/request-id.ts and register in Next.js app (unified)
- [x] T011 Add API v1 router + health endpoint in src/app/api/v1/ (Next.js API routes)
- [x] T012 [P] Add frontend API client wrapper in src/services/apiClient.ts
- [x] T013 [P] Create base layouts + navigation shell in src/app/layout.tsx and src/components/NavShell.tsx
- [x] T014 [P] Add shared API response types in src/services/types.ts

---

## Phase 3: User Story 10 - Google Authentication (Priority: P1)

**Goal**: All users authenticate via Google to access the system.

**Independent Test**: A user signs in with Google, a profile is created/loaded, and role-based routing is available.

### Tests for User Story 10 (FIRST - Must FAIL before implementation)

- [x] T015a [P] [US10] Write contract test for /api/v1/me endpoint in tests/contract/auth.test.ts
- [x] T015b [P] [US10] Write integration test for Google auth flow (user creation on first login) in tests/integration/auth.test.ts

### Implementation for User Story 10

- [x] T015 [P] [US10] Add Supabase client setup in src/services/supabaseClient.ts
- [x] T016 [US10] Implement login/logout pages in src/app/(auth)/login/page.tsx and src/app/(auth)/logout/page.tsx
- [x] T017 [US10] Implement /api/v1/me endpoint in src/app/api/v1/me/
- [x] T018 [US10] Add User model/schema/service in prisma/schema.prisma, src/lib/services/users.service.ts
- [x] T019 [US10] Sync user profile on auth in src/app/api/v1/me/ and src/lib/services/
- [x] T020 [US10] Add frontend auth guard + redirect logic in src/middleware.ts

---

## Phase 4: User Story 11 - Role-Based Access Control (Priority: P1)

**Goal**: Users only see interfaces and features appropriate to their role.

**Independent Test**: Each role sees its correct dashboard and cannot access other role routes.

### Tests for User Story 11 (FIRST - Must FAIL before implementation)

- [x] T021a [P] [US11] Write contract test for role-gating in tests/contract/rbac.test.ts (verify student cannot access admin endpoints)
- [x] T021b [P] [US11] Write integration test for role-based access enforcement in tests/integration/rbac.test.ts

### Implementation for User Story 11

- [x] T021 [P] [US11] Add UserRole model/schema in prisma/schema.prisma and src/lib/services/
- [x] T022 [US11] Implement RBAC dependencies in src/lib/middleware/rbac.ts and src/lib/services/roles.service.ts
- [x] T023 [US11] Apply role guards in src/app/api/v1/ routes
- [x] T024 [US11] Add role-gated UI components in src/components/RoleGate.tsx and src/components/NavShell.tsx
- [x] T025 [US11] Create role landing pages in src/app/super-admin/page.tsx, src/app/admin/page.tsx, src/app/instructor/page.tsx, src/app/student/page.tsx
- [x] T025a [US11] Write contract test for equal admin permissions in tests/contract/rbac.test.ts (verify no admin has privilege that others don't)
- [x] T025b [US11] Write enforcement validation in src/lib/services/role.service.ts to prevent admin permission hierarchy

---

## Phase 5: User Story 9 - Multi-Tenant Isolation (Priority: P1)

**Goal**: Each school's data is fully isolated across all roles. Admins/students from School A cannot see School B data.

**Independent Test**: Admins/students from School A cannot see School B data. This test MUST be written and execute BEFORE implementation begins (test-first per constitution).

### Tests for User Story 9 (FIRST - Must FAIL before implementation)

- [x] T026a [P] [US9] Write contract test for tenant isolation in tests/contract/tenancy.test.ts (verify admin A cannot access school B courses)
- [x] T026b [P] [US9] Write integration test for row-level isolation enforcement in tests/integration/tenancy.test.ts

### Implementation for User Story 9

- [x] T026 [P] [US9] Add School model/schema in prisma/schema.prisma and src/lib/schemas/school.ts
- [x] T027 [US9] Implement tenant scoping helpers in src/lib/tenancy.ts and apply in services
- [x] T028 [US9] Implement schools endpoints in src/app/api/v1/schools.ts
- [x] T029 [US9] Add school context provider in src/services/schoolContext.tsx
- [x] T030 [US9] Add school switcher UI in src/components/SchoolSwitcher.tsx
- [x] T031 [US9] Create Prisma migrations for schools/users/roles via prisma/migrations/

---

## Phase 6: User Story 1 - Super-Admin Sets Up Syllabuses (Priority: P1)

**Goal**: Super-admins manage reusable syllabuses with lesson definitions.

**Independent Test**: A super-admin creates a syllabus with lessons and an admin can browse it.

### Tests for User Story 1 (FIRST - Must FAIL before implementation)

- [x] T032a [P] [US1] Write contract test for syllabus CRUD in tests/contract/syllabuses.test.ts
- [x] T032b [P] [US1] Write integration test for lesson ordering and syllabus visibility in tests/integration/syllabuses.test.ts

### Implementation for User Story 1

- [x] T032 [P] [US1] Add Syllabus/Lesson models+schemas in prisma/schema.prisma and src/lib/schemas/syllabus.ts
- [x] T033 [US1] Add Prisma migration for syllabuses/lessons via prisma/migrations/
- [x] T034 [US1] Implement syllabus service in src/lib/services/syllabus.service.ts
- [x] T035 [US1] Implement syllabus endpoints in src/app/api/v1/syllabuses.ts
- [x] T036 [US1] Build super-admin syllabus UI in src/app/super-admin/syllabuses/page.tsx and src/components/SyllabusForm.tsx
- [x] T037 [US1] Build admin syllabus browse UI in src/app/admin/syllabuses/page.tsx

---

## Phase 7: User Story 2 - School Admin Creates Courses and Enrolls Students (Priority: P1)

**Goal**: School admins create courses, assign instructors, and manage enrollments.

**Independent Test**: Admin creates a course, enrolls/approves students, assigns instructors, and roster is visible.

### Tests for User Story 2 (FIRST - Must FAIL before implementation)

- [x] T038a [P] [US2] Write contract test for course creation and enrollment APIs in tests/contract/courses.test.ts
- [x] T038b [P] [US2] Write integration test for course workflow (create, enroll, approve, assign instructor) in tests/integration/courses.test.ts
- [x] T038c [P] [US2] Write integration test for overbooking conflict detection in tests/integration/overbooking.test.ts

### Implementation for User Story 2

- [x] T038 [P] [US2] Add Course/CourseLesson/StudentEnrollment/InstructorAssignment models+schemas in prisma/schema.prisma and src/lib/schemas/course.ts
- [x] T039 [US2] Add Prisma migration for courses/lessons/enrollments/assignments via prisma/migrations/
- [x] T040 [US2] Implement course creation service in src/lib/services/course.service.ts
- [x] T041 [US2] Implement enrollment workflow service in src/lib/services/enrollment.service.ts
- [x] T042 [US2] Implement instructor assignment service in src/lib/services/instructor.service.ts
- [x] T043 [US2] Implement courses API in src/app/api/v1/courses.ts and lessons API in src/app/api/v1/course-lessons.ts
- [x] T044 [US2] Implement enrollments API in src/app/api/v1/enrollments.ts and instructors API in src/app/api/v1/instructors.ts
- [X] T045 [US2] Build admin course management UI in src/app/admin/courses/page.tsx and src/app/admin/courses/[courseId]/page.tsx
- [X] T046 [US2] Build enrollment approval UI in src/components/EnrollmentQueue.tsx
- [X] T047 [US2] Build instructor assignment UI in src/components/InstructorAssignmentForm.tsx

---

## Phase 8: User Story 3 - Student Registers and Views Course Schedule (Priority: P1)

**Goal**: Students self-register, request enrollment, and view their schedules.

**Independent Test**: A student enrolls in a course and sees lesson schedule and details.

- [X] T048 [P] [US3] Build course catalog page in src/app/student/courses/page.tsx
- [X] T049 [US3] Build student course detail page in src/app/student/courses/[courseId]/page.tsx
- [X] T050 [US3] Add enrollment API client in src/services/enrollments.ts
- [X] T051 [US3] Add student course listing schema in src/lib/schemas/schedule.ts
- [X] T052 [US3] Extend courses API for student-visible listing in src/app/api/v1/courses.ts

---

## Phase 9: User Story 4 - Instructor Manages Lessons and Records Evaluations (Priority: P1)

**Goal**: Instructors manage lessons, write notes, and record PASS/FAIL evaluations.

**Independent Test**: Instructor submits evaluations for a lesson; students are updated accordingly.

- [X] T053 [P] [US4] Add StudentLessonEvaluation model/schema in prisma/schema.prisma and src/lib/schemas/evaluation.ts
- [X] T054 [US4] Add Prisma migration for evaluations via prisma/migrations/
- [X] T055 [US4] Implement evaluation service in src/lib/services/evaluation.service.ts
- [X] T056 [US4] Implement evaluation endpoints in src/app/api/v1/evaluations.ts
- [X] T057 [US4] Implement lesson completion endpoint in src/app/api/v1/course-lessons.ts
- [X] T058 [US4] Build instructor schedule UI in src/app/instructor/schedule/page.tsx
- [X] T059 [US4] Build lesson detail + evaluation form UI in src/app/instructor/lessons/[lessonId]/page.tsx and src/components/EvaluationForm.tsx

---

## Phase 10: User Story 5 - Prevent Instructor Overbooking (Priority: P1)

**Goal**: Prevent assigning instructors to overlapping lessons at the same location.

**Independent Test**: Admin cannot assign instructor to overlapping lesson; conflict details displayed.

- [x] T060 [US5] Implement overbooking query in src/lib/services/instructor.service.ts
- [x] T061 [US5] Add conflict response schema in src/lib/schemas/conflict.ts
- [x] T062 [US5] Surface conflict UI in src/components/InstructorAssignmentForm.tsx

---

## Phase 11: User Story 12 - Responsive Mobile and Desktop UX (Priority: P1)

**Goal**: UX is fully usable on mobile and desktop.

**Independent Test**: Key workflows operate on 375px and 1920px screens without missing features.

- [x] T063 [US12] Apply responsive layout updates in src/components/NavShell.tsx and src/components/ResponsiveTable.tsx
- [x] T064 [US12] Add touch-friendly controls in src/components/EvaluationForm.tsx and src/components/EnrollmentQueue.tsx

---

## Phase 12: User Story 6 - Track Course Progress Against Syllabus (Priority: P2)

**Goal**: Show course progress relative to the syllabus.

**Independent Test**: Completion of lessons updates progress percentage and status.

- [ ] T065 [US6] Add progress schema in src/lib/schemas/progress.ts
- [ ] T066 [US6] Implement progress service in src/lib/services/progress.service.ts
- [ ] T067 [US6] Add progress endpoint in src/app/api/v1/progress.ts
- [ ] T068 [US6] Display progress UI in src/components/CourseProgress.tsx and course pages

---

## Phase 13: User Story 7 - Email Notifications for Lessons and Evaluations (Priority: P2)

**Goal**: Students receive email notifications about lessons and evaluations.

**Independent Test**: Lesson schedule and evaluation submission trigger emails.

- [ ] T069 [US7] Add Resend client wrapper in src/lib/services/notification.service.ts
- [ ] T070 [US7] Add email templates in src/templates/emails/lesson-scheduled.html and src/templates/emails/evaluation-submitted.html
- [ ] T071 [US7] Trigger notifications in src/lib/services/course.service.ts and src/lib/services/evaluation.service.ts

---

## Phase 14: User Story 8 - School Admin Selects Syllabus Version (Priority: P2)

**Goal**: Admins choose which final syllabus version to use when creating a course.

**Independent Test**: A course created from a prior final version matches that version’s lessons exactly.

- [ ] T072 [US8] Update course creation UI to allow selecting any final syllabus version in src/app/admin/courses/new/page.tsx
- [ ] T073 [US8] Validate selected syllabus version is final in src/lib/services/course.service.ts

---

## Phase 15: User Story 13 - Extensible Architecture for Future Integrations (Priority: P3)

**Goal**: Provide clear integration boundaries for future services.

**Independent Test**: Developers can locate integration interfaces and add a stub provider.

- [ ] T075 [US13] Add integration interfaces in src/lib/integrations/base.ts and src/lib/integrations/payment-provider.ts
- [ ] T076 [US13] Document extension points in docs/architecture.md

---

## Phase 16: User Story 14 - Future: Tandem Flights, Maintenance, Products (Priority: P4)

**Goal**: Preserve future feature readiness without blocking MVP.

**Independent Test**: Roadmap documentation captures data model placeholders.

- [ ] T077 [US14] Add roadmap placeholders in docs/roadmap.md

---

## Phase 17: Coverage Completions - Missing Requirements (Priority: P1 support)

**Purpose**: Address requirements not covered by primary user story phases. These tasks support P1 stories with critical features.

- [ ] T083 [US2] Add FR-025 (auto-enroll waitlist when similar course created) service in src/lib/services/enrollment.service.ts with FIFO promotion logic
- [ ] T084 [US11] Add FR-027 (prevent last-admin deletion) validation in src/lib/services/role.service.ts and enforce via API in src/app/api/v1/schools.ts
- [ ] T085 [P] [US10] Add FR-022 (super-admin system settings) model in prisma/schema.prisma and endpoint in src/app/api/v1/settings.ts
- [ ] T086 [P] [US13] Add stub interfaces for FR-019 (social media integration) in src/lib/integrations/social-provider.ts
- [ ] T087 [P] [US13] Add stub interfaces for FR-020 (instant messaging integration) in src/lib/integrations/messaging-provider.ts
- [ ] T088 [US4] Add backend endpoint GET /api/v1/instructors/{instructor_id}/schedule in src/app/api/v1/instructors.ts (FR-011 support)
- [ ] T089 [P] Add performance verification hooks for SC-005 (email delivery within 5 min) in src/lib/services/notification.service.ts with timestamp logging
- [ ] T090 [P] Add performance verification hooks for SC-001 (auth + dashboard within 30 s) in src/middleware.ts and backend-node response timing
- [ ] T091 [P] Add performance verification hooks for SC-006 (page load < 3 s on mobile) in src/app/layout.tsx with web-vital metrics

---

## Phase 18: Polish & Cross-Cutting Concerns

- [ ] T078 [P] Update API documentation and response envelope docs in src/lib/server.ts and src/lib/responses.ts
- [ ] T079 [P] Add seed utilities in src/lib/services/seed.service.ts and Makefile
- [ ] T080 [P] Add deployment configs in infra/render.yaml and infra/vercel.json
- [ ] T081 [P] Validate quickstart steps and update specs/001-school-management-system/quickstart.md
- [x] T082 [P] Update developer docs in docs/README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup) → Phase 2 (Foundational)
- Phase 2 (Foundational) → All User Story phases (P1 → P2 → P3 → P4)
- Polish phase depends on completion of all targeted stories

### User Story Dependencies (Suggested Order)

1. US10 (Auth) → 2. US11 (RBAC) → 3. US9 (Multi-tenant)
4. US1 (Syllabuses) → 5. US2 (Courses/Enrollments) → 6. US3 (Student)
7. US4 (Instructor) → 8. US5 (Overbooking) → 9. US12 (Responsive UX)
10. US6 (Progress) → 11. US7 (Email) → 12. US8 (Customization)
13. US13 (Extensibility) → 14. US14 (Future placeholders)

---

## Parallel Execution Examples (per User Story)

- US10: T015 and T018 can run in parallel (frontend auth client vs backend user model).
- US11: T021 and T024 can run in parallel (backend roles vs frontend gating UI).
- US9: T026 and T029 can run in parallel (backend school model vs frontend context).
- US1: T032 and T036 can run in parallel (backend models vs admin UI).
- US2: T038, T040, and T045 can run in parallel after T039 (models, service, UI in different files).
- US3: T048 and T051 can run in parallel (UI vs backend schema).
- US4: T053 and T058 can run in parallel (backend model vs instructor UI).
- US5: T060 and T062 can run in parallel (backend validation vs UI error handling).
- US12: T063 and T064 can run in parallel (layout vs control sizing).
- US6: T065 and T068 can run in parallel (schema vs UI).
- US7: T069 and T070 can run in parallel (client wrapper vs templates).
- US8: T072 and T074 can run in parallel (schema vs UI).
- US13: T075 and T076 can run in parallel (interfaces vs docs).
- US14: T077 stands alone.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Implement US10 → US11 → US9 → US1 → US2.
3. Validate US2 independently (course creation + enrollment + instructor assignment).
4. Only then proceed to US3 and US4.

### Incremental Delivery

- Each story should be independently testable on completion.
- Keep schema migrations small and scoped to each story.
- Prefer backend contract alignment before frontend wiring for each story.
