import { engineFetch, requireUserId } from "@/lib/auth/session"
import { createAnthropic } from "@ai-sdk/anthropic"
import { Message as MessageAISDK, streamText } from "ai"

export const maxDuration = 60

const CLAUDE_MODEL = "claude-sonnet-5"

// This workspace's Anthropic API key is identity-linked (tied to a personal
// Console login) rather than workspace-scoped, so the API requires this
// header to know which workspace the request acts in.
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  headers: process.env.ANTHROPIC_WORKSPACE_ID
    ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
    : undefined,
})

const BASE_SYSTEM_PROMPT = `You are an assistant helping Lagos State secondary school staff understand and act on their school planning data. A Random Forest model predicts dropout risk from school metrics (enrollment, teacher-student ratio, attendance rate, budget allocation, infrastructure score). Explain predictions in plain, practical language and give concrete, prioritized recommendations — never just repeat raw numbers back at the user without interpreting them.`

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  message_group_id?: string
}

type PredictionHistoryItem = {
  id: number
  input_features: Record<string, number>[] | null
  prediction_output: number[]
  created_at: string
}

async function buildGroundedSystemPrompt(): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT

  try {
    const res = await engineFetch("/predict/history")
    if (res.ok) {
      const history: PredictionHistoryItem[] = await res.json()
      if (history.length > 0) {
        const recent = history.slice(0, 5)
        const summary = recent
          .map((p) => {
            const features = p.input_features?.[0]
            const featuresStr = features
              ? Object.entries(features)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(", ")
              : "unknown inputs"
            return `- ${new Date(p.created_at).toLocaleDateString()}: predicted dropout_rate=${p.prediction_output[0]?.toFixed(2)}% (${featuresStr})`
          })
          .join("\n")
        prompt += `\n\nThis school's past predictions (most recent first):\n${summary}\n\nReference these when relevant, even if the current message didn't include a new upload.`
      }
    }
  } catch (err) {
    console.error("Failed to fetch prediction history for grounding:", err)
  }

  return prompt
}

export async function POST(req: Request) {
  try {
    await requireUserId() // throws "UNAUTHENTICATED" if there's no valid session
    const { messages, chatId, message_group_id } =
      (await req.json()) as ChatRequest

    if (!messages || !chatId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const userMessage = messages[messages.length - 1]

    if (userMessage?.role === "user") {
      await engineFetch(`/chat/threads/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: userMessage.content,
          experimental_attachments: userMessage.experimental_attachments,
          message_group_id,
        }),
      })
    }

    const system = await buildGroundedSystemPrompt()

    const result = streamText({
      model: anthropic(CLAUDE_MODEL),
      system,
      messages,
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
      },
      onFinish: async ({ text }) => {
        try {
          await engineFetch(`/chat/threads/${chatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: text,
              message_group_id,
            }),
          })
        } catch (err) {
          console.error("Failed to save assistant message:", err)
        }
      },
    })

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error: unknown) => {
        console.error("Error forwarded to client:", error)
        return error instanceof Error ? error.message : "Something went wrong"
      },
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
