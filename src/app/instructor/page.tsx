"use client";

import { useRouter } from "next/navigation";
import { useApiData } from "@/lib/hooks/useApiData";

interface LessonItem {
  id: number;
  course_title: string;
  lesson_title: string;
  start_time: string | null;
  location: string | null;
  status: string;
  enrolled_count: number;
  evaluated_count: number;
}

export default function InstructorPage() {
  const router = useRouter();
  const { data, loading } = useApiData<{ items: LessonItem[] }>("/api/v1/instructors/me/schedule");

  const items = Array.isArray(data) ? data : ((data as any)?.items ?? []);
  const upcoming = items.filter((l: LessonItem) => l.status === "scheduled").slice(0, 5);
  const inProgress = items.filter((l: LessonItem) => l.status === "in_progress");

  const statusColor = (s: string) =>
    s === "in_progress" ? "#34a853" : s === "scheduled" ? "#9C27B0" : "#666";

  return (
    <div className="p-2xl">
      <div className="header-row">
        <div>
          <h1 className="page-title">Instructor Dashboard</h1>
          <p className="muted-text">Manage your lessons and student evaluations.</p>
        </div>
        <button onClick={() => router.push("/instructor/schedule")} className="btn btn-primary">
          View Full Schedule
        </button>
      </div>

      {/* In-progress lessons — most urgent */}
      {!loading && inProgress.length > 0 && (
        <div className="mb-2xl">
          <h2 className="section-title" style={{ color: "#34a853" }}>
            ⚡ In Progress Now
          </h2>
          <div className="card-grid">
            {inProgress.map((lesson: LessonItem) => (
              <div
                key={lesson.id}
                onClick={() => router.push(`/instructor/lessons/${lesson.id}`)}
                className="card card-clickable"
                style={{ borderLeft: "4px solid #34a853" }}
              >
                <div className="flex-center-between">
                  <div>
                    <div className="text-muted-small">{lesson.course_title}</div>
                    <strong className="text-lg">{lesson.lesson_title}</strong>
                    {lesson.location && (
                      <div className="text-muted mt-sm">📍 {lesson.location}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-small-muted">
                      {lesson.evaluated_count}/{lesson.enrolled_count} evaluated
                    </div>
                    <button className="btn btn-small">Open →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming lessons */}
      <div>
        <h2 className="section-title">Upcoming Lessons</h2>
        {loading ? (
          <div>Loading schedule...</div>
        ) : upcoming.length === 0 ? (
          <div className="empty-state">No upcoming scheduled lessons.</div>
        ) : (
          <div className="card-grid">
            {upcoming.map((lesson: LessonItem) => (
              <div
                key={lesson.id}
                onClick={() => router.push(`/instructor/lessons/${lesson.id}`)}
                className="card card-clickable"
              >
                <div className="flex-center-between">
                  <div>
                    <div className="text-muted text-small">{lesson.course_title}</div>
                    <strong>{lesson.lesson_title}</strong>
                    <div className="meta-row mt-sm">
                      {lesson.start_time
                        ? new Date(lesson.start_time).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Time not scheduled"}
                      {lesson.location && <span> · 📍 {lesson.location}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="badge"
                      style={{
                        background: `${statusColor(lesson.status)}22`,
                        color: statusColor(lesson.status),
                      }}
                    >
                      {lesson.status.replace("_", " ").toUpperCase()}
                    </span>
                    <div className="text-small-muted">{lesson.enrolled_count} students</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
