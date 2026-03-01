import { APIError } from "../errors";
import { prisma } from "../prisma";

/**
 * Syllabuses Service - Works with actual Prisma schema
 * Maps to: Syllabus and Lesson models
 */

export async function createSyllabus(data: { title: string; description?: string }) {
  return prisma.syllabus.create({
    data: {
      title: data.title,
      description: data.description,
      status: "DRAFT",
      version: 1,
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function getSyllabusById(id: number) {
  const syllabus = await prisma.syllabus.findUnique({
    where: { id },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!syllabus) {
    throw new APIError("NOT_FOUND", "Syllabus not found");
  }

  return syllabus;
}

export async function getSchoolSyllabuses(schoolId: number) {
  // Get all courses for this school
  const courses = await prisma.course.findMany({
    where: { schoolId },
    select: { syllabusId: true },
  });

  const syllabusIds = Array.from(new Set(courses.map((c) => c.syllabusId)));

  return prisma.syllabus.findMany({
    where: { id: { in: syllabusIds } },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateSyllabus(
  id: number,
  data: {
    title?: string;
    description?: string;
  },
) {
  const updated = await prisma.syllabus.updateMany({
    where: {
      id,
      status: { not: "FINAL" },
    },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
    },
  });

  if (updated.count === 0) {
    throw new APIError(
      "CONFLICT",
      "Cannot update syllabus - it may not exist or is already published",
    );
  }

  return prisma.syllabus.findUnique({
    where: { id },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  })!;
}

export async function publishSyllabus(id: number) {
  const syllabus = await prisma.syllabus.findUnique({
    where: { id },
    include: {
      _count: { select: { lessons: true } },
    },
  });

  if (!syllabus) {
    throw new APIError("NOT_FOUND", "Syllabus not found");
  }

  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Syllabus is already published");
  }

  if (syllabus._count.lessons === 0) {
    throw new APIError("CONFLICT", "Cannot publish syllabus without lessons");
  }

  return prisma.syllabus.update({
    where: { id },
    data: {
      status: "FINAL",
      finalizedAt: new Date(),
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function deleteSyllabus(id: number) {
  return prisma.$transaction(async (tx) => {
    const syllabus = await tx.syllabus.findUnique({
      where: { id },
      include: {
        _count: { select: { courses: true } },
      },
    });

    if (!syllabus) {
      throw new APIError("NOT_FOUND", "Syllabus not found");
    }

    if (syllabus._count.courses > 0) {
      throw new APIError("CONFLICT", "Cannot delete syllabus used in existing courses");
    }

    await tx.lesson.deleteMany({
      where: { syllabusId: id },
    });

    return tx.syllabus.delete({
      where: { id },
    });
  });
}

/**
 * LESSONS
 */

export async function addLesson(data: {
  syllabusId: number;
  title: string;
  description?: string;
  order: number;
}) {
  const syllabus = await prisma.syllabus.findUnique({
    where: { id: data.syllabusId },
    select: { status: true },
  });

  if (!syllabus) {
    throw new APIError("NOT_FOUND", "Syllabus not found");
  }

  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Cannot add lessons to published syllabuses");
  }

  try {
    return await prisma.lesson.create({
      data: {
        syllabusId: data.syllabusId,
        title: data.title,
        description: data.description,
        order: data.order,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new APIError(
        "CONFLICT",
        "Lesson with this order already exists. Use updateLessonOrder to reorder.",
      );
    }
    throw error;
  }
}

export async function getLessonById(id: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
  });

  if (!lesson) {
    throw new APIError("NOT_FOUND", "Lesson not found");
  }

  return lesson;
}

export async function updateLesson(
  id: number,
  data: {
    title?: string;
    description?: string;
  },
) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id,
      syllabus: { status: { not: "FINAL" } },
    },
    select: { id: true },
  });

  if (!lesson) {
    throw new APIError(
      "CONFLICT",
      "Cannot edit lesson - it may not exist or syllabus is published",
    );
  }

  return prisma.lesson.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
    },
  });
}

export async function updateLessonOrder(id: number, newOrder: number) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({
      where: { id },
      include: { syllabus: { select: { status: true } } },
    });

    if (!lesson) {
      throw new APIError("NOT_FOUND", "Lesson not found");
    }

    if (lesson.syllabus.status === "FINAL") {
      throw new APIError("CONFLICT", "Cannot reorder lessons in published syllabuses");
    }

    const currentOrder = lesson.order;

    if (currentOrder === newOrder) {
      return lesson;
    }

    // Shift lessons between old and new position
    if (newOrder < currentOrder) {
      // Moving up: shift others down
      await tx.lesson.updateMany({
        where: {
          syllabusId: lesson.syllabusId,
          order: { gte: newOrder, lt: currentOrder },
        },
        data: { order: { increment: 1 } },
      });
    } else {
      // Moving down: shift others up
      await tx.lesson.updateMany({
        where: {
          syllabusId: lesson.syllabusId,
          order: { gt: currentOrder, lte: newOrder },
        },
        data: { order: { decrement: 1 } },
      });
    }

    // Update the moved lesson
    return tx.lesson.update({
      where: { id },
      data: { order: newOrder },
    });
  });
}

export async function deleteLesson(id: number) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({
      where: { id },
      include: { syllabus: { select: { status: true } } },
    });

    if (!lesson) {
      throw new APIError("NOT_FOUND", "Lesson not found");
    }

    if (lesson.syllabus.status === "FINAL") {
      throw new APIError("CONFLICT", "Cannot delete lessons from published syllabuses");
    }

    // Delete lesson
    await tx.lesson.delete({
      where: { id },
    });

    // Shift remaining lessons up
    await tx.lesson.updateMany({
      where: {
        syllabusId: lesson.syllabusId,
        order: { gt: lesson.order },
      },
      data: { order: { decrement: 1 } },
    });

    return lesson;
  });
}

export async function getSyllabusLessons(syllabusId: number) {
  return prisma.lesson.findMany({
    where: { syllabusId },
    orderBy: { order: "asc" },
  });
}
