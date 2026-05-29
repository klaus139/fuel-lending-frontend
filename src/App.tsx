import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AdminLayout } from './components/layout/AdminLayout'
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { UsersPage } from './pages/UsersPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { LoansPage } from './pages/LoansPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { TestQrCodePage } from './pages/TestQrCodePage'
import { TestQrCustomerPage } from './pages/TestQrCustomerPage'
import { TestQrMerchantPage } from './pages/TestQrMerchantPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route path="/demo/qr" element={<TestQrCodePage />} />
              <Route path="/demo/qr/merchant" element={<TestQrMerchantPage />} />
              <Route path="/demo/qr/customer" element={<TestQrCustomerPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="merchants" element={<MerchantsPage />} />
                  <Route path="loans" element={<LoansPage />} />
                  <Route path="settlements" element={<SettlementsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
