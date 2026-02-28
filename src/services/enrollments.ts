/**
 * Enrollment API client service
 */

import { apiClient } from "./apiClient";

export interface EnrollmentRequest {
  course_id: number;
}

export interface EnrollmentApproval {
  bypass_approval?: boolean;
}

export interface EnrollmentRejection {
  reason?: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  status: "pending_approval" | "enrolled" | "waitlist" | "rejected" | "unenrolled";
  position: number | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  student_name?: string;
  student_email?: string;
  course_title?: string;
}

/**
 * Request enrollment in a course
 */
export async function requestEnrollment(data: EnrollmentRequest): Promise<Enrollment> {
  return apiClient.post<Enrollment>("/api/v1/enrollments", data);
}

/**
 * Approve a pending enrollment
 */
export async function approveEnrollment(
  enrollmentId: number,
  data: EnrollmentApproval = {},
): Promise<Enrollment> {
  return apiClient.post<Enrollment>(`/api/v1/enrollments/${enrollmentId}/approve`, data);
}

/**
 * Reject a pending enrollment
 */
export async function rejectEnrollment(
  enrollmentId: number,
  data: EnrollmentRejection = {},
): Promise<Enrollment> {
  return apiClient.post<Enrollment>(`/api/v1/enrollments/${enrollmentId}/reject`, data);
}

/**
 * Unenroll from a course
 */
export async function unenrollFromCourse(enrollmentId: number): Promise<void> {
  return apiClient.post<void>(`/api/v1/enrollments/${enrollmentId}/unenroll`, {});
}

/**
 * Get enrollments for a course
 */
export async function getCourseEnrollments(
  courseId: number,
  params?: { status?: string; page?: number; page_size?: number },
): Promise<{ items: Enrollment[] }> {
  return apiClient.get<{ items: Enrollment[] }>(`/api/v1/courses/${courseId}/enrollments`, {
    params,
  });
}

/**
 * Get student's own enrollments
 */
export async function getMyEnrollments(params?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<{ items: Enrollment[] }> {
  return apiClient.get<{ items: Enrollment[] }>("/api/v1/enrollments/me", { params });
}
