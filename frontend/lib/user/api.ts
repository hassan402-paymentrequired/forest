import { engineFetch, getSessionToken } from "@/lib/auth/session"
import { defaultPreferences } from "@/lib/user-preference-store/utils"
import type { UserProfile } from "./types"

/**
 * Server-side profile fetch for the initial page render (app/layout.tsx).
 * Returns null when there's no session — middleware handles the actual
 * redirect-to-login for protected pages, this just means "render logged out".
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const token = await getSessionToken()
  if (!token) return null

  const res = await engineFetch("/auth/me")
  if (!res.ok) return null

  const { id, name, email } = await res.json()

  return {
    id: String(id),
    name,
    email,
    display_name: name,
    profile_image: "",
    preferences: defaultPreferences,
  }
}
