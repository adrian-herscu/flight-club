# Feature Specification: School Management System for Paragliding and Hangliding Schools

**Feature Branch**: `001-school-management-system`  
**Created**: 24 February 2026  
**Status**: Draft  
**Input**: User description: "System for managing a school of paragliders and hangliders..."

## Clarifications

### Session 24 February 2026

- Q: Lesson Duration and Scheduling Model → A: Start time + duration model. Lessons have scheduled start time and duration (in hours). Conflict detection calculates by time window and location. Multiple instructors on same lesson don't extend duration.
- Q: Student Enrollment Approval Workflow → A: MVP uses explicit admin approval queue. Admins review pending requests and approve/reject; students see pending status. Architecture designed for future payment integration (V2) where payment status will also factor into auto-approval rules; enrollment entity includes fields for payment tracking.
- Q: Course Capacity and Enrollment Limits → A: Optional capacity limit with FIFO waitlist. When course reaches max_students, further approvals go to waitlist. Waitlist students auto-enroll when spots open (via unenrollment) or when an identical/similar course is created. Admins set max during course creation; unlimited if not set.
- Q: Instructor Notes Visibility and Timing → A: Notes visible only after lesson is marked complete. Notes categorized as "feedback" (visible to student, email sent) or "admin-only" (visible only to admins/instructors, silent). Student-visible notes trigger email notification.
- Q: School Admin Management and Permissions → A: All school admins have equal permissions (no hierarchy). Each admin can manage courses, students, instructors, and view all school data. System prevents deleting the last admin of a school; at least one admin must remain active.
- Q: What defines "similar course" for waitlist auto-enrollment (FR-025)? → A: Two courses are considered "similar" if they share the same `syllabus_id` (same curriculum) and `school_id` (same school) and their creation dates are within 14 days of each other. When a new similar course is created, students on the waitlist of an older course with the same syllabus are offered enrollment in the new course via email; they may accept to auto-enroll.

### Session 26 February 2026

