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
  const syllabus = await getSyllabusById(id);

  // Cannot edit published syllabuses
  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Cannot edit published syllabuses. Create a new version.");
  }

  return prisma.syllabus.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function publishSyllabus(id: number) {
  const syllabus = await getSyllabusById(id);

  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Syllabus is already published");
  }

  const lessons = await getSyllabusLessons(id);

  if (!lessons || lessons.length === 0) {
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
  const syllabus = await getSyllabusById(id);

  // Check if syllabus is used in any course
  const courseCount = await prisma.course.count({
    where: { syllabusId: id },
  });

  if (courseCount > 0) {
    throw new APIError("CONFLICT", "Cannot delete syllabus used in existing courses");
  }

  // Delete lessons first
  await prisma.lesson.deleteMany({
    where: { syllabusId: id },
  });

  return prisma.syllabus.delete({
    where: { id },
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
  const syllabus = await getSyllabusById(data.syllabusId);

  // Cannot add lessons to published syllabuses
  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Cannot add lessons to published syllabuses");
  }

  // Check if order is unique
  const existingLesson = await prisma.lesson.findFirst({
    where: {
      syllabusId: data.syllabusId,
      order: data.order,
    },
  });

  if (existingLesson) {
    throw new APIError(
      "CONFLICT",
      "Lesson with this order already exists. Use updateLessonOrder to reorder.",
    );
  }

  return prisma.lesson.create({
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
  const lesson = await getLessonById(id);
  const syllabus = await getSyllabusById(lesson.syllabusId);

  // Cannot edit lessons in published syllabuses
  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Cannot edit lessons in published syllabuses");
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
  const lesson = await getLessonById(id);
  const syllabus = await getSyllabusById(lesson.syllabusId);

  // Cannot edit lessons in published syllabuses
  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Cannot reorder lessons in published syllabuses");
  }

  const currentOrder = lesson.order;

  if (currentOrder === newOrder) {
    return lesson;
  }

  // Get all lessons in the syllabus
  const lessons = await prisma.lesson.findMany({
    where: { syllabusId: lesson.syllabusId },
    orderBy: { order: "asc" },
  });

  // Reorder lessons based on movement
  const updatedLessons = lessons.filter((l) => l.id !== id);

  if (newOrder < currentOrder) {
    // Moving up: shift others down
    updatedLessons.splice(newOrder - 1, 0, lesson);
  } else {
    // Moving down: shift others up
    updatedLessons.splice(newOrder - 1, 0, lesson);
  }

  // Update all lesson orders in a transaction
  for (let i = 0; i < updatedLessons.length; i++) {
    await prisma.lesson.update({
      where: { id: updatedLessons[i].id },
      data: { order: i + 1 },
    });
  }

  return prisma.lesson.findUnique({
    where: { id },
  });
}

export async function deleteLesson(id: number) {
  const lesson = await getLessonById(id);
  const syllabus = await getSyllabusById(lesson.syllabusId);

  // Cannot delete lessons from published syllabuses
  if (syllabus.status === "FINAL") {
    throw new APIError("CONFLICT", "Cannot delete lessons from published syllabuses");
  }

  // Delete lesson
  await prisma.lesson.delete({
    where: { id },
  });

  // Reorder remaining lessons
  const remainingLessons = await prisma.lesson.findMany({
    where: { syllabusId: lesson.syllabusId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < remainingLessons.length; i++) {
    await prisma.lesson.update({
      where: { id: remainingLessons[i].id },
      data: { order: i + 1 },
    });
  }

  return lesson;
}

export async function getSyllabusLessons(syllabusId: number) {
  return prisma.lesson.findMany({
    where: { syllabusId },
    orderBy: { order: "asc" },
  });
}
