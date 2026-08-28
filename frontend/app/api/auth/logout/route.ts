import { SESSION_COOKIE } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 })
  return res
}
