import type { Message as MessageAISDK } from "ai"
import { fetchClient } from "../../fetch"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"

export interface ExtendedMessageAISDK extends MessageAISDK {
  message_group_id?: string
  model?: string
}

function mapMessage(m: {
  id: number | string
  content: string
  role: string
  experimental_attachments?: unknown
  created_at: string
  message_group_id?: string | null
  prediction_id?: number | null
}): MessageAISDK {
  return {
    id: String(m.id),
    content: m.content ?? "",
    role: m.role as MessageAISDK["role"],
    experimental_attachments:
      m.experimental_attachments as MessageAISDK["experimental_attachments"],
    createdAt: new Date(m.created_at || ""),
    // biome-ignore lint: matches Zola's original ExtendedMessageAISDK shape
    ...({ message_group_id: m.message_group_id ?? undefined } as any),
  }
}

export async function getMessagesFromDb(
  chatId: string
): Promise<MessageAISDK[]> {
  const res = await fetchClient(`/api/chat-threads/${chatId}/messages`)
  if (!res.ok) {
    console.error("Failed to fetch messages:", res.status)
    return []
  }

  const messages = await res.json()
  return messages.map(mapMessage)
}

export async function getLastMessagesFromDb(
  chatId: string,
  limit: number = 2
): Promise<MessageAISDK[]> {
  const all = await getMessagesFromDb(chatId)
  return all.slice(-limit)
}

async function insertMessageToDb(
  chatId: string,
  message: ExtendedMessageAISDK
) {
  await fetchClient(`/api/chat-threads/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: message.role,
      content: message.content,
      experimental_attachments: message.experimental_attachments,
      message_group_id: message.message_group_id || null,
    }),
  })
}

async function insertMessagesToDb(
  chatId: string,
  messages: ExtendedMessageAISDK[]
) {
  for (const message of messages) {
    await insertMessageToDb(chatId, message)
  }
}

async function deleteMessagesFromDb(chatId: string) {
  const res = await fetchClient(`/api/chat-threads/${chatId}/messages`, {
    method: "DELETE",
  })
  if (!res.ok) {
    console.error("Failed to clear messages from database:", res.status)
  }
}

type ChatMessageEntry = {
  id: string
  messages: MessageAISDK[]
}

export async function getCachedMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  )
}

export async function cacheMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function addMessage(
  chatId: string,
  message: MessageAISDK
): Promise<void> {
  await insertMessageToDb(chatId, message)
  const current = await getCachedMessages(chatId)
  const updated = [...current, message]

  await writeToIndexedDB("messages", { id: chatId, messages: updated })
}

export async function setMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await insertMessagesToDb(chatId, messages)
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  await deleteMessagesFromDb(chatId)
  await clearMessagesCache(chatId)
}
