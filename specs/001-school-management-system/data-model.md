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
| `school_id` | `UUID` | FK → `school.id`, NULLABLE | NULL for `super_admin` |
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

Two-tier course template system: super-admins create system-wide **prototypes** (school_id IS NULL); school-admins copy prototypes to create **school-specific syllabuses** (school_id NOT NULL) which they can edit. Each school's syllabus is exclusive to that school.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `school_id` | `UUID` | FK → `school.id`, NULLABLE | NULL = system-wide prototype (read-only to schools); NOT NULL = school-specific (editable by school admins only) |
| `source_syllabus_id` | `UUID` | FK → `syllabus.id`, NULLABLE | Lineage pointer: for a copied syllabus, points to the immediate source (prototype or prior version). Null = created from scratch or is itself a prototype. |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `discipline` | `VARCHAR(50)` | NOT NULL, default `'paragliding_hangliding'` | |
| `created_by` | `UUID` | FK → `user.id`, NOT NULL | Super-admin (if school_id NULL) or school-admin (if school_id NOT NULL) |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Soft-delete; inactive syllabuses not shown in browse |
| `version` | `INTEGER` | NOT NULL, default `1` | Immutable once created. Editing creates a new syllabus row with `version = source.version + 1`. Courses created from version N freeze lessons at that version; later edits don't affect them. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Unique constraint**: `(school_id, title, version)` — allows multiple versions of the same syllabus title within a school or prototype lineage.
**Business rule — Current version computation**: "Current" (latest) syllabus is determined at query time as the row with maximum `version` for each `(school_id, title)`. This avoids race conditions from concurrent edits. Query pattern: `SELECT * FROM syllabus WHERE (school_id, title) = (?, ?) AND is_active = true ORDER BY version DESC LIMIT 1`.

**Ownership & Visibility**:
- **System-wide prototype** (`school_id IS NULL`): Created by super-admin. All school-admins can browse, view, and **copy**. Cannot edit, delete, or use directly in course creation (must copy first).
- **School-specific** (`school_id NOT NULL`): Created by school-admin (via copy or from scratch). Only that school's admins can browse, view, edit, delete, or use in course creation. Completely exclusive to that school.

**Edit & Versioning**:
- `version` is immutable once created.
- Editing a syllabus creates a new row: copy lessons, set `source_syllabus_id = previous.id`, set `version = previous.version + 1`, set `is_current = true`, and flip the previous row’s `is_current = false`.
- Courses reference a syllabus version at creation time (lessons have nullable `source_lesson_id` FK + parent syllabus version).
- Subsequent edits do not affect courses created from prior versions.

**Copy Workflow**:
- School-admin browses system-wide prototypes → selects one → requests copy.
- System creates new Syllabus row: `school_id = requester's school`, copies all Lesson rows, sets `source_syllabus_id = prototype_id`, `version = 1`, `created_by = requester`.
- School-admin can now edit this syllabus's title, lessons, description.
- Other schools cannot see this copied syllabus.

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
| `syllabus_id` | `UUID` | FK → `syllabus.id`, NOT NULL | Must reference a school-specific syllabus (school_id NOT NULL) or a system-wide prototype. Cannot be NULL. |
| `syllabus_version` | `INTEGER` | NOT NULL | Version of the syllabus at time of course creation. Lessons frozen at this version; later syllabus edits don't affect this course. |
| `title` | `VARCHAR(255)` | NOT NULL | May differ from syllabus title |
| `description` | `TEXT` | NULLABLE | |
| `status` | `ENUM('upcoming','in_progress','completed','cancelled')` | NOT NULL, default `'upcoming'` | |
| `max_students` | `INTEGER` | NULLABLE, CHECK `> 0` | NULL = unlimited |
| `created_by` | `UUID` | FK → `user.id`, NOT NULL | School admin who created it |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Business rule**: `status` transitions `upcoming → in_progress → completed`; `cancelled` can be set from any state.  
**Derived**: `status` updated to `in_progress` when first `CourseLesson` is marked `completed`; to `completed` when all `CourseLesson` rows are `completed`.  
**Lesson copying**: When course is created, all Lesson rows from the syllabus are copied into CourseLesson rows at `syllabus_version`. If the syllabus is later edited (lessons added/removed/reordered), courses created from prior versions are unaffected.

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

**Unique constraint**: `(course_id, student_id)`.  
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
**Visibility rule**: `feedback_notes` visible to student only when `course_lesson.status = 'completed'`.  
**Immutability rule**: `is_immutable = true` after lesson completion; all update attempts rejected with HTTP 409.  
**Email trigger**: when `feedback_notes` is saved (not null, not blank), email notification queued to student.

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
