import { SESSION_COOKIE } from "@/lib/auth/session"
import { NextResponse } from "next/server"

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000"
const SESSION_MAX_AGE = 60 * 60 * 24 // 24h — matches engine's ACCESS_TOKEN_EXPIRE_MINUTES

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      )
    }

    const engineRes = await fetch(`${ENGINE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!engineRes.ok) {
      const detail = await engineRes.json().catch(() => null)
      return NextResponse.json(
        { error: detail?.detail || "Login failed" },
        { status: engineRes.status }
      )
    }

    const { access_token } = await engineRes.json()

    const res = NextResponse.json({ success: true })
    res.cookies.set(SESSION_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })
    return res
  } catch (error) {
    console.error("login unhandled error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
