import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { NextResponse } from "next/server"

/**
 * Forwards an uploaded spreadsheet to engine's /predict/upload — keeps the
 * session JWT server-side. The resulting prediction is persisted by engine
 * (see Prediction table) and picked up automatically by /api/chat's grounding
 * (it pulls recent predictions via /predict/history), so nothing else needs
 * to thread the result through explicitly.
 */
export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const incomingForm = await request.formData()
  const file = incomingForm.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  const outgoingForm = new FormData()
  outgoingForm.append("file", file, file.name)

  const res = await engineFetch("/predict/upload", {
    method: "POST",
    body: outgoingForm,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || "Prediction failed" },
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}
