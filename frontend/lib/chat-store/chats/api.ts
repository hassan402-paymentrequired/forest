import { readFromIndexedDB, writeToIndexedDB } from "@/lib/chat-store/persist"
import type { Chat, Chats } from "@/lib/chat-store/types"
import { fetchClient } from "../../fetch"
import { API_ROUTE_TOGGLE_CHAT_PIN } from "../../routes"

function mapThread(thread: {
  id: number | string
  title: string | null
  created_at: string
  updated_at: string
}): Chat {
  return {
    id: String(thread.id),
    title: thread.title,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
  }
}

export async function getChatsForUserInDb(_userId: string): Promise<Chats[]> {
  const res = await fetchClient("/api/chat-threads")
  if (!res.ok) {
    console.error("Failed to fetch chats:", res.status)
    return []
  }

  const threads = await res.json()
  return threads.map(mapThread)
}

export async function updateChatTitleInDb(id: string, title: string) {
  const res = await fetchClient(`/api/chat-threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error("Failed to update chat title")
}

export async function deleteChatInDb(id: string) {
  const res = await fetchClient(`/api/chat-threads/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete chat")
}

export async function fetchAndCacheChats(userId: string): Promise<Chats[]> {
  const data = await getChatsForUserInDb(userId)

  if (data.length > 0) {
    await writeToIndexedDB("chats", data)
  }

  return data
}

export async function getCachedChats(): Promise<Chats[]> {
  const all = await readFromIndexedDB<Chats>("chats")
  return (all as Chats[]).sort(
    (a, b) => +new Date(b.created_at || "") - +new Date(a.created_at || "")
  )
}

export async function updateChatTitle(
  id: string,
  title: string
): Promise<void> {
  await updateChatTitleInDb(id, title)
  const all = await getCachedChats()
  const updated = (all as Chats[]).map((c) =>
    c.id === id ? { ...c, title } : c
  )
  await writeToIndexedDB("chats", updated)
}

export async function deleteChat(id: string): Promise<void> {
  await deleteChatInDb(id)
  const all = await getCachedChats()
  await writeToIndexedDB(
    "chats",
    (all as Chats[]).filter((c) => c.id !== id)
  )
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const all = await readFromIndexedDB<Chat>("chats")
  return (all as Chat[]).find((c) => c.id === chatId) || null
}

/**
 * Cosmetic-only — engine's chat_threads has no `model` column (the app uses
 * one fixed LLM, see Phase 4). Keeps the sidebar's per-chat model badge
 * working locally without a backend round-trip.
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const all = await getCachedChats()
    const updated = (all as Chats[]).map((c) =>
      c.id === chatId ? { ...c, model } : c
    )
    await writeToIndexedDB("chats", updated)
    return { success: true }
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

export async function toggleChatPin(chatId: string, pinned: boolean) {
  try {
    const res = await fetchClient(API_ROUTE_TOGGLE_CHAT_PIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, pinned }),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update pinned: ${res.status} ${res.statusText}`
      )
    }
    const all = await getCachedChats()
    const now = new Date().toISOString()
    const updated = (all as Chats[]).map((c) =>
      c.id === chatId ? { ...c, pinned, pinned_at: pinned ? now : null } : c
    )
    await writeToIndexedDB("chats", updated)
    return responseData
  } catch (error) {
    console.error("Error updating chat pinned:", error)
    throw error
  }
}

export async function createNewChat(
  _userId: string,
  title?: string,
  _model?: string,
  _isAuthenticated?: boolean,
  _projectId?: string
): Promise<Chats> {
  try {
    const res = await fetchClient("/api/create-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "New Chat" }),
    })

    const responseData = await res.json()

    if (!res.ok || !responseData.chat) {
      throw new Error(responseData.error || "Failed to create chat")
    }

    const chat: Chats = mapThread(responseData.chat)

    await writeToIndexedDB("chats", chat)
    return chat
  } catch (error) {
    console.error("Error creating new chat:", error)
    throw error
  }
}