- Q: Syllabus Versioning and Draft/Final States → A: Syllabuses use a draft/final state model combined with versioning. When a syllabus is created, it starts in **Draft** state. Edits to a draft do NOT create new versions—the draft is freely editable. When a draft is finalized, it becomes a **Final** version (immutable). Editing a final version automatically creates a new **Draft** as its child; each final version has at most one active draft. Courses can ONLY bind to final (versioned) syllabuses—they bind immutably to a specific final version for the life of the course. When a school admin creates a course, the system suggests the latest final version as default, but admins can choose any previous final version. Visibility: school admins see the latest final versions of (their school's own syllabuses + system admin syllabuses). School-defined syllabuses are exclusive to their school and never visible to other schools. System syllabuses are visible to all schools.
- Q: Course Opening and Lesson Scheduling Workflow → A: School admin opens a course and assigns instructor(s). Students can enroll in the course. Once enrolled, an instructor sets lessons for specific site/date combinations. The system manages scheduling and conflict detection based on the defined parameters.
- Q: Payment approval and enrollment → A: Payment is managed externally. School admin marks a student as paid (`payment_status = paid`) before approving enrollment. Approval moves the student directly to `enrolled` (if capacity) or `waitlist` (if full); there is no intermediate `approved` state.
- Q: Syllabus creation → A: Syllabuses can be created from scratch or based on another syllabus. System syllabuses are created/edited only by super-admins and are available to all schools as base syllabuses; school syllabuses are exclusive to their school.
- Q: Course customization → A: Courses must follow the defining syllabus exactly. No on-the-fly customization of lesson content is allowed. Courses only add lesson scheduling (start time/location) and instructor notes about students.
- Q: Course status → A: Courses have statuses `planned`, `running`, `completed`, `cancelled`. `planned` means the first lesson has a scheduled date/time; `running` means the first lesson has started; `cancelled` means the course never ran.

---

## User Scenarios & Testing

### User Story 1 - Super-Admin Sets Up Syllabuses (Priority: P1)

A super-admin creates and manages reusable course syllabuses that define the structure of training programs. These syllabuses serve as templates for school admins to use, modify, or extend based on their specific needs.

**Why this priority**: The entire system depends on syllabuses. Without them, schools cannot create structured courses. This is foundational to the platform's value proposition.

**Independent Test**: A super-admin can create a syllabus with lessons, create a course from it, and a school admin can verify the course contains the expected lessons and structure. This delivers immediate value by enabling course creation.

**Acceptance Scenarios**:

1. **Given** a super-admin is logged in, **When** they create a new syllabus with lesson definitions (topics, duration, requirements), **Then** the syllabus is saved and available for school admins to use
2. **Given** a syllabus exists, **When** a super-admin edits it, **Then** the changes are saved and visible to admins who browse available syllabuses
3. **Given** a syllabus is created, **When** a school admin creates a course from it, **Then** the course includes all lessons from the syllabus
4. **Given** a super-admin creates a syllabus, **When** a school admin uses it, **Then** the admin sees it in their syllabus list for course creation

---

### User Story 2 - School Admin Creates Courses and Enrolls Students (Priority: P1)

A school admin creates new courses based on available syllabuses, assigns instructors, and manages student enrollment to enable training programs.

**Why this priority**: This is the core workflow for operating a flight school. Without it, no training can occur. Both solo course creation and student management are critical.

**Independent Test**: A school admin can create a course from a syllabus, add students (manually or accept registrations), and an instructor can view the course with assigned students. This delivers immediate operational value.

**Acceptance Scenarios**:

1. **Given** a school admin is logged in and syllabuses exist, **When** they create a new course based on a syllabus with dates and location, **Then** the course is created with all lessons from the syllabus
2. **Given** a course exists, **When** the admin adds a student by email or accepts a student's registration request, **Then** the student is enrolled and can view the course
3. **Given** a course exists, **When** the admin assigns one or more instructors to the course, **Then** instructors see the course in their schedule
4. **Given** a course has students, **When** the admin views the course roster, **Then** they see all enrolled students with enrollment status
5. **Given** a student is enrolled in a course, **When** the course date arrives, **Then** the student receives an email notification with lesson details

---

### User Story 3 - Student Registers and Views Course Schedule (Priority: P1)

A new or existing student registers for courses through the system and views their scheduled lessons with dates and locations.

**Why this priority**: Student registration is a critical user flow. Students must be able to self-register or be enrolled by admins, and see what they're enrolled in.

**Independent Test**: A student can register via Google authentication, request enrollment in a course, be approved by admin, and view their course schedule with lesson details. This demonstrates the complete student onboarding path.

**Acceptance Scenarios**:

1. **Given** a student accesses the system, **When** they authenticate via Google for the first time, **Then** their profile is created and they can search available courses
2. **Given** courses are available, **When** a student requests enrollment in a course, **Then** the request is sent to the school admin for approval
3. **Given** a student is enrolled in a course, **When** they view the course, **Then** they see the syllabus, lesson schedule with dates and locations
4. **Given** an upcoming lesson has details, **When** the student opens the course, **Then** they can see instructor notes if any are available

---

### User Story 4 - Instructor Manages Lessons and Records Evaluations (Priority: P1)

An instructor views assigned lessons for their courses, writes notes about individual students, and records PASS/FAIL evaluations when lessons end.

**Why this priority**: This is the core teaching workflow. Instructors must be able to manage their schedule and record student progress. Without evaluations, there's no training record.

**Independent Test**: An instructor can view their assigned courses with lesson schedule, write notes for a student before a lesson, complete the lesson with PASS/FAIL evaluations, and students receive email notifications. This delivers teaching and tracking value.

**Acceptance Scenarios**:

1. **Given** an instructor is assigned to a course, **When** they view their schedule, **Then** they see all assigned courses with lesson dates and student rosters
2. **Given** a lesson is scheduled, **When** the instructor accesses the lesson, **Then** they can write textual notes about individual students and save them
3. **Given** a lesson is concluding, **When** the instructor completes the lesson, **Then** they must record a PASS or FAIL evaluation for each student and submit
4. **Given** a lesson is completed with evaluations, **When** the submission is confirmed, **Then** the system records the evaluations and notifies students

---

### User Story 5 - System Prevents Instructor Overbooking (Priority: P1)

The system prevents instructors from being assigned to overlapping lessons by tracking dates and locations across all courses.

**Why this priority**: Overbooking creates operational chaos and training quality issues. Preventing it protects the core business model and ensures reliable operations.

**Independent Test**: A school admin attempts to assign an instructor to a lesson that conflicts with another lesson they're already assigned to, the system prevents the assignment and shows the conflict. This prevents operational errors.

**Acceptance Scenarios**:

1. **Given** an instructor is assigned to a lesson at a specific date and location, **When** a school admin tries to assign them to an overlapping lesson, **Then** the system shows a conflict warning and prevents the assignment
2. **Given** multiple courses need the same instructor at the same time, **When** the admin tries to assign the instructor to overlapping lessons, **Then** the system flags the conflict and requires resolution
3. **Given** an instructor's schedule is full, **When** the admin views available instructors for a lesson, **Then** booked instructors appear unavailable for conflicting time slots

---

### User Story 6 - Track Course Progress Against Syllabus (Priority: P2)

The system tracks which lessons have been completed and which remain, showing course progress relative to the defined syllabus.

**Why this priority**: Tracking progress provides visibility into course completion status and helps admins and instructors manage their workload. It's important but not as critical as the core teaching workflow.

**Independent Test**: An instructor completes lessons in a course and the system updates the course progress to show completed vs remaining lessons. Admins can view overall course progress. This provides operational visibility.

**Acceptance Scenarios**:

1. **Given** a course based on a syllabus is created, **When** the first lesson is marked complete by an instructor, **Then** the course progress updates to show 1 of N lessons complete
2. **Given** lessons are completed in a course, **When** an admin views the course, **Then** they see a progress indicator showing completed lessons vs total
3. **Given** all lessons in a course are complete, **When** the admin views the course, **Then** the system marks the course as complete

---

### User Story 7 - Email Notifications for Lessons and Evaluations (Priority: P2)

Students and instructors receive email notifications about upcoming lessons with dates/locations and when evaluations are recorded.

**Why this priority**: Email notifications improve user engagement and ensure stakeholders stay informed about courses. Important for user experience but secondary to core teaching workflows.

**Independent Test**: A course is created with lessons, an email is sent to enrolled students with lesson details, and when an evaluation is recorded, a confirmation email is sent to the student. This demonstrates notification functionality.

**Acceptance Scenarios**:

1. **Given** a student is enrolled in a course, **When** a lesson date is set, **Then** the student receives an email with lesson date, time, location, and instructor information
2. **Given** an instructor completes a lesson with evaluations, **When** evaluations are submitted, **Then** each student receives an email with their evaluation (PASS/FAIL) and instructor notes
3. **Given** an instructor writes notes about a student, **When** the notes are saved, **Then** the student receives an email notification with the notes

---

### User Story 8 - School Admin Selects Syllabus Version (Priority: P2)

A school admin selects which **final** syllabus version to use when creating a course. Course lesson content is immutable and must match that syllabus version.

**Why this priority**: Selection of a syllabus version enables consistent training outcomes and auditability without per-course customization.

**Independent Test**: A school admin selects a prior final version of a syllabus and creates a course; the course lessons match that version exactly.

**Acceptance Scenarios**:

1. **Given** multiple final versions of a syllabus exist, **When** a school admin creates a course, **Then** they can choose which final version to bind
2. **Given** a course is created from a syllabus version, **When** an instructor views the course, **Then** the lesson content matches that version exactly

---

### User Story 9 - Multi-Tenant Isolation (Priority: P1)

Each school's data is completely isolated. One school's admins, instructors, students, courses, and syllabuses cannot be seen by other schools.

**Why this priority**: Multi-tenancy is a core architectural requirement. Data isolation is critical for security, privacy, and trust. This must work from day one.

**Independent Test**: Admin A from School X creates a course, Admin B from School Y cannot see it. Students from School X don't see courses from School Y. This verifies tenant isolation is working.

**Acceptance Scenarios**:

1. **Given** two schools are on the platform, **When** Admin A from School X creates a course, **Then** Admin B from School Y cannot see or access that course
2. **Given** School X has students enrolled, **When** a student from School Y logs in, **Then** they only see courses from their school
3. **Given** multiple schools use the platform, **When** school data is accessed, **Then** each school's data is completely isolated

---

### User Story 10 - Google Authentication (Priority: P1)

All users (students, instructors, admins, super-admin) authenticate via Google to access the system.

**Why this priority**: Authentication is foundational. Google auth is the specified method. Must work from day one.

**Independent Test**: A new user can log in with their Google account, their profile is created, and they can access their role-specific interface. This verifies authentication is working.

**Acceptance Scenarios**:

1. **Given** a user visits the system, **When** they click "Sign in with Google," **Then** they are directed to Google authentication
2. **Given** a user authenticates successfully with Google, **When** they are returned to the system, **Then** their account is created or their existing account is logged in
3. **Given** a user is logged in, **When** they click logout, **Then** they are signed out and returned to the login page

---

### User Story 11 - Role-Based Access Control (Priority: P1)

Each user has a role (super-admin, school admin, instructor, student) with specific permissions. Users only see interfaces and features appropriate to their role.

**Why this priority**: RBAC is fundamental to a multi-tenant system. Each role must have appropriate access and visibility.

**Independent Test**: A student logs in and sees the student interface; an instructor logs in to the same school and sees the instructor interface; a school admin sees the admin panel. Role-based access works correctly.

**Acceptance Scenarios**:

1. **Given** a user is a student, **When** they log in, **Then** they see only course enrollment and progress features
2. **Given** a user is an instructor, **When** they log in, **Then** they see only their assigned courses and evaluation features
3. **Given** a user is a school admin, **When** they log in, **Then** they see course management, student management, and instructor assignment features
4. **Given** a user is a super-admin, **When** they log in, **Then** they see syllabus management, school management, and system-wide features
5. **Given** a student tries to access instructor features via URL manipulation, **When** they attempt access, **Then** they are denied and see an error

---

### User Story 12 - Responsive Mobile and Desktop UX (Priority: P1)

The system provides a sleek, functional user interface on both desktop and mobile devices with appropriate layouts and touch-friendly controls.

**Why this priority**: UX is critical to adoption. Both mobile and desktop must be fully functional since field instructors need mobile access to lesson sites.

**Independent Test**: Key workflows (student registration, instructor lesson management, admin course creation) work smoothly on both desktop (1920px) and mobile (375px) viewports with no missing functionality.

**Acceptance Scenarios**:

1. **Given** a user is on a desktop browser, **When** they perform key tasks (login, enroll, create course), **Then** all features are accessible and usable
2. **Given** an instructor is at a lesson site on mobile, **When** they open the app and view their lessons, **Then** the interface is touch-friendly and readable on a small screen
3. **Given** a student on mobile views their course schedule, **When** the screen is rotated between portrait and landscape, **Then** the layout adjusts appropriately
4. **Given** a user on mobile navigates between pages, **When** they load a new page, **Then** performance is acceptable (page loads in under 3 seconds)

---

### User Story 13 - Extensible Architecture for Future Integrations (Priority: P3)

The system architecture and technology stack support future integrations with payment systems, social media, and instant messaging without major refactoring.

**Why this priority**: This is important for long-term product roadmap but not required for MVP. The architecture should be designed with extension points in mind.

**Independent Test**: The codebase has clear API boundaries, service interfaces, and extension points documented. A developer can integrate a simple third-party service (e.g., a notification provider) without modifying core business logic.

**Acceptance Scenarios**:

1. **Given** the system is designed, **When** a developer reviews the architecture, **Then** they can identify clear boundaries between core features and integrations
2. **Given** an integration point is defined (e.g., payment processing), **When** a developer implements a new payment provider, **Then** it can be integrated with minimal changes to core code

---

### User Story 14 - Future: Tandem Flights, Maintenance, Products (Priority: P4)

The system foundation supports future functionality for customers to order tandem flights, book maintenance services, and purchase products. This is planned for a future version.

**Why this priority**: This is explicitly marked as a future feature, not part of the initial version. The system design should anticipate this but should not block the initial release.

**Independent Test**: Not tested in MVP. The data model and APIs should be designed to accommodate these features without architectural changes.

**Acceptance Scenarios**:

1. **Given** the initial system is complete, **When** requirements for tandem bookings are defined, **Then** minimal database and API changes are needed to add the feature

---

### Edge Cases

- What happens when an instructor is assigned to overlapping lessons? The system prevents the assignment and alerts the admin.
- How does the system handle a student requesting enrollment in a course that's already full? The request is queued and the admin is notified; the student can be added to a waitlist or a new course.
- What if a lesson is cancelled or rescheduled? All enrolled students receive email notifications about the change.
- What if an instructor doesn't complete evaluations for a lesson? The system prevents lesson mark-as-complete and reminds the instructor.
- How are super-admins managed? The system is initialized with at least one super-admin account. New super-admins are added by existing super-admins.
- What if a school admin is removed from their school? Their access is revoked and they no longer see their school's data.
- What if a student is unenrolled from a course? They are removed from the roster and no longer see the course.

## Requirements

### Functional Requirements

- **FR-001**: System MUST authenticate all users via Google OAuth 2.0
- **FR-002**: System MUST support four roles with appropriate access levels: super-admin, school-admin, instructor, student
- **FR-003**: System MUST enforce multi-tenant isolation so each school's data is completely separated from other schools
- **FR-004**: System MUST allow super-admins to create and manage reusable syllabuses with lesson definitions
- **FR-005**: System MUST allow school admins to create new courses based on super-admin-defined syllabuses
- **FR-006**: System MUST ensure courses follow the defining syllabus exactly (no lesson content customization in the course)
- **FR-007**: System MUST allow school admins to manually enroll students or accept/reject student registration requests through an approval queue; rejected requests include optional reason message
- **FR-008**: System MUST allow students to self-register and request enrollment in available courses from their school; enrollment requests go to pending state pending admin approval
- **FR-009**: System MUST allow school admins to assign one or more instructors to courses
- **FR-010**: System MUST prevent an instructor from being assigned to overlapping lessons by checking if the lesson's start time + duration conflicts with any other lesson they are assigned to at the same location
- **FR-011**: System MUST display an instructor's course schedule showing all assigned lessons with dates, locations, and student rosters
- **FR-012**: System MUST allow instructors to write textual notes about individual students for each lesson; notes are categorized as "feedback" (visible to students after lesson completion, triggers email) or "admin-only" (visible only to school admins/instructors)
- **FR-013**: System MUST require instructors to record a PASS or FAIL evaluation for each student when marking a lesson as complete
- **FR-014**: System MUST track course progress by showing which lessons have been completed relative to the syllabus
- **FR-015**: System MUST send email notifications to students about upcoming lessons (date, time, location, instructor info)
- **FR-016**: System MUST send email notifications to students when evaluations are recorded with the evaluation result and instructor notes
- **FR-017**: System MUST provide a responsive user interface optimized for both desktop (1920px+) and mobile devices (320px+)
- **FR-018**: System MUST support the ability for future integrations with payment systems without requiring core architecture changes
- **FR-019**: System MUST support the ability for future integrations with social media services without requiring core architecture changes
- **FR-020**: System MUST support the ability for future integrations with instant messaging services without requiring core architecture changes
- **FR-021**: System MUST be deployable to cloud infrastructure (scalable, stateless application design)
- **FR-022**: System MUST allow super-admins to manage system-wide settings and user roles
- **FR-023**: System MUST support optional course capacity limits (max_students) set by admins during course creation
- **FR-024**: System MUST manage student enrollment waitlists using FIFO (first-in-first-out) ordering when a course reaches capacity
- **FR-025**: System MUST automatically enroll waitlist students when capacity becomes available through student unenrollment; when a similar course is created, the system MUST offer enrollment and enroll only after the student accepts
- **FR-026**: System MUST ensure all school admins have equal permissions within their school (no admin hierarchy)
- **FR-027**: System MUST prevent deletion of the last active admin in a school; system enforces that at least one admin remains active per school

### Key Entities

- **Syllabus**: Defines the structure of a course with a sequence of lessons. Uses draft/final states combined with versioning. New syllabuses start in **Draft** state and are freely editable without creating versions. When finalized, a draft becomes a **Final** version (immutable). Editing a final version creates a new **Draft** as its child (each final version has at most one active draft). Has title, description, lessons, status (draft or final), version number (null for drafts), and parent_syllabus_id (points to the final version it was created from). Scope is either system-wide (created by super-admins, visible to all schools) or school-specific (created by school admins, exclusive to their school). Courses bind immutably only to final syllabuses. School admins see latest final versions of available syllabuses but can choose previous final versions when creating courses.
- **Lesson**: A component of a syllabus. Has title, description, duration, and learning objectives. Lessons are reusable across multiple courses.
- **Course**: An instance of a specific syllabus *version* taught at a specific school with specific dates, locations, and instructors. Belongs to a school. Contains enrolled students and assigned instructors. Status (`planned`, `running`, `completed`, `cancelled`). The bound syllabus version is immutable for the life of the course.
- **CourseLesson**: An instance of a lesson within a specific course. Has scheduled start time, duration (in hours), and location. Links to the lesson template from the syllabus. Instructor overbooking is detected by comparing start time + duration across all instructors' assignments for the same location. Status (not-started, in-progress, completed). Lessons start automatically at `start_time` if all enrolled students are paid; otherwise a school admin must override.
- **School**: A tenant in the system. Has a name, configuration settings, associated admins, instructors, students, and courses. Isolated from other schools.
- **User**: An entity representing a person. Has email (from Google), first name, last name, profile picture. Can have multiple roles across different schools.
- **UserRole**: Represents a user's role within a school or system-wide. User can be student in school A, instructor in school B, admin in school C. Roles: super-admin (system-wide), school-admin (school-specific), instructor (school-specific), student (school-specific).
- **StudentEnrollment**: Links a student to a course. Has status (pending-approval, enrolled, waitlist, rejected, unenrolled, completed). Tracks enrollment date, rejection reason if applicable, and waitlist position (FIFO order). Includes optional payment_id and payment_status fields for future payment integration (V2).
- **StudentLessonEvaluation**: Records a student's PASS/FAIL result for a specific lesson within a course. Created by instructor. Has date, evaluation (PASS/FAIL), and categorized instructor notes: "feedback" (visible to student, email sent) or "admin-only" (visible only to staff). Instructor can update notes before lesson is marked complete; notes become immutable after completion.
- **InstructorAssignment**: Links an instructor to a course. Has assignment date. Prevents overbooking by checking date/time conflicts.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete authentication via Google and access their role-specific dashboard within 30 seconds
- **SC-002**: School admins can create a new course from a syllabus in under 3 minutes
- **SC-003**: Students can find, request enrollment in, and view a course within 5 minutes of first login
- **SC-004**: Instructors can access their assigned courses, view the student roster, and write lesson notes within 2 minutes
- **SC-005**: Email notifications are delivered to students within 5 minutes of lesson scheduling or evaluation submission
- **SC-006**: The system supports at least 10 concurrent users per school without performance degradation (page load < 3 seconds)
- **SC-007**: Instructor assignment prevents 100% of overlapping lesson bookings through validation
- **SC-008**: Mobile interface is fully functional on devices 320px wide and up; desktop interface works on 1920px and wider
- **SC-009**: Course creation workflow works identically on mobile and desktop with no missing features
- **SC-010**: Multi-tenant isolation is verified: data from one school is never visible to another school (100% success rate in tests)
- **SC-011**: 90% of instructors successfully complete a full lesson workflow (view course, write notes, submit evaluation) on first attempt
- **SC-012**: 95% of students successfully enroll in a course and view the schedule

## Assumptions

- The system will be built as a web application (responsive to both desktop and mobile browsers), not native mobile apps
- Google OAuth 2.0 integration is available and properly configured in the project infrastructure
- Email service is available for notifications (via **Resend API** per constitution; free tier: 3k emails/month)
- Schools will have 1-10 admins, 2-30 instructors, and 10-500 students in the initial version
- Courses will typically have 1-3 instructors, 5-50 students, and 5-30 lessons per syllabus
- Lessons are typically 2-4 hours long for paragliding/hangliding training
- The system will not require real-time collaboration features (e.g., live lesson updates during class)
- Data retention follows standard SaaS practices: indefinite storage during school subscription, deletion after cancellation per contract
- The architecture should follow clean architecture principles with clear separation of concerns to support future integrations
- Payment system, social media, and messaging integrations will be added in future versions and do not need to be implemented in MVP
- Tandem flight ordering, maintenance services, and product sales are explicitly out of scope for the initial version

## Additional Notes

This specification covers the core functionality needed for a multi-tenant paragliding/hangliding school management system. The feature set balances essential operational capabilities (course management, lesson tracking, evaluations) with user engagement (notifications, responsive design) while maintaining a foundation for future expansion. The priority levels reflect that P1 features are required for MVP (core operations), P2 features significantly enhance the user experience, P3 features support long-term product strategy, and P4 features are explicitly deferred.
