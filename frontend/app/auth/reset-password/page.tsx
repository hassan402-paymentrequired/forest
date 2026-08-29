"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { HeaderGoBack } from "../../components/header-go-back"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("This reset link is missing its token. Request a new one.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to reset password")
        return
      }

      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Reset password error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
        This reset link is invalid or missing its token.{" "}
        <Link href="/auth/forgot-password" className="underline">
          Request a new one
        </Link>
        .
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full text-base sm:text-base"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-background flex h-dvh w-full flex-col">
      <HeaderGoBack href="/auth/login" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-foreground text-3xl font-medium tracking-tight sm:text-4xl">
              Set a new password
            </h1>
            <p className="text-muted-foreground mt-3">
              Choose a new password for your account
            </p>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
