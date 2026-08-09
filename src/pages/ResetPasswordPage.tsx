import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/admin'
import { ApiError } from '../api/client'
import { BrandLogo } from '../components/BrandLogo'
import { Button, ErrorMessage, Input, FormField } from '../components/ui'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')?.trim() ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Reset link is invalid or missing a token.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      setDone(true)
      window.setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to reset password',
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
          <h1 className="mt-4 text-2xl font-semibold text-(--text-primary)">Reset password</h1>
          <p className="mt-1 text-sm text-(--text-muted)">Choose a new password for your admin account</p>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <ErrorMessage message="This reset link is invalid or incomplete. Request a new one." />
            <Link
              to="/forgot-password"
              className="inline-block text-sm font-medium text-emerald-500 hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              Password reset successfully. Redirecting to login...
            </p>
            <Link to="/login" className="inline-block text-sm font-medium text-emerald-500 hover:underline">
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorMessage message={error} />}
            <FormField label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirm password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset password'}
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
