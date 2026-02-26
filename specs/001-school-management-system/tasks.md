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

- [ ] T001 Create backend dependency files in backend/requirements.txt and backend/requirements-dev.txt
- [ ] T002 Create frontend project configuration in frontend/package.json, frontend/next.config.js, frontend/tsconfig.json
- [ ] T003 [P] Configure linting/formatting in backend/pyproject.toml, frontend/.eslintrc.cjs, frontend/.prettierrc
- [ ] T004 [P] Add environment templates in backend/.env.example and frontend/.env.local.example
- [ ] T005 [P] Add project automation targets in Makefile (test, lint, build, migrate, seed)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T006 Setup Alembic scaffolding in backend/alembic.ini and backend/alembic/env.py
- [ ] T007 Create DB session/base model in backend/src/core/db.py and backend/src/models/base.py
- [ ] T008 Create settings/config loader in backend/src/core/config.py
- [ ] T009 Implement response envelope + error helpers in backend/src/core/responses.py and backend/src/core/exceptions.py
- [ ] T010 Add request_id middleware in backend/src/core/middleware/request_id.py and register in backend/src/main.py
- [ ] T011 Add API v1 router + health endpoint in backend/src/api/v1/router.py, backend/src/api/v1/health.py, backend/src/main.py
- [ ] T012 [P] Add frontend API client wrapper in frontend/src/services/apiClient.ts
- [ ] T013 [P] Create base layouts + navigation shell in frontend/src/app/layout.tsx and frontend/src/components/NavShell.tsx
- [ ] T014 [P] Add shared API response types in frontend/src/services/types.ts

---

## Phase 3: User Story 10 - Google Authentication (Priority: P1)

**Goal**: All users authenticate via Google to access the system.

**Independent Test**: A user signs in with Google, a profile is created/loaded, and role-based routing is available.

### Tests for User Story 10 (FIRST - Must FAIL before implementation)

- [ ] T015a [P] [US10] Write contract test for /api/v1/me endpoint in backend/tests/contract/test_auth_me.py
- [ ] T015b [P] [US10] Write integration test for Google auth flow (user creation on first login) in backend/tests/integration/test_google_auth.py

### Implementation for User Story 10

- [ ] T015 [P] [US10] Add Supabase client setup in frontend/src/services/supabaseClient.ts
- [ ] T016 [US10] Implement login/logout pages in frontend/src/app/(auth)/login/page.tsx and frontend/src/app/(auth)/logout/page.tsx
- [ ] T017 [US10] Implement /api/v1/me endpoint in backend/src/api/v1/auth.py
- [ ] T018 [US10] Add User model/schema/service in backend/src/models/user.py, backend/src/schemas/user.py, backend/src/services/user_service.py
- [ ] T019 [US10] Sync user profile on auth in backend/src/services/auth_service.py and backend/src/api/v1/auth.py
- [ ] T020 [US10] Add frontend auth guard + redirect logic in frontend/src/middleware.ts

---

## Phase 4: User Story 11 - Role-Based Access Control (Priority: P1)

**Goal**: Users only see interfaces and features appropriate to their role.

**Independent Test**: Each role sees its correct dashboard and cannot access other role routes.

### Tests for User Story 11 (FIRST - Must FAIL before implementation)

- [ ] T021a [P] [US11] Write contract test for role-gating in backend/tests/contract/test_rbac.py (verify student cannot access admin endpoints)
- [ ] T021b [P] [US11] Write integration test for role-based access enforcement in backend/tests/integration/test_rbac_enforcement.py

### Implementation for User Story 11

