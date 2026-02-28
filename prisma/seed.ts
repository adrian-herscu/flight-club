import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create dev user if not exists
  let devUser = await prisma.user.findUnique({
    where: { email: "dev@local.com" },
  });

  if (!devUser) {
    devUser = await prisma.user.create({
      data: {
        email: "dev@local.com",
        name: "Dev User",
        authProvider: "dev",
        authProviderId: "dev-1",
      },
    });
    console.log("✅ Created dev user");
  }

  // Create super-admin role if not exists
  const superAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: devUser.id,
      roleType: "SUPER_ADMIN",
    },
  });

  if (!superAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: devUser.id,
        roleType: "SUPER_ADMIN",
        schoolId: null,
      },
    });
    console.log("✅ Created super-admin role for dev user");
  }

  // Create a sample school
  let school = await prisma.school.findFirst({
    where: { name: "Sky High Paragliding School" },
  });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Sky High Paragliding School",
        description: "Premier paragliding instruction in San Diego",
        contactEmail: "info@skyhigh.com",
        contactPhone: "+1-619-555-0123",
        addressLine1: "123 Launch Road",
        city: "San Diego",
        state: "CA",
        postalCode: "92109",
        country: "USA",
      },
    });
    console.log("✅ Created sample school");
  }

  // Add dev user as school admin
  const schoolAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: devUser.id,
      schoolId: school.id,
      roleType: "ADMIN",
    },
  });

  if (!schoolAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: devUser.id,
        schoolId: school.id,
        roleType: "ADMIN",
      },
    });
    console.log("✅ Added dev user as school admin");
  }

  // Create a sample syllabus
  let syllabus = await prisma.syllabus.findFirst({
    where: { title: "P2 Paragliding Certification" },
  });

  if (!syllabus) {
    syllabus = await prisma.syllabus.create({
      data: {
        title: "P2 Paragliding Certification",
        description:
          "Complete P2 certification course covering ground handling, flight theory, and basic flight maneuvers",
        status: "FINAL",
        version: 1,
        finalizedAt: new Date(),
      },
    });
    console.log("✅ Created sample syllabus");

    // Add lessons to the syllabus
    await prisma.lesson.createMany({
      data: [
        {
          syllabusId: syllabus.id,
          title: "Ground Handling Fundamentals",
          description: "Learn to control the wing on the ground",
          order: 1,
        },
        {
          syllabusId: syllabus.id,
          title: "Flight Theory & Weather",
          description: "Understanding aerodynamics and weather patterns",
          order: 2,
        },
        {
          syllabusId: syllabus.id,
          title: "First Flight",
          description: "Supervised first flight with instructor",
          order: 3,
        },
        {
          syllabusId: syllabus.id,
          title: "Turning & Gliding",
          description: "Basic flight maneuvers and control",
          order: 4,
        },
        {
          syllabusId: syllabus.id,
          title: "Landing Techniques",
          description: "Safe landing approaches and techniques",
          order: 5,
        },
      ],
    });
    console.log("✅ Created sample lessons");
  }

  // Create a sample course
  const existingCourse = await prisma.course.findFirst({
    where: { name: "P2 Spring 2026 Course" },
  });

  if (!existingCourse) {
    const course = await prisma.course.create({
      data: {
        schoolId: school.id,
        syllabusId: syllabus.id,
        name: "P2 Spring 2026 Course",
        description: "Spring 2026 P2 certification course",
        maxStudents: 8,
        status: "pending",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-05-30"),
      },
    });
    console.log("✅ Created sample course");

    // Create course lessons from syllabus
    const lessons = await prisma.lesson.findMany({
      where: { syllabusId: syllabus.id },
      orderBy: { order: "asc" },
    });

    for (const lesson of lessons) {
      await prisma.courseLesson.create({
        data: {
          courseId: course.id,
          title: lesson.title,
          description: lesson.description,
          durationHours: 3.0,
          sequenceOrder: lesson.order,
          status: "scheduled",
        },
      });
    }
    console.log("✅ Created course lessons");
  }

  console.log("✨ Database seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
