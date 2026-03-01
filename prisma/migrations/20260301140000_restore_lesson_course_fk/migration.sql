-- Restore cross-table invariant removed by schema-diff migration
-- Keep instructor_assignments.course_lesson_id aligned with course_id.

CREATE UNIQUE INDEX IF NOT EXISTS "uq_course_lessons_id_course_id"
  ON "course_lessons"("id", "course_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_instructor_assignment_lesson_course'
      AND conrelid = 'instructor_assignments'::regclass
  ) THEN
    ALTER TABLE "instructor_assignments"
      ADD CONSTRAINT "fk_instructor_assignment_lesson_course"
      FOREIGN KEY ("course_lesson_id", "course_id")
      REFERENCES "course_lessons"("id", "course_id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END;
$$;
