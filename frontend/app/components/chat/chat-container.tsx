"use client"

// Multi-model compare mode disabled — single fixed provider, no model choice
// exposed to schools, so the multi-chat model picker should never render.
// import { MultiChat } from "@/app/components/multi-chat/multi-chat"
// import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { Chat } from "./chat"

export function ChatContainer() {
  return <Chat />
}
