import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow all authenticated paths to proceed
  // Auth verification happens in API routes via JWT tokens
  // The client-side handles redirects to /login when needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes
     * - auth routes (callback, login, logout)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api|auth|login|logout).*)",
  ],
};
