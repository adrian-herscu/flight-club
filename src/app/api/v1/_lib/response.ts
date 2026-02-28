import { NextResponse } from "next/server";

export function requestId(): string {
  return crypto.randomUUID();
}

export function success<T>(data: T, status = 200) {
  const rid = requestId();
  return NextResponse.json(
    {
      success: true,
      data,
      request_id: rid,
    },
    {
      status,
      headers: {
        "X-Request-ID": rid,
      },
    },
  );
}

export function failure(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  const rid = requestId();
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      request_id: rid,
    },
    {
      status,
      headers: {
        "X-Request-ID": rid,
      },
    },
  );
}
