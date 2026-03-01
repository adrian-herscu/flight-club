"use client";

import { useRouter } from "next/navigation";
import { useApiData } from "@/lib/hooks/useApiData";
import { useSchool } from "@/services/schoolContext";
import Link from "next/link";

interface Enrollment {
  id: number;
  courseId?: number;
  course_id?: number;
  status: string;
  course?: { id: number; name?: string; title?: string; status: string };
}

interface Course {
  id: number;
  name: string;
  description?: string;
  maxStudents: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface StudentEnrollment {
  id: number;
  courseId: number;
  status: string;
  createdAt: string;
  course?: Course;
}

export default function StudentPage() {
  const {
    data: courses,
    loading: coursesLoading,
    error: coursesError,
  } = useApiData<Course[]>("/api/v1/courses");
  const {
    data: enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
  } = useApiData<StudentEnrollment[]>("/api/v1/enrollments");

  const loading = coursesLoading || enrollmentsLoading;
  const error = coursesError || enrollmentsError;

  if (loading) {
    return <div className="p-2xl">Loading...</div>;
  }

  const enrolledCourses = (enrollments || []).filter((e) => e.status === "enrolled");
  const pendingCourses = (enrollments || []).filter((e) => e.status === "pending_approval");
  const availableCourses = (courses || []).filter(
    (c) => !(enrollments || []).some((e) => e.courseId === c.id && e.status !== "rejected"),
  );

  return (
    <div className="p-2xl">
      <h1>Student Dashboard</h1>
      <p>View your courses and manage enrollments.</p>

      {error && (
        <div className="error-box">
          <p className="error-text">{error}</p>
        </div>
      )}

      <div className="mt-2xl">
        <h2>Your Enrollments ({enrolledCourses.length})</h2>
        {enrolledCourses.length === 0 ? (
          <p className="muted-text\">You&apos;re not enrolled in any courses yet.</p>
        ) : (
          <div>
            {enrolledCourses.map((enrollment) => (
              <div key={enrollment.id} className="card mb-md">
                <h3 className="card-title">
                  <Link href={`/student/courses/${enrollment.courseId}`} className="link-primary">
                    Course #{enrollment.courseId}
                  </Link>
                </h3>
                <p className="text-muted">Status: Enrolled</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingCourses.length > 0 && (
        <div className="mt-2xl">
          <h2>Pending Requests ({pendingCourses.length})</h2>
          <div>
            {pendingCourses.map((enrollment) => (
              <div key={enrollment.id} className="card mb-md bg-warning">
                <p className="text-warning">Course #{enrollment.courseId} - Awaiting approval</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2xl">
        <h2>Available Courses ({availableCourses.length})</h2>
        {availableCourses.length === 0 ? (
          <p className="muted-text">No available courses at this time.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-bottom-thick">
                <th className="px-md text-left">Name</th>
                <th className="px-md text-left">Status</th>
                <th className="px-md text-left">Start Date</th>
                <th className="px-md text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {availableCourses.map((course) => (
                <tr key={course.id} className="border-bottom-light">
                  <td className="px-md">{course.name}</td>
                  <td className="px-md">
                    <span className="badge">{course.status}</span>
                  </td>
                  <td className="px-md">{new Date(course.startDate).toLocaleDateString()}</td>
                  <td className="px-md">
                    <Link href={`/student/courses/${course.id}`} className="link-primary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2xl">
        <h3>Quick Actions</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <Link href="/student/courses" className="link-primary">
              Browse All Courses
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
