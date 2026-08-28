import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const res = await engineFetch("/chat/threads")
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: res.status }
    )
  }

  return NextResponse.json(await res.json())
}
