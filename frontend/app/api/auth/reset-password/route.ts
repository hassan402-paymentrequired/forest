import { SESSION_COOKIE } from "@/lib/auth/session"
import { NextResponse } from "next/server"

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000"
const SESSION_MAX_AGE = 60 * 60 * 24 // 24h — matches engine's ACCESS_TOKEN_EXPIRE_MINUTES

export async function POST(request: Request) {
  try {
    const { token, new_password } = await request.json()

    if (!token || !new_password) {
      return NextResponse.json(
        { error: "Missing token or new_password" },
        { status: 400 }
      )
    }

    const engineRes = await fetch(`${ENGINE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    })

    if (!engineRes.ok) {
      const detail = await engineRes.json().catch(() => null)
      return NextResponse.json(
        { error: detail?.detail || "Failed to reset password" },
        { status: engineRes.status }
      )
    }

    const { access_token } = await engineRes.json()

    // Auto-login after a successful reset, matching login/signup.
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
    console.error("reset-password unhandled error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
