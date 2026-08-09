import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/admin'
import { ApiError } from '../api/client'
import { BrandLogo } from '../components/BrandLogo'
import { Button, ErrorMessage, Input, FormField } from '../components/ui'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to send reset link',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--bg-primary) p-4">
      <div className="w-full max-w-md rounded-2xl border border-(--border) bg-(--bg-card) p-8 shadow-xl">
        <div className="mb-8 text-center">
          <BrandLogo size="lg" className="mx-auto rounded-xl" />
          <h1 className="mt-4 text-2xl font-semibold text-(--text-primary)">Forgot password</h1>
          <p className="mt-1 text-sm text-(--text-muted)">
            Enter your admin email and we&apos;ll send a reset link
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              If an account exists with this email, a password reset link has been sent.
            </p>
            <Link to="/login" className="inline-block text-sm font-medium text-emerald-500 hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorMessage message={error} />}
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
            <p className="text-center text-sm text-(--text-muted)">
              <Link to="/login" className="font-medium text-emerald-500 hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
