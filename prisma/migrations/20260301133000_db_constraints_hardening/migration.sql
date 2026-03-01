-- Constraint hardening: move critical invariants to PostgreSQL

-- 1) Numeric/domain sanity checks
ALTER TABLE "courses"
  ADD CONSTRAINT "chk_courses_date_range"
  CHECK ("start_date" < "end_date");

ALTER TABLE "courses"
  ADD CONSTRAINT "chk_courses_max_students_positive"
  CHECK ("max_students" > 0);

ALTER TABLE "lessons"
  ADD CONSTRAINT "chk_lessons_order_positive"
  CHECK ("order" > 0);

ALTER TABLE "course_lessons"
  ADD CONSTRAINT "chk_course_lessons_duration_positive"
  CHECK ("duration_hours" > 0);

ALTER TABLE "course_lessons"
  ADD CONSTRAINT "chk_course_lessons_sequence_order_positive"
  CHECK ("sequence_order" > 0);

-- 2) Uniqueness and filtered uniqueness
CREATE UNIQUE INDEX "uq_lesson_syllabus_order"
  ON "lessons"("syllabus_id", "order");

CREATE UNIQUE INDEX "uq_active_enrollment_per_course_student"
  ON "student_enrollments"("course_id", "student_id")
  WHERE "status" <> 'rejected';

-- 3) Role scope consistency
-- Normalize legacy data: SUPER_ADMIN roles must be global (school_id NULL)
UPDATE "user_roles"
SET "school_id" = NULL
WHERE "role_type" = 'SUPER_ADMIN' AND "school_id" IS NOT NULL;

-- Guard against invalid non-super-admin rows with NULL school_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user_roles"
    WHERE "role_type" <> 'SUPER_ADMIN' AND "school_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce role scope constraint: found non-super-admin roles with NULL school_id';
  END IF;
END;
$$;

ALTER TABLE "user_roles"
  ADD CONSTRAINT "chk_user_roles_super_admin_scope"
  CHECK (
    ("role_type" = 'SUPER_ADMIN' AND "school_id" IS NULL)
    OR
    ("role_type" <> 'SUPER_ADMIN' AND "school_id" IS NOT NULL)
  );

-- 4) Cross-table invariant: lesson assignment must belong to same course
CREATE UNIQUE INDEX "uq_course_lessons_id_course_id"
  ON "course_lessons"("id", "course_id");

ALTER TABLE "instructor_assignments"
  ADD CONSTRAINT "fk_instructor_assignment_lesson_course"
  FOREIGN KEY ("course_lesson_id", "course_id")
  REFERENCES "course_lessons"("id", "course_id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 5) Prevent mutating published syllabuses at DB level
CREATE OR REPLACE FUNCTION prevent_final_syllabus_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'FINAL' THEN
    RAISE EXCEPTION 'Cannot modify a published syllabus (id=%)', OLD.id
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' AND OLD.status = 'FINAL' THEN
    RAISE EXCEPTION 'Cannot delete a published syllabus (id=%)', OLD.id
      USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_final_syllabus_mutation
  BEFORE UPDATE OR DELETE ON "syllabuses"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_final_syllabus_mutation();

-- 6) Prevent lesson changes on published syllabuses
CREATE OR REPLACE FUNCTION prevent_lesson_changes_on_published_syllabus()
RETURNS trigger AS $$
DECLARE
  target_syllabus_id INT;
  syllabus_status "syllabusstatus";
BEGIN
  target_syllabus_id := COALESCE(NEW."syllabus_id", OLD."syllabus_id");

  SELECT s.status INTO syllabus_status
  FROM "syllabuses" s
  WHERE s.id = target_syllabus_id;

  IF syllabus_status = 'FINAL' THEN
    RAISE EXCEPTION 'Cannot modify lessons of a published syllabus (syllabus_id=%)', target_syllabus_id
      USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_lesson_changes_on_published_syllabus
  BEFORE INSERT OR UPDATE OR DELETE ON "lessons"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_lesson_changes_on_published_syllabus();

-- 7) Prevent publishing without at least one lesson
CREATE OR REPLACE FUNCTION enforce_publishable_syllabus()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'FINAL' AND NEW.status = 'FINAL' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "lessons" l
      WHERE l."syllabus_id" = NEW.id
      LIMIT 1
    ) THEN
      RAISE EXCEPTION 'Cannot publish syllabus without lessons (id=%)', NEW.id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_publishable_syllabus
  BEFORE UPDATE OF "status" ON "syllabuses"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_publishable_syllabus();

-- 8) Enforce at least one school ADMIN (deferred, transaction-safe)
CREATE OR REPLACE FUNCTION ensure_school_has_admin()
RETURNS trigger AS $$
DECLARE
  target_school_id INT;
BEGIN
  -- Apply only when an ADMIN role is removed from a school
  IF TG_OP = 'DELETE' THEN
    IF OLD."role_type" <> 'ADMIN' OR OLD."school_id" IS NULL THEN
      RETURN NULL;
    END IF;
    target_school_id := OLD."school_id";
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."role_type" <> 'ADMIN' OR OLD."school_id" IS NULL THEN
      RETURN NULL;
    END IF;

    -- No effective admin removal from original school
    IF NEW."role_type" = 'ADMIN' AND NEW."school_id" = OLD."school_id" THEN
      RETURN NULL;
    END IF;

    target_school_id := OLD."school_id";
  ELSE
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "user_roles" ur
    WHERE ur."school_id" = target_school_id
      AND ur."role_type" = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Cannot remove the last admin from school %', target_school_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_ensure_school_has_admin
  AFTER DELETE OR UPDATE OF "role_type", "school_id" ON "user_roles"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION ensure_school_has_admin();
