"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { HeaderGoBack } from "../../components/header-go-back"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      // Always show the same generic success message, regardless of
      // whether the email was actually registered — matches engine's own
      // forgot-password response, avoids leaking which emails have accounts.
      setSubmitted(true)
    } catch (err) {
      console.error("Forgot password error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-background flex h-dvh w-full flex-col">
      <HeaderGoBack href="/auth/login" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-foreground text-3xl font-medium tracking-tight sm:text-4xl">
              Reset your password
            </h1>
            <p className="text-muted-foreground mt-3">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="bg-muted text-foreground rounded-md p-3 text-sm">
              If that email is registered, we&apos;ve sent a password reset
              link to it. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full text-base sm:text-base"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="text-muted-foreground text-center text-sm">
            Remembered your password?{" "}
            <Link href="/auth/login" className="text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
