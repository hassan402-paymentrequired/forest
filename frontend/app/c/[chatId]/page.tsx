import { ChatContainer } from "@/app/components/chat/chat-container"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"

// Auth enforcement for this page happens in middleware.ts (engine JWT
// session check) — no per-page auth check needed here.
export default async function Page() {
  return (
    <MessagesProvider>
      <LayoutApp>
        <ChatContainer />
      </LayoutApp>
    </MessagesProvider>
  )
}
