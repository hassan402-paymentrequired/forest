import { engineFetch, requireUserId } from "@/lib/auth/session"

export const maxDuration = 60

type IncomingAttachment = { name: string; contentType: string; url: string }

type ChatRequest = {
  messages: Array<{
    role: string
    content: string
    experimental_attachments?: IncomingAttachment[]
  }>
  chatId: string
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",")
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "application/octet-stream"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function POST(req: Request) {
  try {
    await requireUserId() // throws "UNAUTHENTICATED" if there's no valid session

    const { messages, chatId } = (await req.json()) as ChatRequest

    if (!messages || !chatId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const userMessage = messages[messages.length - 1]
    const attachment = userMessage?.experimental_attachments?.find((a) =>
      a.url?.startsWith("data:")
    )

    const form = new FormData()
    form.append("content", userMessage?.content ?? "")
    if (attachment) {
      form.append("file", dataUrlToBlob(attachment.url), attachment.name)
    }

    // Engine's /respond persists the user message, resolves grounding (the
    // attached file or thread history), and streams the reply back as plain
    // text — it's the sole source of truth for both persistence and
    // conversational context now, so nothing else needs to be sent or saved
    // here.
    const engineRes = await engineFetch(`/chat/threads/${chatId}/respond`, {
      method: "POST",
      body: form,
    })

    if (!engineRes.ok || !engineRes.body) {
      const data = await engineRes.json().catch(() => null)
      return new Response(
        JSON.stringify({ error: data?.detail || "Chat failed" }),
        { status: engineRes.status || 500 }
      )
    }

    return new Response(engineRes.body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      })
    }

    console.error("Error in /api/chat:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    )
  }
}
