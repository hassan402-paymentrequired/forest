import { NextRequest, NextResponse } from "next/server"

// No durable backend for favorite models yet (engine has no such column) —
// client-side-only no-op, so the picker's "favorite" toggle doesn't error
// even though it isn't persisted server-side.

export async function POST(request: NextRequest) {
  try {
    const { favorite_models } = await request.json()

    if (!Array.isArray(favorite_models)) {
      return NextResponse.json(
        { error: "favorite_models must be an array" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, favorite_models })
  } catch (error) {
    console.error("Error in favorite-models API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ favorite_models: [] })
}
