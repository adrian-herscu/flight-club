"use client";

import { Suspense } from "react";
import NewCourseContent from "../course-content";

function CourseFallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Loading form...</p>
    </div>
  );
}

export default function NewCoursePage() {
  return (
    <Suspense fallback={<CourseFallback />}>
      <NewCourseContent />
    </Suspense>
  );
}
