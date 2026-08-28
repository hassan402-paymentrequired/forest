/**
 * Session handling for the FastAPI engine's JWT — replaces Supabase auth.
 *
 * The raw JWT issued by engine's /auth/signup and /auth/login lives in an
 * httpOnly cookie (never exposed to client JS). Server-side code (API routes,
 * server components) verifies it locally via the shared JWT_SECRET_KEY (HS256)
 * to avoid a network round-trip on every request, and re-attaches it as a
 * Bearer token whenever engine itself needs to be called.
 */
import { jwtVerify } from "jose"
import { cookies } from "next/headers"

export const SESSION_COOKIE = "session"

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY
const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000"

function getSecretKey() {
  if (!JWT_SECRET_KEY) {
    throw new Error(
      "JWT_SECRET_KEY is not set — must match engine/.env's JWT_SECRET_KEY"
    )
  }
  return new TextEncoder().encode(JWT_SECRET_KEY)
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/**
 * Verifies a raw JWT string and returns the engine user id (the `sub` claim),
 * or null if invalid/expired. Takes the token directly (rather than reading
 * the cookie itself) so it works from middleware too, where cookies come from
 * `NextRequest.cookies`, not `next/headers`'s `cookies()`.
 */
export async function verifyToken(
  token: string | null | undefined
): Promise<string | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

/**
 * Verifies the session cookie locally (Route Handlers / Server Components
 * only — see `verifyToken` for middleware) and returns the engine user id.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const token = await getSessionToken()
  return verifyToken(token)
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error("UNAUTHENTICATED")
  }
  return userId
}

/**
 * Calls the FastAPI engine with the current session's Bearer token attached.
 * Use this from server-side code only (API routes, server components) — the
 * token never reaches the browser.
 */
export async function engineFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getSessionToken()

  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  return fetch(`${ENGINE_URL}${path}`, { ...init, headers })
}
