"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { useUser } from "@/lib/user-store/provider"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

/**
 * One shared "Uploads" view for every account, regardless of role — same
 * route, same link, same tabs (All / Yours), for a school and a Ministry
 * account alike. A school's "All" and "Yours" happen to show the same
 * thing, because a school has nothing else it's allowed to see. Only a
 * Ministry account's "All" tab additionally includes every school — the
 * tab set itself never changes based on role.
 *
 * Uploading is not role-split either (see chat_routes.py's _prepare_respond
 * — the file-attach path has no role check): a Ministry account can already
 * attach a file in the same chat interface a school uses, for one school or
 * several. Those Ministry-made uploads stay a Ministry-only copy
 * (Prediction.user_id = the Ministry account, not the school described —
 * there's no reliable way to attribute an upload to a specific school's
 * real account), which is why they show up under "Yours" here, separate
 * from each school's own uploads.
 */

type HistoryItem = {
  id: number
  row_labels: string[] | null
  prediction_output: number[]
  created_at: string
}

type RankedSchool = {
  label: string
  predicted_dropout_rate: number
  user_id: number
  prediction_id: number
}

type ListEntry = {
  key: string
  title: string
  subtitle: string
  prediction_id: number
}

type Tab = "all" | "yours"

function historyToEntries(history: HistoryItem[]): ListEntry[] {
  return history.map((h) => ({
    key: String(h.id),
    title: h.row_labels?.[0] || "Upload",
    subtitle: new Date(h.created_at).toLocaleDateString(),
    prediction_id: h.id,
  }))
}

export default function UploadsPage() {
  const { user, isLoading: userLoading } = useUser()
  const router = useRouter()
  const [ownEntries, setOwnEntries] = useState<ListEntry[] | null>(null)
  const [schoolEntries, setSchoolEntries] = useState<ListEntry[] | null>(null)
  const [tab, setTab] = useState<Tab>("all")
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<number | null>(null)

  const isMinistry = user?.role === "ministry"

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      router.replace("/")
      return
    }

    async function load() {
      try {
        const ownRes = await fetch("/api/predict/history")
        const ownBody = await ownRes.json()
        if (!ownRes.ok) throw new Error(ownBody.error || "Failed to load your uploads")
        setOwnEntries(historyToEntries((ownBody as HistoryItem[]) ?? []))

        if (user!.role === "ministry") {
          const schoolsRes = await fetch("/api/ministry/schools")
          const schoolsBody = await schoolsRes.json()
          if (!schoolsRes.ok) throw new Error(schoolsBody.error || "Failed to load schools")
          const schools = (schoolsBody.schools as RankedSchool[]) ?? []
          setSchoolEntries(
            schools.map((s) => ({
              key: `${s.user_id}-${s.prediction_id}`,
              title: s.label,
              subtitle: `Predicted dropout risk: ${s.predicted_dropout_rate.toFixed(1)}%`,
              prediction_id: s.prediction_id,
            }))
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load uploads")
      }
    }

    load()
  }, [user, userLoading, router])

  const loaded = ownEntries !== null && (!isMinistry || schoolEntries !== null)
  const visible = useMemo(() => {
    if (!loaded) return null
    if (tab === "yours") return ownEntries!
    return [...(schoolEntries ?? []), ...ownEntries!]
  }, [loaded, tab, ownEntries, schoolEntries])

  async function openEntry(entry: ListEntry) {
    setOpeningId(entry.prediction_id)
    try {
      const chatRes = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: entry.title }),
      })
      const { chat, error: chatError } = await chatRes.json()
      if (!chatRes.ok || !chat) throw new Error(chatError || "Failed to open chat")

      // Invisible system message (never rendered — see message.tsx) that
      // seeds this thread's grounding with the chosen upload's prediction,
      // so the first real question typed is already answered from that data.
      await fetch(`/api/chat-threads/${chat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "system",
          content: "",
          prediction_id: entry.prediction_id,
        }),
      })

      router.push(`/c/${chat.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open upload")
      setOpeningId(null)
    }
  }

  if (userLoading || !user) {
    return null
  }

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="mb-1 text-2xl font-medium tracking-tight">Uploads</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Click an upload to chat about it.
          </p>

          <div className="border-border mb-6 flex gap-4 border-b">
            {(["all", "yours"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive mb-6 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {!visible && !error && (
            <p className="text-muted-foreground text-sm">Loading…</p>
          )}

          {visible && visible.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {tab === "yours"
                ? "No uploads yet — attach a file in chat to get started."
                : "Nothing to show yet."}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {visible?.map((entry) => (
              <button
                key={entry.key}
                onClick={() => openEntry(entry)}
                disabled={openingId !== null}
                className="border-input bg-background hover:bg-accent flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors disabled:opacity-50"
              >
                <div className="font-medium">{entry.title}</div>
                <div className="text-muted-foreground flex-shrink-0 text-xs">
                  {entry.subtitle}
                </div>
              </button>
            ))}
          </div>
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
