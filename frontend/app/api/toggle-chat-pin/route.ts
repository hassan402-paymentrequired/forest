import { NextResponse } from "next/server"

// Chat pinning isn't backed by engine yet — this is a client-side-only
// no-op (the pin toggle already works optimistically in the UI without
// server persistence). Kept as a route so the client doesn't need changes
// if real persistence is added later.
export async function POST(request: Request) {
  try {
    const { chatId, pinned } = await request.json()

    if (!chatId || typeof pinned !== "boolean") {
      return NextResponse.json(
        { error: "Missing chatId or pinned" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("toggle-chat-pin unhandled error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
