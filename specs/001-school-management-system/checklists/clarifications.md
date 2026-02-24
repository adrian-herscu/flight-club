# Clarification Session Report: School Management System

**Session Date**: 24 February 2026  
**Feature**: School Management System for Paragliding and Hangliding Schools  
**Branch**: `001-school-management-system`  
**Status**: ✅ **Complete** - All critical ambiguities resolved

---

## Questions Asked & Answered: 5/5

### Q1: Lesson Duration and Scheduling Model
**Question**: How should the system handle lesson scheduling and conflict detection for overlapping instructor assignments?

**Answer**: Start time + duration model. Each CourseLesson has a scheduled start time and duration (in hours). Conflict detection calculates whether an instructor's new assignment overlaps with existing assignments by comparing the time window [start_time, start_time + duration] at the same location. Multiple instructors assigned to the same lesson do not extend the lesson duration.

**Spec Impact**: 
- Updated FR-010 to be more specific about conflict detection mechanism
- Enhanced CourseLesson entity with explicit time and duration attributes
- Added constraint that conflict checks are location-based

---

### Q2: Student Enrollment Approval Workflow
**Question**: Should student enrollment requests be automatically approved, manually reviewed, or use some other mechanism?

**Answer**: MVP uses explicit admin approval queue. When a student requests enrollment, the system creates a pending StudentEnrollment. School admins access a queue/dashboard to review requests and explicitly approve or reject. Rejected requests include an optional reason message shown to the student. Architecture is designed for future V2 payment integration where payment status will also factor into auto-approval rules; StudentEnrollment entity includes optional payment_id and payment_status fields.

**Spec Impact**:
- Updated FR-007 to specify approval/rejection mechanism with reason
- Updated FR-008 to clarify students request enrollment → pending state
- Enhanced StudentEnrollment entity with payment fields for future extensibility
- Aligns with user's intent to support payment integration in V2

---

### Q3: Course Capacity and Enrollment Limits  
**Question**: Should courses have enrollment capacity limits, and how should the system handle oversubscription?

**Answer**: Optional capacity limit with FIFO waitlist. During course creation, admins can set an optional max_students limit. When a course reaches capacity, further approved enrollments are placed in a "waitlist" status with FIFO ordering. Waitlist students are automatically promoted to "enrolled" status when capacity becomes available through: (a) another student being unenrolled, or (b) when an identical or similar course is created. If no max_students is set, the course allows unlimited enrollment.

**Spec Impact**:
- Added FR-023: Support for optional course capacity limits
- Added FR-024: FIFO waitlist management when at capacity
- Added FR-025: Automatic waitlist promotion on capacity availability
- Enhanced StudentEnrollment entity with "waitlist" status and position field
- Edge case coverage expanded for oversubscribed courses

---

### Q4: Instructor Notes Visibility and Timing
**Question**: When are instructor notes about students visible, and who can see them?

**Answer**: Notes are visible only after the lesson is marked complete by the instructor. Notes are categorized into two types:
- **"feedback"**: Visible to the student after lesson completion; triggers email notification to student with the notes
- **"admin-only"**: Visible only to school admins and instructors; does not trigger notification to student

Instructors can write and update notes before the lesson is marked complete; notes become immutable after completion.

**Spec Impact**:
- Updated FR-012 to specify note categorization and visibility
- Enhanced StudentLessonEvaluation entity with categorized notes and immutability rules
- Clarifies when notifications trigger (only for feedback notes)
- Aligns with educational best practices

---

### Q5: School Admin Management and Permissions
**Question**: Do all school admins have the same permissions, or is there a hierarchy? What prevents accidental deletion of all admins?

**Answer**: All school admins within a school have equal permissions (no admin hierarchy). Each admin can perform all actions: manage courses, students, instructors, and view all school data. The system prevents deletion of the last active admin in a school; at least one admin must remain active at all times. Attempting to deactivate/delete the last admin shows an error message and requires assignment of a replacement admin first.

**Spec Impact**:
- Added FR-026: Equal admin permissions (no hierarchy)
- Added FR-027: Prevents deletion of last active admin
- Operational safeguard to prevent school lockout
- Simplifies permission management in MVP

---

## Validation Results

### Content Quality
- ✅ All clarifications recorded in Clarifications section with question and answer
- ✅ Updates applied to relevant requirements and entities
- ✅ No contradictions introduced; all changes are additive or clarifying
- ✅ No new ambiguities created

### Requirement Completeness
- ✅ Functional requirements increased from 22 to 27 (5 new requirements added)
- ✅ All new requirements are specific and testable
- ✅ No "NEEDS CLARIFICATION" markers remain
- ✅ Success criteria remain valid and measurable with clarifications

### Taxonomy Coverage

| Category | Status | Notes |
|----------|--------|-------|
| **Functional Scope & Behavior** | ✅ Resolved | All user workflows fully specified with decision points clarified |
| **Domain & Data Model** | ✅ Resolved | Entities include timing, capacity, notification, and permission details |
| **Interaction & UX Flow** | ✅ Resolved | Approval flows, note visibility, and waitlist behavior defined |
| **Non-Functional Quality Attributes** | ✅ Clear | Performance targets (SC-001 through SC-012), scale assumptions documented |
| **Integration & External Dependencies** | ✅ Clear | Payment/messaging integrations designed with extension points; FRs clear |
| **Edge Cases & Failure Handling** | ✅ Clear | Overbooking prevention (FR-010), last-admin protection (FR-027), waitlist FIFO |
| **Constraints & Tradeoffs** | ✅ Clear | Assumptions document SaaS model, web-only, no real-time, MVP vs V2 boundaries |
| **Terminology & Consistency** | ✅ Clear | Terms consistent: "pending-approval", "enrolled", "waitlist", "feedback"/"admin-only" |
| **Completion Signals** | ✅ Clear | Success criteria testable; acceptance scenarios in user stories measurable |

**Overall**: All 9 categories clear or resolved. No outstanding ambiguities.

---

## Specification Enhancement Summary

### Functional Requirements
- **Before**: 22 FRs  
- **After**: 27 FRs (5 new added)
- **New FRs**: FR-023 through FR-027 covering capacity, waitlist, admin permissions

### Entities Enhanced
- **CourseLesson**: Added explicit start_time, duration, location-based conflict model
- **StudentEnrollment**: Added waitlist status, position field, payment fields, rejection_reason
- **StudentLessonEvaluation**: Added note categorization (feedback vs admin-only), immutability model

### User Stories Unaffected
- All 14 user stories remain valid
- Clarifications support and detail the acceptance scenarios already defined

### Ready for Planning
- ✅ Specification is unambiguous and complete
- ✅ All clarifications documented in Clarifications section
- ✅ Data model is well-defined
- ✅ User workflows are concrete with decision points specified
- ✅ Non-functional requirements are measurable
- ✅ Architecture can now support implementation planning

---

## Next Steps

**Recommended**: Proceed to implementation planning using `/speckit.plan`

The clarified specification is ready for:
1. ✅ Detailed implementation planning (architecture, tech stack, task breakdown)
2. ✅ Test case design (all acceptance scenarios are testable)
3. ✅ Development team review (all ambiguities resolved)
4. ✅ Scope confirmation with stakeholders (V1 vs V2 boundaries clear)
