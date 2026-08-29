import { NextRequest, NextResponse } from "next/server"

// No durable backend for user preferences yet (engine has no such table) —
// the client (lib/user-preference-store/provider.tsx) treats `_persisted:
// false` as "store this in localStorage instead," so these always return
// that marker rather than actually persisting anything server-side.

export async function GET() {
  return NextResponse.json({
    layout: "fullscreen",
    prompt_suggestions: true,
    show_tool_invocations: true,
    show_conversation_previews: true,
    multi_model_enabled: false,
    hidden_models: [],
    _persisted: false,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      layout,
      prompt_suggestions,
      show_tool_invocations,
      show_conversation_previews,
      multi_model_enabled,
      hidden_models,
    } = body

    if (layout && typeof layout !== "string") {
      return NextResponse.json(
        { error: "layout must be a string" },
        { status: 400 }
      )
    }

    if (hidden_models && !Array.isArray(hidden_models)) {
      return NextResponse.json(
        { error: "hidden_models must be an array" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      layout,
      prompt_suggestions,
      show_tool_invocations,
      show_conversation_previews,
      multi_model_enabled,
      hidden_models: hidden_models || [],
      _persisted: false,
    })
  } catch (error) {
    console.error("Error in user-preferences PUT API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
