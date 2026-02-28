"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";

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
  const [upcoming, setUpcoming] = useState<LessonItem[]>([]);
  const [inProgress, setInProgress] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ items: LessonItem[] }>("/api/v1/instructors/me/schedule")
      .then((data) => {
        const items = Array.isArray(data) ? data : ((data as any).items ?? []);
        setUpcoming(items.filter((l: LessonItem) => l.status === "scheduled").slice(0, 5));
        setInProgress(items.filter((l: LessonItem) => l.status === "in_progress"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) =>
    s === "in_progress" ? "#34a853" : s === "scheduled" ? "#9C27B0" : "#666";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0" }}>Instructor Dashboard</h1>
          <p style={{ margin: 0, color: "#666" }}>Manage your lessons and student evaluations.</p>
        </div>
        <button
          onClick={() => router.push("/instructor/schedule")}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          View Full Schedule
        </button>
      </div>

      {/* In-progress lessons — most urgent */}
      {!loading && inProgress.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem", color: "#34a853" }}>⚡ In Progress Now</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {inProgress.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => router.push(`/instructor/lessons/${lesson.id}`)}
                style={{
                  padding: "1.25rem",
                  border: "2px solid #34a853",
                  borderRadius: "8px",
                  background: "#f0fff4",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.25rem" }}>
                      {lesson.course_title}
                    </div>
                    <strong style={{ fontSize: "1.1rem" }}>{lesson.lesson_title}</strong>
                    {lesson.location && (
                      <div style={{ fontSize: "0.875rem", color: "#444", marginTop: "0.25rem" }}>
                        📍 {lesson.location}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.875rem", color: "#666" }}>
                      {lesson.evaluated_count}/{lesson.enrolled_count} evaluated
                    </div>
                    <button
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.4rem 0.875rem",
                        background: "#34a853",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Open →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming lessons */}
      <div>
        <h2 style={{ marginBottom: "1rem" }}>Upcoming Lessons</h2>
        {loading ? (
          <div style={{ color: "#888" }}>Loading schedule...</div>
        ) : upcoming.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              background: "#f5f5f5",
              borderRadius: "8px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No upcoming scheduled lessons.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {upcoming.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => router.push(`/instructor/lessons/${lesson.id}`)}
                style={{
                  padding: "1.25rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>
                      {lesson.course_title}
                    </div>
                    <strong>{lesson.lesson_title}</strong>
                    <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
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
                  <div style={{ textAlign: "right", fontSize: "0.875rem", color: "#666" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "10px",
                        background: `${statusColor(lesson.status)}22`,
                        color: statusColor(lesson.status),
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      {lesson.status.replace("_", " ").toUpperCase()}
                    </span>
                    <div style={{ marginTop: "0.35rem" }}>{lesson.enrolled_count} students</div>
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
