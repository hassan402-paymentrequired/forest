// engine's chat_threads has no `model` column (this app uses one fixed
// LLM) — this is a client-side-only no-op, matching how
// use-model.ts/updateChatModel already only writes to IndexedDB. Kept as a
// route so the client doesn't need changes if per-thread models are added.
export async function POST(request: Request) {
  try {
    const { chatId, model } = await request.json()

    if (!chatId || !model) {
      return new Response(
        JSON.stringify({ error: "Missing chatId or model" }),
        { status: 400 }
      )
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err: unknown) {
    console.error("Error in update-chat-model endpoint:", err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500 }
    )
  }
}
