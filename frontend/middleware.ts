import { SESSION_COOKIE, verifyToken } from "@/lib/auth/session"
import { NextResponse, type NextRequest } from "next/server"
import { validateCsrfToken } from "./lib/csrf"

const PUBLIC_PATHS = ["/auth"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith("/api")
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  if (!isApiRoute && !isPublicPath) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const userId = await verifyToken(token)
    if (!userId) {
      const loginUrl = new URL("/auth/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  const response = NextResponse.next()

  // CSRF protection for state-changing requests
  if (["POST", "PUT", "DELETE"].includes(request.method)) {
    const csrfCookie = request.cookies.get("csrf_token")?.value
    const headerToken = request.headers.get("x-csrf-token")

    if (!csrfCookie || !headerToken || !validateCsrfToken(headerToken)) {
      return new NextResponse("Invalid CSRF token", { status: 403 })
    }
  }

  // CSP for development and production
  const isDev = process.env.NODE_ENV === "development"

  response.headers.set(
    "Content-Security-Policy",
    isDev
      ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss:;`
      : `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss:;`
  )

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}
