import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create super-admin dev user if not exists
  let devUser = await prisma.user.findUnique({
    where: { email: "dev@local.com" },
  });

  if (!devUser) {
    devUser = await prisma.user.create({
      data: {
        email: "dev@local.com",
        name: "Dev Super Admin",
        authProvider: "dev",
        authProviderId: "dev-super-admin",
      },
    });
    console.log("✅ Created super-admin dev user");
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

  // Create demo super-admin user for production
  let demoSuperAdmin = await prisma.user.findUnique({
    where: { email: "adrian.herscu@gmail.com" },
  });

  if (!demoSuperAdmin) {
    demoSuperAdmin = await prisma.user.create({
      data: {
        email: "adrian.herscu@gmail.com",
        name: "Adrian Herscu",
        authProvider: "google",
        authProviderId: "google-oauth-placeholder",
      },
    });
    console.log("✅ Created demo super-admin user");
  }

  // Create super-admin role for demo user if not exists
  const demoSuperAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: demoSuperAdmin.id,
      roleType: "SUPER_ADMIN",
    },
  });

  if (!demoSuperAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: demoSuperAdmin.id,
        roleType: "SUPER_ADMIN",
        schoolId: null,
      },
    });
    console.log("✅ Created super-admin role for demo user");
  }

  // Create dedicated dev users for each role
  const devUsers = [
    {
      email: "admin@local.com",
      name: "Dev Admin",
      authProviderId: "dev-admin",
      roleType: "ADMIN" as const,
    },
    {
      email: "instructor@local.com",
      name: "Dev Instructor",
      authProviderId: "dev-instructor",
      roleType: "INSTRUCTOR" as const,
    },
    {
      email: "student@local.com",
      name: "Dev Student",
      authProviderId: "dev-student",
      roleType: "STUDENT" as const,
    },
  ];

  const createdDevUsers: { [key: string]: any } = {};

  for (const userData of devUsers) {
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          authProvider: "dev",
          authProviderId: userData.authProviderId,
        },
      });
      console.log(`✅ Created ${userData.roleType.toLowerCase()} dev user: ${userData.email}`);
    }

    createdDevUsers[userData.roleType] = user;
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

  // Add super-admin dev user as school admin (keep original behavior)
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
    console.log("✅ Added super-admin dev user as school admin");
  }

  // Assign school-specific roles to dev users
  for (const roleType of ["ADMIN", "INSTRUCTOR", "STUDENT"] as const) {
    const user = createdDevUsers[roleType];
    if (user) {
      const existingRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          schoolId: school.id,
          roleType: roleType,
        },
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            schoolId: school.id,
            roleType: roleType,
          },
        });
        console.log(`✅ Assigned ${roleType.toLowerCase()} role to ${user.email} for school`);
      }
    }
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
        status: "DRAFT",
        version: 1,
      },
    });
    console.log("✅ Created sample syllabus");
  }

  // Ensure lessons exist for the syllabus (idempotent)
  const existingLessonsCount = await prisma.lesson.count({
    where: { syllabusId: syllabus.id },
  });

  // If a previous failed seed left this syllabus as FINAL with no lessons,
  // temporarily move it back to DRAFT so lesson inserts are allowed.
  if (existingLessonsCount === 0 && syllabus.status === "FINAL") {
    syllabus = await prisma.syllabus.update({
      where: { id: syllabus.id },
      data: {
        status: "DRAFT",
        finalizedAt: null,
      },
    });
  }

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
    skipDuplicates: true,
  });
  console.log("✅ Ensured sample lessons");

  // Publish syllabus after lessons exist
  if (syllabus.status !== "FINAL") {
    syllabus = await prisma.syllabus.update({
      where: { id: syllabus.id },
      data: {
        status: "FINAL",
        finalizedAt: new Date(),
      },
    });
  }

  // Create sample instructors
  const instructorEmails = [
    { email: "john.instructor@skyhigh.com", name: "John Davis" },
    { email: "sarah.instructor@skyhigh.com", name: "Sarah Martinez" },
    { email: "mike.instructor@skyhigh.com", name: "Mike Thompson" },
  ];

  const instructorUsers = [];
  for (const instructorData of instructorEmails) {
    let instructor = await prisma.user.findUnique({
      where: { email: instructorData.email },
    });

    if (!instructor) {
      instructor = await prisma.user.create({
        data: {
          email: instructorData.email,
          name: instructorData.name,
          authProvider: "dev",
          authProviderId: `instructor-${instructorData.email}`,
        },
      });
    }

    // Assign instructor role if not exists
    const instructorRole = await prisma.userRole.findFirst({
      where: {
        userId: instructor.id,
        schoolId: school.id,
        roleType: "INSTRUCTOR",
      },
    });

    if (!instructorRole) {
      await prisma.userRole.create({
        data: {
          userId: instructor.id,
          schoolId: school.id,
          roleType: "INSTRUCTOR",
        },
      });
    }

    instructorUsers.push(instructor);
  }
  console.log("✅ Created sample instructors");

  // Create sample students
  const studentEmails = [
    { email: "alice.student@example.com", name: "Alice Johnson" },
    { email: "bob.student@example.com", name: "Bob Williams" },
    { email: "carol.student@example.com", name: "Carol Brown" },
    { email: "david.student@example.com", name: "David Lee" },
    { email: "emma.student@example.com", name: "Emma Wilson" },
    { email: "frank.student@example.com", name: "Frank Garcia" },
    { email: "grace.student@example.com", name: "Grace Rodriguez" },
    { email: "henry.student@example.com", name: "Henry Miller" },
  ];

  const studentUsers = [];
  for (const studentData of studentEmails) {
    let student = await prisma.user.findUnique({
      where: { email: studentData.email },
    });

    if (!student) {
      student = await prisma.user.create({
        data: {
          email: studentData.email,
          name: studentData.name,
          authProvider: "dev",
          authProviderId: `student-${studentData.email}`,
        },
      });
    }

    // Assign student role if not exists
    const studentRole = await prisma.userRole.findFirst({
      where: {
        userId: student.id,
        schoolId: school.id,
        roleType: "STUDENT",
      },
    });

    if (!studentRole) {
      await prisma.userRole.create({
        data: {
          userId: student.id,
          schoolId: school.id,
          roleType: "STUDENT",
        },
      });
    }

    studentUsers.push(student);
  }
  console.log("✅ Created sample students");

  // Get or create the course
  let course = await prisma.course.findFirst({
    where: { name: "P2 Spring 2026 Course" },
  });

  if (!course) {
    course = await prisma.course.create({
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

    // Create course lessons from syllabus
    const lessons = await prisma.lesson.findMany({
      where: { syllabusId: syllabus.id },
      orderBy: { order: "asc" },
    });

    for (const lesson of lessons) {
      const lessonDate = new Date("2026-04-05");
      lessonDate.setDate(lessonDate.getDate() + lesson.order * 7);

      await prisma.courseLesson.create({
        data: {
          courseId: course.id,
          title: lesson.title,
          description: lesson.description,
          durationHours: 3.0,
          sequenceOrder: lesson.order,
          status: "scheduled",
          startTime: lessonDate,
          location: "Torrey Pines South Launch",
        },
      });
    }
    console.log("✅ Created course lessons");
  }

  // Create enrollments for students
  for (const student of studentUsers) {
    const existingEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        courseId: course.id,
      },
    });

    if (!existingEnrollment) {
      const enrollmentStatus = Math.random() > 0.7 ? "waitlist" : "enrolled";
      const enrollment = await prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          schoolId: school.id,
          status: enrollmentStatus,
          waitlistPosition:
            enrollmentStatus === "waitlist" ? Math.floor(Math.random() * 3) + 1 : null,
        },
      });

      // If enrolled, create evaluations for course lessons
      if (enrollmentStatus === "enrolled") {
        const courseLessons = await prisma.courseLesson.findMany({
          where: { courseId: course.id },
        });

        for (const lesson of courseLessons) {
          const existingEvaluation = await prisma.studentLessonEvaluation.findFirst({
            where: {
              studentId: student.id,
              courseLessonId: lesson.id,
            },
          });

          if (!existingEvaluation) {
            const results: ("pass" | "fail" | "not_attempted")[] = [
              "pass",
              "fail",
              "not_attempted",
            ];
            const randomResult = results[Math.floor(Math.random() * results.length)];

            await prisma.studentLessonEvaluation.create({
              data: {
                studentId: student.id,
                enrollmentId: enrollment.id,
                courseLessonId: lesson.id,
                schoolId: school.id,
                result: randomResult,
                feedbackNotes:
                  randomResult === "pass"
                    ? "Excellent performance, well done!"
                    : randomResult === "fail"
                      ? "Needs more practice on technique"
                      : "Not yet attempted",
                isFinalized: Math.random() > 0.5,
              },
            });
          }
        }
      }
    }
  }
  console.log("✅ Created student enrollments and evaluations");

  // Assign instructors to course lessons
  const courseLessons = await prisma.courseLesson.findMany({
    where: { courseId: course.id },
  });

  // First, assign course-level instructors (one per course)
  const courseAssignments = await prisma.instructorAssignment.findMany({
    where: { courseId: course.id, courseLessonId: null },
  });

  if (courseAssignments.length === 0) {
    // Assign all instructors to the course (without lesson specificity)
    for (const instructor of instructorUsers) {
      const existingAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          instructorId: instructor.id,
          courseId: course.id,
        },
      });

      if (!existingAssignment) {
        await prisma.instructorAssignment.create({
          data: {
            instructorId: instructor.id,
            courseId: course.id,
            schoolId: school.id,
            assignedAt: new Date(),
          },
        });
      }
    }
  }

  console.log("✅ Assigned instructors to course");

  // Create a second course for variety
  const course2Exists = await prisma.course.findFirst({
    where: { name: "P3 Summer 2026 Course" },
  });

  if (!course2Exists) {
    // Create or get P3 syllabus
    let p3Syllabus = await prisma.syllabus.findFirst({
      where: { title: "P3 Paragliding Certification" },
    });

    if (!p3Syllabus) {
      p3Syllabus = await prisma.syllabus.create({
        data: {
          title: "P3 Paragliding Certification",
          description:
            "Advanced P3 certification course covering cross-country flying and advanced maneuvers",
          status: "DRAFT",
          version: 1,
        },
      });
    }

    await prisma.lesson.createMany({
      data: [
        {
          syllabusId: p3Syllabus.id,
          title: "Advanced Flight Techniques",
          description: "Master advanced paragliding techniques",
          order: 1,
        },
        {
          syllabusId: p3Syllabus.id,
          title: "Cross-Country Flying",
          description: "Long distance flight planning and navigation",
          order: 2,
        },
        {
          syllabusId: p3Syllabus.id,
          title: "Thermal Soaring",
          description: "Using thermals to gain altitude and extend flight",
          order: 3,
        },
        {
          syllabusId: p3Syllabus.id,
          title: "Emergency Procedures",
          description: "Safety procedures and emergency recovery",
          order: 4,
        },
      ],
      skipDuplicates: true,
    });

    if (p3Syllabus.status !== "FINAL") {
      p3Syllabus = await prisma.syllabus.update({
        where: { id: p3Syllabus.id },
        data: {
          status: "FINAL",
          finalizedAt: new Date(),
        },
      });
    }

    const course2 = await prisma.course.create({
      data: {
        schoolId: school.id,
        syllabusId: p3Syllabus.id,
        name: "P3 Summer 2026 Course",
        description: "Summer 2026 P3 advanced certification course",
        maxStudents: 6,
        status: "pending",
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-08-15"),
      },
    });

    const lessons = await prisma.lesson.findMany({
      where: { syllabusId: p3Syllabus.id },
      orderBy: { order: "asc" },
    });

    for (const lesson of lessons) {
      const lessonDate = new Date("2026-06-15");
      lessonDate.setDate(lessonDate.getDate() + lesson.order * 7);

      await prisma.courseLesson.create({
        data: {
          courseId: course2.id,
          title: lesson.title,
          description: lesson.description,
          durationHours: 4.0,
          sequenceOrder: lesson.order,
          status: "scheduled",
          startTime: lessonDate,
          location: "Mt. Woodson Launch Site",
        },
      });
    }

    // Enroll some advanced students
    for (let i = 0; i < Math.min(4, studentUsers.length); i++) {
      const existingEnrollment = await prisma.studentEnrollment.findFirst({
        where: {
          studentId: studentUsers[i].id,
          courseId: course2.id,
        },
      });

      if (!existingEnrollment) {
        await prisma.studentEnrollment.create({
          data: {
            studentId: studentUsers[i].id,
            courseId: course2.id,
            schoolId: school.id,
            status: "enrolled",
          },
        });
      }
    }

    console.log("✅ Created P3 course with lessons and enrollments");
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
