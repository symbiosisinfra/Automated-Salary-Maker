import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;

  // Check if the request is for the login page
  const isLoginPage = request.nextUrl.pathname === "/login";

  // If user is not authenticated and trying to access a protected route
  if (
    !isAuthenticated &&
    !isLoginPage &&
    !request.nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is authenticated but trying to access login page
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role-based access control
  if (isAuthenticated && request.nextUrl.pathname.startsWith("/dashboard")) {
    // Superadmin can access everything
    if (token.role === "superadmin") {
      return NextResponse.next();
    }

    // Admin can access most things except specific superadmin areas
    if (
      token.role === "admin" &&
      request.nextUrl.pathname.includes("/settings")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
