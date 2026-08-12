import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/utils'
import { BrandLogo } from '../BrandLogo'
import { Button } from '../ui'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/revenue', label: 'Revenue', icon: '💵' },
  { to: '/settle', label: 'Settle', icon: '🔒' },
  { to: '/transactions', label: 'Fuel sales', icon: '⛽' },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/kyc', label: 'KYC', icon: '🪪' },
  { to: '/merchants', label: 'Merchants', icon: '🏪' },
  { to: '/merchant-applications', label: 'Interest', icon: '📋' },
  { to: '/loans', label: 'Defaulters', icon: '⛽', end: false },
  { to: '/settlements', label: 'Settlements', icon: '💰' },
  { to: '/reconciliation', label: 'Reconciliation', icon: '🧾' },
  { to: '/payments', label: 'Payments', icon: '🔎' },
  { to: '/support', label: 'Support', icon: '🎫' },
  { to: '/ratings', label: 'Ratings', icon: '⭐' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/merchant-app', label: 'Merchant app', icon: '📦' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full min-h-screen bg-(--bg-primary)">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-(--border) bg-(--bg-secondary)">
        <div className="border-b border-(--border) bg-[#0b1f3a] px-4 py-4">
          <BrandLogo variant="full" size="md" className="mx-auto w-full max-w-[180px]" />
          <p className="mt-2 text-center text-xs font-medium text-white/70">Admin Panel</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.end === true}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)',
                )
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-(--border) p-4">
          <p className="truncate text-sm font-medium text-(--text-primary)">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-xs text-(--text-muted)">{user?.email}</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-(--border) bg-(--bg-secondary)/80 px-6 backdrop-blur">
          <p className="text-sm text-(--text-muted)">Platform administration</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
