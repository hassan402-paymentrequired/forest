import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { NextResponse } from "next/server"

/**
 * The current user's own past uploads/predictions — proxies to engine's
 * GET /predict/history. Backs the school-facing side of app/uploads/page.tsx
 * (a ministry account instead reads /api/ministry/schools — see that page).
 */
export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const res = await engineFetch("/predict/history")
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || "Failed to load uploads" },
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}
