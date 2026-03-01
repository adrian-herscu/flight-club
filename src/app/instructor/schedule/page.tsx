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

  if (error) return <div className="error-text">Error: {error}</div>;

  return (
    <div>
      <h1 className="page-title">My Teaching Schedule</h1>

      {/* Filter Tabs */}
      <div className="tabs-container">
        <div className="tabs-row">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`tab-button ${filter === tab.key ? "tab-button-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div>Loading schedule...</div>
      ) : sortedLessons.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No lessons found</p>
          <p className="empty-state-subtitle">
            {filter !== "all" ? `No ${filter} lessons.` : "No lessons assigned to you yet."}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {sortedLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => router.push(`/instructor/lessons/${lesson.id}`)}
              className="card card-clickable"
            >
              <div className="card-header">
                <div className="card-body">
                  <h3 className="card-title">{lesson.course_title}</h3>
                  <p className="lesson-title">
                    Lesson {lesson.sequence_order}: {lesson.lesson_title}
                  </p>
                  <div className="lesson-meta">
                    {lesson.start_time ? (
                      <div>
                        <strong>Time:</strong> {new Date(lesson.start_time).toLocaleString()}
                      </div>
                    ) : (
                      <div className="warning-text">⚠️ Not scheduled yet</div>
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
                  className="badge badge-large"
                  style={{ background: getStatusColor(lesson.status) }}
                >
                  {lesson.status}
                </span>
              </div>

              <div className="card-footer">
                <div>
                  <strong>Enrolled Students:</strong> {lesson.enrolled_count}
                </div>
                {lesson.status !== "scheduled" && (
                  <div
                    className={
                      lesson.evaluated_count === lesson.enrolled_count
                        ? "evaluation-complete"
                        : "evaluation-incomplete"
                    }
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
