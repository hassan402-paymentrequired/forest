import type { UserProfile } from "@/lib/user/types"

/**
 * Fetches the current user's profile. The `id` param is unused (kept for
 * call-site compatibility) — there's only ever one "current user," derived
 * from the session cookie server-side, so there's no concept of fetching
 * someone else's profile.
 */
export async function fetchUserProfile(
  _id: string
): Promise<UserProfile | null> {
  const res = await fetch("/api/me")
  if (!res.ok) return null

  const { id, name, email } = await res.json()
  return {
    id,
    name,
    email,
    display_name: name,
    profile_image: "",
  }
}

export async function updateUserProfile(
  _id: string,
  _updates: Partial<UserProfile>
): Promise<boolean> {
  // Profile editing isn't wired up yet — engine has no PATCH /auth/me.
  console.warn("updateUserProfile: not yet supported")
  return false
}

export async function signOutUser(): Promise<boolean> {
  const res = await fetch("/api/auth/logout", { method: "POST" })
  return res.ok
}