- [ ] T021 [P] [US11] Add UserRole model/schema in backend/src/models/user_role.py and backend/src/schemas/user_role.py
- [ ] T022 [US11] Implement RBAC dependencies in backend/src/core/rbac.py and backend/src/services/role_service.py
- [ ] T023 [US11] Apply role guards in backend/src/api/v1/router.py
- [ ] T024 [US11] Add role-gated UI components in frontend/src/components/RoleGate.tsx and frontend/src/components/NavShell.tsx
- [ ] T025 [US11] Create role landing pages in frontend/src/app/super-admin/page.tsx, frontend/src/app/admin/page.tsx, frontend/src/app/instructor/page.tsx, frontend/src/app/student/page.tsx
- [ ] T025a [US11] Write contract test for equal admin permissions in backend/tests/contract/test_admin_equality.py (verify no admin has privilege that others don't)
- [ ] T025b [US11] Write enforcement validation in backend/src/services/role_service.py to prevent admin permission hierarchy

---

## Phase 5: User Story 9 - Multi-Tenant Isolation (Priority: P1)

**Goal**: Each school's data is fully isolated across all roles.

**Goal**: Each school's data is fully isolated across all roles.

**Independent Test**: Admins/students from School A cannot see School B data. This test
MUST be written and execute BEFORE implementation begins (test-first per constitution).

### Tests for User Story 9 (FIRST - Must FAIL before implementation)

- [ ] T026a [P] [US9] Write contract test for tenant isolation in backend/tests/contract/test_tenant_isolation.py (verify admin A cannot access school B courses)
- [ ] T026b [P] [US9] Write integration test for row-level isolation enforcement in backend/tests/integration/test_tenant_isolation.py

### Implementation for User Story 9

- [ ] T026 [P] [US9] Add School model/schema in backend/src/models/school.py and backend/src/schemas/school.py
- [ ] T027 [US9] Implement tenant scoping helpers in backend/src/core/tenancy.py and apply in services
- [ ] T028 [US9] Implement schools endpoints in backend/src/api/v1/schools.py
- [ ] T029 [US9] Add school context provider in frontend/src/services/schoolContext.tsx
- [ ] T030 [US9] Add school switcher UI in frontend/src/components/SchoolSwitcher.tsx
- [ ] T031 [US9] Create migration for schools/users/roles in backend/alembic/versions/0001_create_schools_users_roles.py

---

## Phase 6: User Story 1 - Super-Admin Sets Up Syllabuses (Priority: P1)

**Goal**: Super-admins manage reusable syllabuses with lesson definitions.

**Independent Test**: A super-admin creates a syllabus with lessons and an admin can browse it.

### Tests for User Story 1 (FIRST - Must FAIL before implementation)

- [ ] T032a [P] [US1] Write contract test for syllabus CRUD in backend/tests/contract/test_syllabuses.py
- [ ] T032b [P] [US1] Write integration test for lesson ordering and syllabus visibility in backend/tests/integration/test_syllabuses.py

### Implementation for User Story 1

- [ ] T032 [P] [US1] Add Syllabus/Lesson models+schemas in backend/src/models/syllabus.py, backend/src/models/lesson.py, backend/src/schemas/syllabus.py
- [ ] T033 [US1] Add migration for syllabuses/lessons in backend/alembic/versions/0002_create_syllabuses_lessons.py
- [ ] T034 [US1] Implement syllabus service in backend/src/services/syllabus_service.py
- [ ] T035 [US1] Implement syllabus endpoints in backend/src/api/v1/syllabuses.py
- [ ] T036 [US1] Build super-admin syllabus UI in frontend/src/app/super-admin/syllabuses/page.tsx and frontend/src/components/SyllabusForm.tsx
- [ ] T037 [US1] Build admin syllabus browse UI in frontend/src/app/admin/syllabuses/page.tsx

---

## Phase 7: User Story 2 - School Admin Creates Courses and Enrolls Students (Priority: P1)

**Goal**: School admins create courses, assign instructors, and manage enrollments.

**Independent Test**: Admin creates a course, enrolls/approves students, assigns instructors, and roster is visible.

### Tests for User Story 2 (FIRST - Must FAIL before implementation)

- [ ] T038a [P] [US2] Write contract test for course creation and enrollment APIs in backend/tests/contract/test_courses_enrollments.py
- [ ] T038b [P] [US2] Write integration test for course workflow (create, enroll, approve, assign instructor) in backend/tests/integration/test_course_workflows.py
- [ ] T038c [P] [US2] Write integration test for overbooking conflict detection in backend/tests/integration/test_overbooking_prevention.py

### Implementation for User Story 2

- [ ] T038 [P] [US2] Add Course/CourseLesson/StudentEnrollment/InstructorAssignment models+schemas in backend/src/models/course.py, backend/src/models/course_lesson.py, backend/src/models/student_enrollment.py, backend/src/models/instructor_assignment.py, backend/src/schemas/course.py, backend/src/schemas/enrollment.py
- [ ] T039 [US2] Add migration for courses/lessons/enrollments/assignments in backend/alembic/versions/0003_create_courses_enrollments_assignments.py
- [ ] T040 [US2] Implement course creation service in backend/src/services/course_service.py
- [ ] T041 [US2] Implement enrollment workflow service in backend/src/services/enrollment_service.py
- [ ] T042 [US2] Implement instructor assignment service in backend/src/services/instructor_service.py
- [ ] T043 [US2] Implement courses API in backend/src/api/v1/courses.py and lessons API in backend/src/api/v1/course_lessons.py
- [ ] T044 [US2] Implement enrollments API in backend/src/api/v1/enrollments.py and instructors API in backend/src/api/v1/instructors.py
- [ ] T045 [US2] Build admin course management UI in frontend/src/app/admin/courses/page.tsx and frontend/src/app/admin/courses/[courseId]/page.tsx
- [ ] T046 [US2] Build enrollment approval UI in frontend/src/components/EnrollmentQueue.tsx
- [ ] T047 [US2] Build instructor assignment UI in frontend/src/components/InstructorAssignmentForm.tsx

---

## Phase 8: User Story 3 - Student Registers and Views Course Schedule (Priority: P1)

**Goal**: Students self-register, request enrollment, and view their schedules.

**Independent Test**: A student enrolls in a course and sees lesson schedule and details.

- [ ] T048 [P] [US3] Build course catalog page in frontend/src/app/student/courses/page.tsx
- [ ] T049 [US3] Build student course detail page in frontend/src/app/student/courses/[courseId]/page.tsx
- [ ] T050 [US3] Add enrollment API client in frontend/src/services/enrollments.ts
- [ ] T051 [US3] Add student course listing schema in backend/src/schemas/schedule.py
- [ ] T052 [US3] Extend courses API for student-visible listing in backend/src/api/v1/courses.py

---

## Phase 9: User Story 4 - Instructor Manages Lessons and Records Evaluations (Priority: P1)

**Goal**: Instructors manage lessons, write notes, and record PASS/FAIL evaluations.

**Independent Test**: Instructor submits evaluations for a lesson; students are updated accordingly.

- [ ] T053 [P] [US4] Add StudentLessonEvaluation model/schema in backend/src/models/student_lesson_evaluation.py and backend/src/schemas/evaluation.py
- [ ] T054 [US4] Add migration for evaluations in backend/alembic/versions/0004_create_student_lesson_evaluations.py
- [ ] T055 [US4] Implement evaluation service in backend/src/services/evaluation_service.py
- [ ] T056 [US4] Implement evaluation endpoints in backend/src/api/v1/evaluations.py
- [ ] T057 [US4] Implement lesson completion endpoint in backend/src/api/v1/course_lessons.py
- [ ] T058 [US4] Build instructor schedule UI in frontend/src/app/instructor/schedule/page.tsx
- [ ] T059 [US4] Build lesson detail + evaluation form UI in frontend/src/app/instructor/lessons/[lessonId]/page.tsx and frontend/src/components/EvaluationForm.tsx

---

## Phase 10: User Story 5 - Prevent Instructor Overbooking (Priority: P1)

**Goal**: Prevent assigning instructors to overlapping lessons at the same location.

**Independent Test**: Admin cannot assign instructor to overlapping lesson; conflict details displayed.

- [ ] T060 [US5] Implement overbooking query in backend/src/services/instructor_service.py
- [ ] T061 [US5] Add conflict response schema in backend/src/schemas/conflict.py
- [ ] T062 [US5] Surface conflict UI in frontend/src/components/InstructorAssignmentForm.tsx

---

## Phase 11: User Story 12 - Responsive Mobile and Desktop UX (Priority: P1)

**Goal**: UX is fully usable on mobile and desktop.

**Independent Test**: Key workflows operate on 375px and 1920px screens without missing features.

- [ ] T063 [US12] Apply responsive layout updates in frontend/src/components/NavShell.tsx and frontend/src/components/ResponsiveTable.tsx
- [ ] T064 [US12] Add touch-friendly controls in frontend/src/components/EvaluationForm.tsx and frontend/src/components/EnrollmentQueue.tsx

---

## Phase 12: User Story 6 - Track Course Progress Against Syllabus (Priority: P2)

**Goal**: Show course progress relative to the syllabus.

**Independent Test**: Completion of lessons updates progress percentage and status.

- [ ] T065 [US6] Add progress schema in backend/src/schemas/progress.py
- [ ] T066 [US6] Implement progress service in backend/src/services/progress_service.py
- [ ] T067 [US6] Add progress endpoint in backend/src/api/v1/progress.py
- [ ] T068 [US6] Display progress UI in frontend/src/components/CourseProgress.tsx and course pages

---

## Phase 13: User Story 7 - Email Notifications for Lessons and Evaluations (Priority: P2)

**Goal**: Students receive email notifications about lessons and evaluations.

**Independent Test**: Lesson schedule and evaluation submission trigger emails.

- [ ] T069 [US7] Add Resend client wrapper in backend/src/services/notification_service.py
- [ ] T070 [US7] Add email templates in backend/src/templates/emails/lesson_scheduled.html and backend/src/templates/emails/evaluation_submitted.html
- [ ] T071 [US7] Trigger notifications in backend/src/services/course_service.py and backend/src/services/evaluation_service.py

---

## Phase 14: User Story 8 - School Admin Customizes Syllabuses (Priority: P2)

**Goal**: Admins customize lessons when creating a course.

**Independent Test**: Customized course lessons differ from syllabus and display correctly.

- [ ] T072 [US8] Extend course creation schema for custom lessons in backend/src/schemas/course.py
- [ ] T073 [US8] Implement customization branch in backend/src/services/course_service.py
- [ ] T074 [US8] Build customization UI in frontend/src/components/CourseCustomizationForm.tsx and frontend/src/app/admin/courses/new/page.tsx

---

## Phase 15: User Story 13 - Extensible Architecture for Future Integrations (Priority: P3)

**Goal**: Provide clear integration boundaries for future services.

**Independent Test**: Developers can locate integration interfaces and add a stub provider.

- [ ] T075 [US13] Add integration interfaces in backend/src/integrations/base.py and backend/src/integrations/payment_provider.py
- [ ] T076 [US13] Document extension points in docs/architecture.md

---

## Phase 16: User Story 14 - Future: Tandem Flights, Maintenance, Products (Priority: P4)

**Goal**: Preserve future feature readiness without blocking MVP.

**Independent Test**: Roadmap documentation captures data model placeholders.

- [ ] T077 [US14] Add roadmap placeholders in docs/roadmap.md

---

## Phase 18: Coverage Completions - Missing Requirements (Priority: P1 support)

**Purpose**: Address requirements not covered by primary user story phases. These tasks support P1 stories with critical features.

- [ ] T083 [US2] Add FR-025 (auto-enroll waitlist when similar course created) service in backend/src/services/enrollment_service.py with FIFO promotion logic
- [ ] T084 [US11] Add FR-027 (prevent last-admin deletion) validation in backend/src/services/role_service.py and enforce via API in backend/src/api/v1/schools.py
- [ ] T085 [P] [US10] Add FR-022 (super-admin system settings) model in backend/src/models/settings.py and endpoint in backend/src/api/v1/system_settings.py
- [ ] T086 [P] [US13] Add stub interfaces for FR-019 (social media integration) in backend/src/integrations/social_provider.py
- [ ] T087 [P] [US13] Add stub interfaces for FR-020 (instant messaging integration) in backend/src/integrations/messaging_provider.py
- [ ] T088 [US4] Add backend endpoint GET /api/v1/instructors/{instructor_id}/schedule in backend/src/api/v1/instructors.py (FR-011 support)
- [ ] T089 [P] Add performance verification hooks for SC-005 (email delivery within 5 min) in backend/src/services/notification_service.py with timestamp logging
- [ ] T090 [P] Add performance verification hooks for SC-001 (auth + dashboard within 30 s) in frontend/src/middleware.ts and backend response timing
- [ ] T091 [P] Add performance verification hooks for SC-006 (page load < 3 s on mobile) in frontend/src/app/layout.tsx with web-vital metrics

---

## Phase 17: Polish & Cross-Cutting Concerns

- [ ] T078 [P] Update OpenAPI metadata and response envelope docs in backend/src/main.py
- [ ] T079 [P] Add seed utilities in backend/src/services/seed.py and Makefile
- [ ] T080 [P] Add deployment configs in infra/render.yaml and infra/vercel.json
- [ ] T081 [P] Validate quickstart steps and update specs/001-school-management-system/quickstart.md
- [ ] T082 [P] Update developer docs in docs/README.md

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
