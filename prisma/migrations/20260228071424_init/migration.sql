-- CreateEnum
CREATE TYPE "roletype" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "syllabusstatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "coursestatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "courselessonstatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "enrollmentstatus" AS ENUM ('pending_approval', 'enrolled', 'waitlist', 'rejected', 'unenrolled');

-- CreateEnum
CREATE TYPE "evaluationresult" AS ENUM ('pass', 'fail', 'not_attempted');

-- CreateTable
CREATE TABLE "schools" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "auth_provider" VARCHAR(50) NOT NULL,
    "auth_provider_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" INTEGER,
    "role_type" "roletype" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabuses" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "syllabusstatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(3),

    CONSTRAINT "syllabuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "syllabus_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "syllabus_id" INTEGER NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "description" VARCHAR(1024),
    "max_students" INTEGER NOT NULL,
    "status" "coursestatus" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lessons" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" VARCHAR(1024),
    "start_time" TIMESTAMP(3),
    "duration_hours" DOUBLE PRECISION NOT NULL,
    "location" VARCHAR(256),
    "sequence_order" INTEGER NOT NULL,
    "status" "courselessonstatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "status" "enrollmentstatus" NOT NULL,
    "rejection_reason" TEXT,
    "waitlist_position" INTEGER,
    "payment_id" VARCHAR(256),
    "payment_status" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructor_assignments" (
    "id" SERIAL NOT NULL,
    "instructor_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "course_lesson_id" INTEGER,
    "school_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_lesson_evaluations" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "enrollment_id" INTEGER NOT NULL,
    "course_lesson_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "result" "evaluationresult" DEFAULT 'not_attempted',
    "feedback_notes" TEXT,
    "admin_notes" TEXT,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(3),

    CONSTRAINT "student_lesson_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "ix_users_auth_provider_id" ON "users"("auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_school_role" ON "user_roles"("user_id", "school_id", "role_type");

-- CreateIndex
CREATE INDEX "ix_courses_school_id" ON "courses"("school_id");

-- CreateIndex
CREATE INDEX "ix_courses_status" ON "courses"("status");

-- CreateIndex
CREATE INDEX "ix_course_lessons_course_id" ON "course_lessons"("course_id");

-- CreateIndex
CREATE INDEX "ix_course_lessons_status" ON "course_lessons"("status");

-- CreateIndex
CREATE INDEX "ix_course_lessons_location_start" ON "course_lessons"("location", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "uq_course_sequence_order" ON "course_lessons"("course_id", "sequence_order");

-- CreateIndex
CREATE INDEX "ix_enrollments_student_id" ON "student_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "ix_enrollments_course_id" ON "student_enrollments"("course_id");

-- CreateIndex
CREATE INDEX "ix_enrollments_status" ON "student_enrollments"("status");

-- CreateIndex
CREATE INDEX "ix_enrollments_school_id" ON "student_enrollments"("school_id");

-- CreateIndex
CREATE INDEX "ix_enrollments_waitlist" ON "student_enrollments"("course_id", "status", "waitlist_position");

-- CreateIndex
CREATE INDEX "ix_instructor_assignments_instructor_id" ON "instructor_assignments"("instructor_id");

-- CreateIndex
CREATE INDEX "ix_instructor_assignments_course_id" ON "instructor_assignments"("course_id");

-- CreateIndex
CREATE INDEX "ix_instructor_assignments_lesson_id" ON "instructor_assignments"("course_lesson_id");

-- CreateIndex
CREATE INDEX "ix_instructor_assignments_school_id" ON "instructor_assignments"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_course_level_assignment" ON "instructor_assignments"("instructor_id", "course_id");

-- CreateIndex
CREATE INDEX "ix_student_lesson_evaluations_student_id" ON "student_lesson_evaluations"("student_id");

-- CreateIndex
CREATE INDEX "ix_student_lesson_evaluations_course_lesson_id" ON "student_lesson_evaluations"("course_lesson_id");

-- CreateIndex
CREATE INDEX "ix_student_lesson_evaluations_school_id" ON "student_lesson_evaluations"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_student_lesson_evaluation" ON "student_lesson_evaluations"("student_id", "course_lesson_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "syllabuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "syllabuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_assignments" ADD CONSTRAINT "instructor_assignments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_assignments" ADD CONSTRAINT "instructor_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_assignments" ADD CONSTRAINT "instructor_assignments_course_lesson_id_fkey" FOREIGN KEY ("course_lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_assignments" ADD CONSTRAINT "instructor_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_evaluations" ADD CONSTRAINT "student_lesson_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_evaluations" ADD CONSTRAINT "student_lesson_evaluations_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_evaluations" ADD CONSTRAINT "student_lesson_evaluations_course_lesson_id_fkey" FOREIGN KEY ("course_lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_evaluations" ADD CONSTRAINT "student_lesson_evaluations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
