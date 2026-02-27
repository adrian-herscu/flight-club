"""Create courses, enrollments, and instructor assignments tables

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-03 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create courses table
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("syllabus_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("max_students", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "in_progress", "completed", "cancelled", name="coursestatus"
            ),
            nullable=False,
        ),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["syllabus_id"], ["syllabuses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_courses_school_id", "school_id"),
        sa.Index("ix_courses_status", "status"),
    )

    # Create course_lessons table
    op.create_table(
        "course_lessons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("duration_hours", sa.Float(), nullable=False),
        sa.Column("location", sa.String(length=256), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "scheduled",
                "in_progress",
                "completed",
                "cancelled",
                name="courselessonstatus",
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_course_lessons_course_id", "course_id"),
        sa.Index("ix_course_lessons_status", "status"),
        sa.Index(
            "ix_course_lessons_location_start", ["location", "start_time"]
        ),  # For conflict detection
        sa.UniqueConstraint(
            "course_id", "sequence_order", name="uq_course_sequence_order"
        ),
    )

    # Create student_enrollments table
    op.create_table(
        "student_enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending_approval",
                "enrolled",
                "waitlist",
                "rejected",
                "unenrolled",
                name="enrollmentstatus",
            ),
            nullable=False,
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("waitlist_position", sa.Integer(), nullable=True),
        sa.Column("payment_id", sa.String(length=256), nullable=True),
        sa.Column("payment_status", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_enrollments_student_id", "student_id"),
        sa.Index("ix_enrollments_course_id", "course_id"),
        sa.Index("ix_enrollments_status", "status"),
        sa.Index("ix_enrollments_school_id", "school_id"),
        sa.Index(
            "ix_enrollments_waitlist", ["course_id", "status", "waitlist_position"]
        ),  # For FIFO promotion
    )

    # Create instructor_assignments table
    op.create_table(
        "instructor_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("instructor_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("course_lesson_id", sa.Integer(), nullable=True),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["course_lesson_id"], ["course_lessons.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["instructor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_instructor_assignments_instructor_id", "instructor_id"),
        sa.Index("ix_instructor_assignments_course_id", "course_id"),
        sa.Index("ix_instructor_assignments_lesson_id", "course_lesson_id"),
        sa.Index("ix_instructor_assignments_school_id", "school_id"),
        sa.UniqueConstraint(
            "instructor_id", "course_id", name="uq_course_level_assignment"
        ),  # Only one course-level assignment per instructor per course
    )

    # Create student_lesson_evaluations table
    op.create_table(
        "student_lesson_evaluations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("enrollment_id", sa.Integer(), nullable=False),
        sa.Column("course_lesson_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column(
            "result",
            sa.Enum("pass", "fail", "not_attempted", name="evaluationresult"),
            nullable=False,
        ),
        sa.Column("feedback_notes", sa.Text(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("is_finalized", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("finalized_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["course_lesson_id"], ["course_lessons.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["enrollment_id"], ["student_enrollments.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_evaluations_student_id", "student_id"),
        sa.Index("ix_evaluations_enrollment_id", "enrollment_id"),
        sa.Index("ix_evaluations_lesson_id", "course_lesson_id"),
        sa.Index("ix_evaluations_school_id", "school_id"),
        sa.UniqueConstraint(
            "enrollment_id", "course_lesson_id", name="uq_enrollment_lesson_evaluation"
        ),  # One evaluation per student per lesson
    )


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_table("student_lesson_evaluations")
    op.drop_table("instructor_assignments")
    op.drop_table("student_enrollments")
    op.drop_table("course_lessons")
    op.drop_table("courses")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS coursestatus")
    op.execute("DROP TYPE IF EXISTS courselessonstatus")
    op.execute("DROP TYPE IF EXISTS enrollmentstatus")
    op.execute("DROP TYPE IF EXISTS evaluationresult")
