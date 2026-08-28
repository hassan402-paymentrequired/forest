import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { threadId } = await params
  const body = await request.json()

  const res = await engineFetch(`/chat/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: res.status }
    )
  }

  return NextResponse.json(await res.json())
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { threadId } = await params
  const res = await engineFetch(`/chat/threads/${threadId}`, {
    method: "DELETE",
  })

  if (!res.ok && res.status !== 204) {
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: res.status }
    )
  }

  return NextResponse.json({ success: true })
}
