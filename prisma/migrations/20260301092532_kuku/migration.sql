-- DropForeignKey
ALTER TABLE "instructor_assignments" DROP CONSTRAINT "fk_instructor_assignment_lesson_course";

-- DropIndex
DROP INDEX "uq_course_lessons_id_course_id";
