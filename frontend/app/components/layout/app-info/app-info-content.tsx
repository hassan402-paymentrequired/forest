import { APP_NAME } from "@/lib/config"

export function AppInfoContent() {
  return (
    <div className="space-y-4">
      <p className="text-foreground leading-relaxed">
        <span className="font-medium">{APP_NAME}</span> is an AI-driven
        planning assistant for Lagos State secondary schools.
        <br />
        Attach your school's data to get predictions and recommendations, and
        discuss them in chat — no separate dashboard, no setup.
      </p>
    </div>
  )
}
