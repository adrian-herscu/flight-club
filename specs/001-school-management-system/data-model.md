# Data Model: School Management System

**Phase**: 1 — Design  
**Date**: 24 February 2026  
**Feature**: `001-school-management-system`

---

## Entity Overview

```
School ──< UserRole >── User
School ──< Course ──< CourseLesson ──< StudentLessonEvaluation
                  ├──< StudentEnrollment >── User
                  └──< InstructorAssignment >── User

Syllabus ──< Lesson ──< CourseLesson (source_lesson_id, nullable FK)
```

---

## Entities

### 1. `School`

Represents a tenant and a legal entity (business/organization). All school-scoped entities carry a `school_id` FK.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `name` | `VARCHAR(255)` | NOT NULL | Display name |
| `slug` | `VARCHAR(100)` | NOT NULL, UNIQUE | URL-safe identifier |
| `company_id` | `VARCHAR(50)` | NOT NULL, UNIQUE | Legal company/business registration ID (varies by country: ABN/ACN in Australia, EIN in US, VAT in EU, etc.) |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Primary contact email (administrative inquiries, support notifications) |
| `phone_number` | `VARCHAR(20)` | NOT NULL | Primary phone number (international format preferred: +CC-NNN-NNN-NNNN) |
| `discipline` | `VARCHAR(50)` | NOT NULL, default `'paragliding_hangliding'` | Reserved for future general aviation expansion |
| `address_street` | `VARCHAR(255)` | NOT NULL | Street address (e.g., "123 Main St") |
| `address_city` | `VARCHAR(100)` | NOT NULL | City/municipality |
| `address_region` | `VARCHAR(100)` | NULLABLE | State/province/region (if applicable) |
| `address_country` | `VARCHAR(2)` | NOT NULL | ISO 3166-1 alpha-2 country code (e.g., "AU", "US", "CH") |
| `address_postal_code` | `VARCHAR(20)` | NOT NULL | Postal/zip code |
| `settings` | `JSONB` | NOT NULL, default `{}` | Extensible config (max capacity defaults, notification prefs, etc.) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Ownership**: super-admin creates/manages schools.  
**Validation**: `slug` matches `[a-z0-9-]+`, unique globally. `company_id` and `email` are unique globally.

---

### 2. `User`

