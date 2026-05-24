import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/admin'
import { getAccessToken } from '../api/client'
import type { AuthUser } from '../types/api'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const bootstrap = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const me = await authApi.me()
      if (me.role !== 'admin') {
        authApi.clearTokens()
        setUser(null)
      } else {
        setUser(me)
      }
    } catch {
      authApi.clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    bootstrap()
  }, [bootstrap])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    if (data.user.role !== 'admin') {
      authApi.clearTokens()
      throw new Error('Access denied. Admin credentials required.')
    }
    authApi.storeTokens(data)
    setUser(data.user)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    authApi.clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
