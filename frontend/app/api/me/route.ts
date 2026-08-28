import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const engineRes = await engineFetch("/auth/me")
  if (!engineRes.ok) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: engineRes.status === 401 ? 401 : 500 }
    )
  }

  const { id, name, email } = await engineRes.json()
  return NextResponse.json({ id: String(id), name, email })
}
