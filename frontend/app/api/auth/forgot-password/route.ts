import { NextResponse } from "next/server"

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const engineRes = await fetch(`${ENGINE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    // Engine already returns the same generic response whether or not the
    // email is registered — just pass it through.
    const data = await engineRes.json().catch(() => null)

    if (!engineRes.ok) {
      return NextResponse.json(
        { error: data?.detail || "Something went wrong" },
        { status: engineRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("forgot-password unhandled error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
