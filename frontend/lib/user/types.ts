import type { UserPreferences } from "../user-preference-store/utils"

export type UserProfile = {
  id: string
  name: string
  email: string
  display_name: string
  profile_image: string
  system_prompt?: string | null
  preferences?: UserPreferences
  // Vestigial BYOK/multi-model field — always empty now that the app uses one
  // fixed provider (see app/api/chat/route.ts). Kept only so the not-yet-
  // removed model-picker UI (app/components/common/model-selector/*, etc.)
  // still type-checks; that whole cluster is slated for deletion.
  favorite_models?: string[]
}
