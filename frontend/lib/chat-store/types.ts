export type Chat = {
  id: string
  user_id?: string
  title: string | null
  created_at: string
  updated_at: string
  // Cosmetic-only fields kept for compatibility with UI components that
  // haven't been updated for the simplified engine-backed schema yet — not
  // persisted server-side. See Phase 3 cleanup notes.
  model?: string
  pinned?: boolean
  pinned_at?: string | null
  project_id?: string | null
  public?: boolean
  system_prompt?: string
}

export type Message = {
  id: string
  chat_id: string
  role: string
  content: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimental_attachments?: any
  created_at: string
  message_group_id?: string | null
  model?: string | null
}

export type Chats = Chat
