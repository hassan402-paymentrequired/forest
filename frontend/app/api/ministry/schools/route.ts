import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const res = await engineFetch("/ministry/schools")
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || "Failed to load schools" },
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}
