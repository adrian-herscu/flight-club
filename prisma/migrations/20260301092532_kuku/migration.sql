-- DropForeignKey
ALTER TABLE "instructor_assignments" DROP CONSTRAINT IF EXISTS "fk_instructor_assignment_lesson_course";

-- DropIndex
DROP INDEX IF EXISTS "uq_course_lessons_id_course_id";
