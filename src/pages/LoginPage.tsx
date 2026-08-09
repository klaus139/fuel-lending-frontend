import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, ErrorMessage, Input, FormField } from '../components/ui'
import { ApiError } from '../api/client'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--bg-primary) p-4">
      <div className="w-full max-w-md rounded-2xl border border-(--border) bg-(--bg-card) p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-500">BurrowFuel</p>
          <h1 className="mt-2 text-2xl font-semibold text-(--text-primary)">Admin Login</h1>
          <p className="mt-1 text-sm text-(--text-muted)">Sign in with your admin credentials</p>
        </div>

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
          <FormField label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </FormField>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-emerald-500 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
