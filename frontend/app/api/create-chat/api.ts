import { engineFetch, requireUserId } from "@/lib/auth/session"

type CreateChatInput = {
  title?: string
}

export async function createChatInDb({ title }: CreateChatInput) {
  await requireUserId() // throws "UNAUTHENTICATED" if there's no valid session

  const res = await engineFetch("/chat/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || "New Chat" }),
  })

  if (!res.ok) {
    console.error("Failed to create chat thread:", res.status)
    return null
  }

  const thread = await res.json()
  return {
    id: String(thread.id),
    title: thread.title,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
  }
}
