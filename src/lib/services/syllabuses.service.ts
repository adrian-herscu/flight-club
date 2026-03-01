import { APIError } from "../errors";
import { prisma } from "../prisma";
import { requireNotNull } from "../require-not-null";

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

  return requireNotNull(syllabus, "Syllabus not found");
}

export async function getAllSyllabuses() {
  return prisma.syllabus.findMany({
    include: {
      _count: {
        select: { lessons: true },
      },
      lessons: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSchoolSyllabuses(schoolId: number) {
  // Return all FINAL syllabuses that are:
  // 1. System syllabuses (school_id = null)
  // 2. School-specific syllabuses (school_id = schoolId)
  // Per spec: "school admins see the latest final versions of (their school's own syllabuses + system admin syllabuses)"
  return prisma.syllabus.findMany({
    where: {
      status: "FINAL",
      OR: [
        { schoolId: null }, // System syllabuses
        { schoolId: schoolId }, // School-specific syllabuses
      ],
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: { lessons: true },
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
}

/**
 * Create a new Draft version from a FINAL syllabus
 * Per spec: "Editing a final version automatically creates a new Draft as its child"
 */
export async function createDraftFromFinal(parentId: number) {
  return prisma.$transaction(async (tx) => {
    // Get the parent syllabus
    const parent = await tx.syllabus.findUnique({
      where: { id: parentId },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!parent) {
      throw new APIError("NOT_FOUND", "Parent syllabus not found");
    }

    if (parent.status !== "FINAL") {
      throw new APIError("CONFLICT", "Can only create new version from FINAL syllabus");
    }

    // Check if a draft child already exists
    const existingDraft = await tx.syllabus.findFirst({
      where: {
        parentSyllabusId: parentId,
        status: "DRAFT",
      },
    });

    if (existingDraft) {
      throw new APIError("CONFLICT", "A draft version already exists for this syllabus");
    }

    // Create new draft syllabus
    const newDraft = await tx.syllabus.create({
      data: {
        title: parent.title,
        description: parent.description,
        status: "DRAFT",
        version: (parent.version || 1) + 1,
        schoolId: parent.schoolId,
        parentSyllabusId: parentId,
      },
    });

    // Copy all lessons from parent to new draft
    if (parent.lessons.length > 0) {
      await tx.lesson.createMany({
        data: parent.lessons.map((lesson) => ({
          syllabusId: newDraft.id,
          title: lesson.title,
          description: lesson.description,
          order: lesson.order,
        })),
      });
    }

    // Return the new draft with lessons
    return tx.syllabus.findUnique({
      where: { id: newDraft.id },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    });
  });
}

export async function deleteSyllabus(id: number) {
  return prisma.$transaction(async (tx) => {
    const syllabusRaw = await tx.syllabus.findUnique({
      where: { id },
      include: {
        _count: { select: { courses: true } },
      },
    });

    const syllabus = requireNotNull(syllabusRaw, "Syllabus not found");

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
  return await prisma.lesson.create({
    data: {
      syllabusId: data.syllabusId,
      title: data.title,
      description: data.description,
      order: data.order,
    },
  });
}

export async function getLessonById(id: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
  });

  return requireNotNull(lesson, "Lesson not found");
}

export async function updateLesson(
  id: number,
  data: {
    title?: string;
    description?: string;
  },
) {
  return await prisma.lesson.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
    },
  });
}

export async function updateLessonOrder(id: number, newOrder: number) {
  return await prisma.$transaction(async (tx) => {
    const lessonRaw = await tx.lesson.findUnique({
      where: { id },
      select: { id: true, syllabusId: true, order: true },
    });

    const lesson = requireNotNull(lessonRaw, "Lesson not found");

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
}

export async function deleteLesson(id: number) {
  return await prisma.$transaction(async (tx) => {
    const lessonRaw = await tx.lesson.findUnique({
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

    const lesson = requireNotNull(lessonRaw, "Lesson not found");

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
