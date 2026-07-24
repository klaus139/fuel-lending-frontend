import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import { AdminLayout } from './components/layout/AdminLayout'
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { UsersPage } from './pages/UsersPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { MerchantDetailPage } from './pages/MerchantDetailPage'
import { LoansPage } from './pages/LoansPage'
import { LoanDashboardPage } from './pages/LoanDashboardPage'
import { LoanDetailPage } from './pages/LoanDetailPage'
import { ReconciliationPage } from './pages/ReconciliationPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { SupportTicketsPage } from './pages/SupportTicketsPage'
import { SettingsPage } from './pages/SettingsPage'
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
        <ToastProvider>
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
                  <Route path="users/:userId" element={<UserDetailPage />} />
                  <Route path="merchants" element={<MerchantsPage />} />
                  <Route path="merchants/:merchantId" element={<MerchantDetailPage />} />
                  <Route path="loans" element={<LoanDashboardPage />} />
                  <Route path="loans/manage" element={<LoansPage />} />
                  <Route path="loans/:loanId" element={<LoanDetailPage />} />
                  <Route path="settlements" element={<SettlementsPage />} />
                  <Route path="reconciliation" element={<ReconciliationPage />} />
                  <Route path="support" element={<SupportTicketsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
