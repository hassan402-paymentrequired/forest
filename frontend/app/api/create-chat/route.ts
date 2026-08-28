import { createChatInDb } from "./api"

export async function POST(request: Request) {
  try {
    const { title } = await request.json()

    const chat = await createChatInDb({ title })

    if (!chat) {
      return new Response(
        JSON.stringify({ error: "Failed to create chat" }),
        { status: 500 }
      )
    }

    return new Response(JSON.stringify({ chat }), { status: 200 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      })
    }

    console.error("Error in create-chat endpoint:", err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500 }
    )
  }
}
