-- DropForeignKey
ALTER TABLE "instructor_assignments" DROP CONSTRAINT "fk_instructor_assignment_lesson_course";

-- AlterTable
ALTER TABLE "syllabuses" ADD COLUMN     "parent_syllabus_id" INTEGER,
ADD COLUMN     "school_id" INTEGER;

-- CreateIndex
CREATE INDEX "syllabuses_school_id_idx" ON "syllabuses"("school_id");

-- CreateIndex
CREATE INDEX "syllabuses_parent_syllabus_id_idx" ON "syllabuses"("parent_syllabus_id");

-- AddForeignKey
ALTER TABLE "syllabuses" ADD CONSTRAINT "syllabuses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabuses" ADD CONSTRAINT "syllabuses_parent_syllabus_id_fkey" FOREIGN KEY ("parent_syllabus_id") REFERENCES "syllabuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
