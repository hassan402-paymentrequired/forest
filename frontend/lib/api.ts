import type { UserProfile } from "@/lib/user/types"
import { fetchClient } from "./fetch"
import { API_ROUTE_UPDATE_CHAT_MODEL } from "./routes"

/**
 * No usage/rate limiting is enforced in this deployment — this app is
 * authenticated-only (see middleware.ts), so there's no anonymous/guest tier
 * to distinguish or throttle. Kept as an async function so call sites don't
 * need to change if real limits are ever introduced.
 */
export async function checkRateLimits(
  _userId: string,
  _isAuthenticated: boolean
) {
  return { remaining: Infinity, remainingPro: Infinity }
}

/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

/**
 * This app is authenticated-only (see middleware.ts) — every request
 * already has a real logged-in user, so there's no guest/anonymous id to
 * resolve. Kept as a function (rather than inlining `user.id` at call
 * sites) since it's still called from a couple of places expecting an
 * async id-resolution step.
 */
export const getOrCreateGuestUserId = async (
  user: UserProfile | null
): Promise<string | null> => {
  return user?.id ?? null
}
