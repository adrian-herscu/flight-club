"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";

interface LessonScheduleItem {
  id: number;
  course_id: number;
  course_title: string;
  lesson_title: string;
  sequence_order: number;
  duration_hours: number;
  start_time: string | null;
  location: string | null;
  status: string;
  enrolled_count: number;
  evaluated_count: number;
}

export default function InstructorSchedulePage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "in_progress" | "completed" | "all">(
    "upcoming",
  );

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      // Fetch instructor's assigned lessons
      const data = await apiClient.get<{ items: LessonScheduleItem[] }>(
        "/api/v1/instructors/me/schedule",
      );
      setLessons(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "#9C27B0";
      case "in_progress":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#9E9E9E";
      default:
        return "#666";
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return lesson.status === "scheduled";
    if (filter === "in_progress") return lesson.status === "in_progress";
    if (filter === "completed") return lesson.status === "completed";
    return true;
  });

  const sortedLessons = [...filteredLessons].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>My Teaching Schedule</h1>

      {/* Filter Tabs */}
      <div style={{ marginBottom: "2rem", borderBottom: "2px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: "2rem" }}>
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              style={{
                padding: "0.75rem 1rem",
                background: "none",
                border: "none",
                borderBottom: filter === tab.key ? "2px solid #4285f4" : "2px solid transparent",
                color: filter === tab.key ? "#4285f4" : "#666",
                fontWeight: filter === tab.key ? 600 : 400,
                fontSize: "1rem",
                cursor: "pointer",
                marginBottom: "-2px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div>Loading schedule...</div>
      ) : sortedLessons.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>No lessons found</p>
          <p style={{ color: "#666" }}>
            {filter !== "all" ? `No ${filter} lessons.` : "No lessons assigned to you yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {sortedLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => router.push(`/instructor/lessons/${lesson.id}`)}
              style={{
                padding: "1.5rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "white",
                cursor: "pointer",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 0.25rem 0" }}>{lesson.course_title}</h3>
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: 500 }}>
                    Lesson {lesson.sequence_order}: {lesson.lesson_title}
                  </p>
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>
                    {lesson.start_time ? (
                      <div>
                        <strong>Time:</strong> {new Date(lesson.start_time).toLocaleString()}
                      </div>
                    ) : (
                      <div style={{ color: "#ea4335" }}>⚠️ Not scheduled yet</div>
                    )}
                    {lesson.location && (
                      <div>
                        <strong>Location:</strong> {lesson.location}
                      </div>
                    )}
                    <div>
                      <strong>Duration:</strong> {lesson.duration_hours} hours
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "white",
                    background: getStatusColor(lesson.status),
                    whiteSpace: "nowrap",
                  }}
                >
                  {lesson.status}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "2rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #f0f0f0",
                  fontSize: "0.875rem",
                }}
              >
                <div>
                  <strong>Enrolled Students:</strong> {lesson.enrolled_count}
                </div>
                {lesson.status !== "scheduled" && (
                  <div
                    style={{
                      color:
                        lesson.evaluated_count === lesson.enrolled_count ? "#34a853" : "#ea4335",
                    }}
                  >
                    <strong>Evaluations:</strong> {lesson.evaluated_count} / {lesson.enrolled_count}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
