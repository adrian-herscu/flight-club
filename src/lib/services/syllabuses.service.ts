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
  try {
    const updated = await prisma.syllabus.updateMany({
      where: {
        id,
        status: { not: "FINAL" },
      },
      data: {
        status: "FINAL",
        finalizedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new APIError("CONFLICT", "Syllabus is already published or not found");
    }

    return prisma.syllabus.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    })!;
  } catch (error: any) {
    if (error.code === "P2004") {
      throw new APIError("CONFLICT", "Cannot publish syllabus without lessons");
    }
    throw error;
  }
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
    if (error.code === "P2003") {
      throw new APIError("NOT_FOUND", "Syllabus not found");
    }
    if (error.code === "P2004") {
      throw new APIError("CONFLICT", "Cannot add lessons to published syllabuses");
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
  try {
    return await prisma.lesson.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
      },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new APIError("NOT_FOUND", "Lesson not found");
    }
    if (error.code === "P2004") {
      throw new APIError("CONFLICT", "Cannot edit lessons in published syllabuses");
    }
    throw error;
  }
}

export async function updateLessonOrder(id: number, newOrder: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id },
        select: { id: true, syllabusId: true, order: true },
      });

      if (!lesson) {
        throw new APIError("NOT_FOUND", "Lesson not found");
      }

      const currentOrder = lesson.order;

      if (currentOrder === newOrder) {
        return tx.lesson.findUniqueOrThrow({ where: { id } });
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
  } catch (error: any) {
    if (error.code === "P2004") {
      throw new APIError("CONFLICT", "Cannot reorder lessons in published syllabuses");
    }
    if (error.code === "P2002") {
      throw new APIError("CONFLICT", "Lesson order conflict");
    }
    throw error;
  }
}

export async function deleteLesson(id: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id },
        select: {
          id: true,
          syllabusId: true,
          title: true,
          description: true,
          order: true,
          createdAt: true,
        },
      });

      if (!lesson) {
        throw new APIError("NOT_FOUND", "Lesson not found");
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
  } catch (error: any) {
    if (error.code === "P2004") {
      throw new APIError("CONFLICT", "Cannot delete lessons from published syllabuses");
    }
    throw error;
  }
}

export async function getSyllabusLessons(syllabusId: number) {
  return prisma.lesson.findMany({
    where: { syllabusId },
    orderBy: { order: "asc" },
  });
}