Represents an authenticated person. Identity is managed by Supabase Auth. Includes personal identification and contact information for compliance and emergency purposes.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK — MUST match Supabase Auth `user.id` | |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Primary email (mutable; user can update after signup) |
| `oauth_email` | `VARCHAR(255)` | NOT NULL | Immutable: email from Google OIDC at signup time; retained for audit trail |
| `first_name` | `VARCHAR(100)` | NOT NULL | |
| `last_name` | `VARCHAR(100)` | NOT NULL | |
| `avatar_url` | `TEXT` | NULLABLE | Google profile picture |
| `personal_id` | `VARCHAR(50)` | NULLABLE | Personal ID number (SSN, passport ID, driver's license, etc.) — optional at signup, may be required by school |
| `personal_id_type` | `VARCHAR(20)` | NULLABLE | Type of personal ID: 'ssn', 'passport', 'driver_license', 'id_card', 'other' |
| `date_of_birth` | `DATE` | NULLABLE | Birth date (useful for rating/certification age requirements) |
| `address_street` | `VARCHAR(255)` | NULLABLE | Street address |
| `address_city` | `VARCHAR(100)` | NULLABLE | City/municipality |
| `address_region` | `VARCHAR(100)` | NULLABLE | State/province/region (if applicable) |
| `address_country` | `VARCHAR(2)` | NULLABLE | ISO 3166-1 alpha-2 country code |
| `address_postal_code` | `VARCHAR(20)` | NULLABLE | Postal/zip code |
| `phone_number` | `VARCHAR(20)` | NULLABLE | Primary phone number (international format preferred) |
| `emergency_contact_name` | `VARCHAR(255)` | NULLABLE | Emergency contact person's name |
| `emergency_contact_phone` | `VARCHAR(20)` | NULLABLE | Emergency contact phone number |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Ownership**: created automatically on first Google login (Supabase Auth trigger or FastAPI upsert).  
**Validation**: `oauth_email` is immutable (sourced from Supabase JWT at signup); `email` is mutable (user can update anytime). Both UNIQUE.  
**Personal ID security**: `personal_id` and `personal_id_type` are sensitive; access restricted to school admins and super-admins only (never exposed to other students). Phone, address, and emergency contact similarly restricted to school context.

---

### 3. `UserRole`

Maps a user to a role, either system-wide or within a specific school.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → `user.id`, NOT NULL | |
| `school_id` | `UUID` | FK → `school.id`, NULLABLE, CHECK `(role = 'super_admin' AND school_id IS NULL) OR (role != 'super_admin' AND school_id IS NOT NULL)` | NULL for `super_admin` |
| `role` | `ENUM('super_admin','school_admin','instructor','student')` | NOT NULL | |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Soft-disable without deleting |
| `granted_by` | `UUID` | FK → `user.id`, NULLABLE | Audit: who assigned this role |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraint**: `(user_id, school_id, role)` — a user can hold multiple roles across schools.  
**Validation rule**: `role = 'super_admin'` iff `school_id IS NULL`.  
**Business rule**: An admin cannot delete their own role (deletion is rejected if `user_id = requester_id` and `role = 'school_admin'` or `'super_admin'`).  
**Business rule**: deleting a `school_admin` role is prevented if it would leave the school with zero active admins (enforced in service layer, not DB constraint).

---

### 4. `Syllabus`

Two-tier course template system with draft/final states: super-admins create system-wide syllabuses (`school_id IS NULL`); school-admins can create and edit their own school-specific syllabuses (`school_id NOT NULL`). Syllabuses use a draft/final state model combined with versioning. In **Draft** state, edits do NOT create versions—the draft is freely editable. When finalized, a draft becomes an immutable **Final** version. Editing a final version creates a new **Draft** as its child. Courses ONLY bind to final (versioned) syllabuses, never drafts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `school_id` | `UUID` | FK → `school.id`, NULLABLE | NULL = system-wide (created by super-admin, visible to all schools); NOT NULL = school-specific (exclusive to school) |
| `parent_syllabus_id` | `UUID` | FK → `syllabus.id`, NULLABLE | Lineage pointer: for a draft created from a final version, points to that final version's id. Null for original drafts or for final syllabuses. |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `discipline` | `VARCHAR(50)` | NOT NULL, default `'paragliding_hangliding'` | |
| `created_by` | `UUID` | FK → `user.id`, NOT NULL | Super-admin (if `school_id IS NULL`) or school-admin (if `school_id NOT NULL`) |
| `status` | `ENUM('draft','final')` | NOT NULL, default `'draft'` | Draft = freely editable, no version number. Final = immutable, has version number. |
| `version` | `INTEGER` | NULLABLE, CHECK `(status = 'draft' AND version IS NULL) OR (status = 'final' AND version IS NOT NULL)` | Version number of final syllabuses. Null for drafts. |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Soft-delete; inactive syllabuses not shown in browse |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraints**:
- `UNIQUE (school_id, title, is_active) WHERE status = 'draft' AND is_active = true` — at most one active draft per title per school/system.
- `UNIQUE (school_id, title, version) WHERE status = 'final'` — allows multiple final versions of same title.
- `UNIQUE (parent_syllabus_id) WHERE status = 'draft' AND parent_syllabus_id IS NOT NULL AND is_active = true` — at most one active draft child per final syllabus.

**Business rule — Current version computation**: For a given `(school_id, title)`, the "latest final version" is the row with maximum `version` where `status = 'final'`. The "active draft" (if any) is the row where `status = 'draft'` and `parent_syllabus_id = latest_final.id`. Query pattern: `SELECT * FROM syllabus WHERE (school_id, title) = (?, ?) AND is_active = true AND status = 'final' ORDER BY version DESC LIMIT 1`.

**Ownership & Visibility**:
- **System-wide** (`school_id IS NULL`): Created by super-admin. All school-admins can browse and see latest final versions only. Cannot edit directly; must copy to create their own school-specific draft.
- **School-specific** (`school_id NOT NULL`): Created by school-admin. Only that school's admins can browse, view, edit (if draft), finalize, or use in course creation. Other schools never see these syllabuses.

**Draft & Finalize Workflow**:
- Syllabus created → starts in **Draft** state.
- School-admin edits draft freely (title, lessons, description) — no new versions created.
- School-admin decides it's ready → **finalize** action → creates a Final version (immutable), assigns `version = (max prior version for this title) + 1`.
- Editing a final version → system automatically creates a new **Draft** as its child (`parent_syllabus_id = final.id`, `version = null`, `status = 'draft'`). Each final version has at most one active draft.
- Courses ONLY bind to final syllabuses; draft syllabuses cannot be used for course creation.

**Copy/Clone Workflow** (for school to adopt system syllabus):
- School-admin browses system-wide final syllabuses → selects one → requests copy.
- System creates new Syllabus row: `school_id = requester's school`, `status = 'draft'`, copies all Lesson rows, sets `parent_syllabus_id = null` (new independent lineage), `created_by = requester`.
- School-admin can now edit this draft freely and finalize when ready.

---

### 5. `Lesson`

A component of a syllabus (prototype or school-specific). When a school copies a syllabus, all its lessons are also copied. Lessons are owned by and scoped to their parent syllabus.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `syllabus_id` | `UUID` | FK → `syllabus.id`, NOT NULL | Parent syllabus (prototype or school-specific) |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `duration_hours` | `NUMERIC(4,2)` | NOT NULL, CHECK `> 0` | Typical: 2.0–4.0 |
| `sequence_order` | `INTEGER` | NOT NULL | Order within parent syllabus |
| `learning_objectives` | `TEXT[]` | NOT NULL, default `'{}'` | Array of objective strings |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraint**: `(syllabus_id, sequence_order)` — no duplicate sequence numbers within a syllabus.

**Ownership**: Lessons inherit ownership from their parent Syllabus. If `syllabus.school_id IS NULL`, lessons are read-only prototype content. If `syllabus.school_id NOT NULL`, school-admin can edit lesson title, description, duration, learning objectives (sequence_order can be reordered via bulk update).

---

### 6. `Course`

An instance of a school-specific or school-owned syllabus taught at a specific school. Tenant-scoped. Lessons are **copied** from the syllabus at creation time and frozen at that syllabus version.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `school_id` | `UUID` | FK → `school.id`, NOT NULL | Tenant key — course always belongs to a school |
| `syllabus_id` | `UUID` | FK → `syllabus.id`, NOT NULL | Must reference a final syllabus (status='final'). Course is immutably bound to this specific syllabus version. |
| `title` | `VARCHAR(255)` | NOT NULL | May differ from syllabus title |
| `description` | `TEXT` | NULLABLE | |
| `status` | `ENUM('upcoming','in_progress','completed','cancelled')` | NOT NULL, default `'upcoming'` | |
| `max_students` | `INTEGER` | NULLABLE, CHECK `> 0` | NULL = unlimited |
| `created_by` | `UUID` | FK → `user.id`, NOT NULL | School admin who created it |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Business rule**: `status` transitions `upcoming → in_progress → completed`; `cancelled` can be set from any state.  
**Derived**: `status` updated to `in_progress` when first `CourseLesson` is marked `completed`; to `completed` when all `CourseLesson` rows are `completed`.  
**Lesson copying**: When course is created, all Lesson rows from the referenced final syllabus are copied into CourseLesson rows. The course remains bound to that immutable syllabus version via `syllabus_id` FK. If a new final version is later created (by editing and finalizing), existing courses are unaffected.

---

### 7. `CourseLesson`

An instance of a lesson within a specific course. Has a scheduled time, location, and status.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `course_id` | `UUID` | FK → `course.id`, NOT NULL | |
| `source_lesson_id` | `UUID` | FK → `lesson.id`, NULLABLE | Traceability to syllabus template |
| `title` | `VARCHAR(255)` | NOT NULL | Copied from lesson; may be customized |
| `description` | `TEXT` | NULLABLE | |
| `duration_hours` | `NUMERIC(4,2)` | NOT NULL, CHECK `> 0` | |
| `sequence_order` | `INTEGER` | NOT NULL | |
| `learning_objectives` | `TEXT[]` | NOT NULL, default `'{}'` | |
| `start_time` | `TIMESTAMPTZ` | NULLABLE | Scheduled start; NULL = TBD |
| `location` | `VARCHAR(255)` | NULLABLE | Physical location (e.g., "Torrey Pines launch site") |
| `status` | `ENUM('not_started','in_progress','completed','cancelled')` | NOT NULL, default `'not_started'` | |
| `completed_at` | `TIMESTAMPTZ` | NULLABLE | Set when instructor marks complete |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Index**: `(start_time, location)` — supports overbooking queries.  
**Business rule**: overbooking check fires before any `InstructorAssignment` is inserted for this lesson.  
**Business rule**: `status → completed` requires all `StudentLessonEvaluation` rows for enrolled students to have an evaluation result; if missing evaluations exist, the mark-complete request is rejected.

---

### 8. `InstructorAssignment`

Links an instructor to a course lesson. Overbooking prevention enforced at insert.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `course_id` | `UUID` | FK → `course.id`, NOT NULL | |
| `course_lesson_id` | `UUID` | FK → `course_lesson.id`, NULLABLE | NULL = assigned to full course (all lessons) |
| `instructor_id` | `UUID` | FK → `user.id`, NOT NULL | Must have `instructor` role in school |
| `assigned_by` | `UUID` | FK → `user.id`, NOT NULL | School admin who made assignment |
| `assigned_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraint**: `(course_lesson_id, instructor_id)` where `course_lesson_id IS NOT NULL`.  
**Overbooking rule**: before insert, check for scheduling conflicts for the same `instructor_id` across all assigned `CourseLesson` rows:
  1. **Same location**: reject if `[start_time, start_time + duration_hours)` overlaps with any existing lesson at the same `location`.
  2. **Different locations**: reject if insufficient travel time; i.e., if `end_time_existing + travel_buffer > start_time_new` or `end_time_new + travel_buffer > start_time_existing` (where `travel_buffer` is a configurable duration, e.g., 1 hour, to account for travel + setup time). Admin must manually resolve conflicts by adjusting times or removing assignments.

---

### 9. `StudentEnrollment`

Links a student to a course with status tracking and FIFO waitlist support.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `course_id` | `UUID` | FK → `course.id`, NOT NULL | |
| `student_id` | `UUID` | FK → `user.id`, NOT NULL | Must have `student` role in school |
| `status` | `ENUM('pending_approval','approved','enrolled','waitlist','rejected','unenrolled','completed')` | NOT NULL, default `'pending_approval'` | |
| `waitlist_position` | `INTEGER` | NULLABLE | NULL unless status = `waitlist`; FIFO ordering |
| `rejection_reason` | `TEXT` | NULLABLE | Optional admin message on rejection |
| `enrolled_at` | `TIMESTAMPTZ` | NULLABLE | Timestamp when status → `enrolled` |
| `payment_id` | `VARCHAR(255)` | NULLABLE | External payment reference (e.g., invoice ID, transaction ID) for manual tracking |
| `payment_status` | `VARCHAR(50)` | NULLABLE | Manual payment status ('pending', 'paid', 'refunded') — school admin marks student payment receipt for fees processed outside the system |
| `requested_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | When student submitted request |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraints**: 
- `(course_id, student_id)` — one enrollment per student per course.
- `(course_id, waitlist_position) WHERE waitlist_position IS NOT NULL` — no duplicate positions in waitlist.

**FIFO rule**: `waitlist_position` assigned as `MAX(waitlist_position) + 1` for the course at time of waitlist entry; decremented when head-of-queue student is enrolled.
**Auto-enrollment trigger**: when an enrolled student unenrolls, the service promotes the lowest `waitlist_position` student to `enrolled`.

---

### 10. `StudentLessonEvaluation`

Records a student's PASS/FAIL result and instructor notes for a specific lesson.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `course_lesson_id` | `UUID` | FK → `course_lesson.id`, NOT NULL | |
| `student_id` | `UUID` | FK → `user.id`, NOT NULL | |
| `instructor_id` | `UUID` | FK → `user.id`, NOT NULL | Who recorded the evaluation |
| `result` | `ENUM('pass','fail')` | NULLABLE | NULL until submitted; required before lesson can be completed |
| `feedback_notes` | `TEXT` | NULLABLE | Visible to student after lesson completion; triggers email |
| `admin_notes` | `TEXT` | NULLABLE | Visible only to school admins and instructors; no email |
| `is_immutable` | `BOOLEAN` | NOT NULL, default `false` | Set to `true` when lesson `status → completed`; prevents further edits |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraint**: `(course_lesson_id, student_id)`.
**Note**: While `is_immutable` is managed at application layer, consider PostgreSQL triggers to enforce `BEFORE UPDATE` rejection when `is_immutable = true`.  
**Visibility rule**: `feedback_notes` visible to student only when `course_lesson.status = 'completed'`.  
**Immutability rule**: `is_immutable = true` after lesson completion; all update attempts rejected with HTTP 409.  
**Email trigger**: when `feedback_notes` is saved (not null, not blank), email notification queued to student.

---

### Weather Consideration

Not scheduled for the first release.

Integrate a simple weather check during lesson scheduling. Instead of a separate table, use an external API to fetch weather data directly when scheduling a lesson. If the weather conditions are unsuitable, the system will prevent scheduling and notify the instructor. This approach reduces complexity by avoiding additional database tables and focuses on real-time weather data retrieval.

---

## State Transition Diagrams

### `StudentEnrollment.status`

```
             ┌──────────────────────────────────────────────┐
             │                                              ▼
[request]→ pending_approval ──(approve, capacity)──→ enrolled ──(all lessons done)──→ completed
                │            ──(approve, full)────→ waitlist ──(spot opens, FIFO)──→ enrolled
                └────────────(reject)─────────────→ rejected
enrolled ────────────────────(unenroll)──────────→ unenrolled
```

### `CourseLesson.status`

```
not_started ──(instructor starts)──→ in_progress ──(evaluations complete)──→ completed
not_started / in_progress ──────────────────────────────────────────────────→ cancelled
```

### `Course.status`

```
upcoming ──(first lesson completed)──→ in_progress ──(all lessons completed)──→ completed
any ───────────────────────────────────────────────────────────────────────────→ cancelled
```

---

## Indexes (Performance)

| Table | Index | Purpose |
|-------|-------|---------|
| `user_role` | `(user_id, school_id)` | JWT → permission check |
| `course` | `(school_id, status)` | Admin dashboard listing |
| `course_lesson` | `(course_id, sequence_order)` | Ordered lesson list |
| `course_lesson` | `(start_time, location)` | Overbooking overlap query |
| `student_enrollment` | `(course_id, status)` | Roster + waitlist queries |
| `student_enrollment` | `(student_id, status)` | Student's enrolled courses |
| `instructor_assignment` | `(instructor_id, course_lesson_id)` | Schedule lookup |
| `student_lesson_evaluation` | `(course_lesson_id, student_id)` | Evaluation lookup |

---

## Validation Rules Summary

| Entity | Rule | Enforcement |
|--------|------|-------------|
| `UserRole` | `super_admin` requires `school_id IS NULL` | Service layer + DB CHECK |
| `UserRole` | School must retain ≥ 1 active `school_admin` | Service layer |
| `InstructorAssignment` | No overlapping `(instructor_id, location, time_window)` | Service layer (DB query) |
| `StudentEnrollment` | Unique `(course_id, student_id)` | DB UNIQUE constraint |
| `StudentEnrollment` | `waitlist_position` assigned FIFO | Service layer |
| `StudentLessonEvaluation` | `result` required before lesson mark-complete | Service layer |
| `StudentLessonEvaluation` | Immutable after `course_lesson.status = completed` | Service layer |
| `CourseLesson` | `duration_hours > 0` | DB CHECK constraint |
| `Lesson` | `duration_hours > 0` | DB CHECK constraint |
| `Course` | `max_students > 0` if set | DB CHECK constraint |
