import { apiGet, apiPatch, apiPost, setTokens, clearTokens } from './client'
import type {
  AuthTokensResponse,
  AuthUser,
  PaginatedResult,
  AdminDashboardData,
  AdminFinanceOverview,
  RepaymentRateReport,
  TransactionVolumeReport,
  AdminUserSummary,
  AdminSaleRow,
  AdminLoanListItem,
  AdminOverdueLoanItem,
  AdminMerchantSummary,
  AdminCreateMerchantInput,
  Settlement,
  AdminFinanceSettlementRow,
  SalesQuery,
  UsersQuery,
  LoansQuery,
  MerchantsQuery,
  SettlementsQuery,
  LoanSummary,
  AdminMerchantSummary as MerchantDetail,
} from '../types/api'

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<AuthTokensResponse>('/auth/login', { email, password }),

  me: () => apiGet<AuthUser>('/auth/me'),

  logout: () => apiPost<null>('/auth/logout'),

  storeTokens: (data: AuthTokensResponse) => {
    setTokens(data.accessToken, data.refreshToken)
  },

  clearTokens,
}

export const adminApi = {
  dashboard: () => apiGet<AdminDashboardData>('/admin/dashboard'),

  financeOverview: () => apiGet<AdminFinanceOverview>('/admin/finance/overview'),

  repaymentRate: () => apiGet<RepaymentRateReport>('/admin/reports/repayment-rate'),

  transactionVolume: (fromDate?: string, toDate?: string) =>
    apiGet<TransactionVolumeReport>('/admin/reports/transactions', {
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    }),

  sales: (query: SalesQuery) =>
    apiGet<PaginatedResult<AdminSaleRow>>('/admin/sales', query as Record<string, unknown>),

  transactions: (query: SalesQuery) =>
    apiGet<PaginatedResult<AdminSaleRow>>('/admin/transactions', query as Record<string, unknown>),

  users: (query: UsersQuery) =>
    apiGet<PaginatedResult<AdminUserSummary>>('/admin/users', query as Record<string, unknown>),

  getUser: (userId: string) => apiGet<AdminUserSummary>(`/admin/users/${userId}`),

  updateUser: (userId: string, body: { firstName?: string; lastName?: string; email?: string; phone?: string }) =>
    apiPatch<AdminUserSummary>(`/admin/users/${userId}`, body),

  updateUserStatus: (userId: string, accountStatus: 'active' | 'blocked') =>
    apiPatch<AdminUserSummary>(`/admin/users/${userId}/status`, { accountStatus }),

  loans: (query: LoansQuery) =>
    apiGet<PaginatedResult<AdminLoanListItem>>('/admin/loans', query as Record<string, unknown>),

  overdueLoans: (page: number, limit: number) =>
    apiGet<PaginatedResult<AdminOverdueLoanItem>>('/admin/loans/overdue', { page, limit }),

  getLoan: (loanId: string) => apiGet<AdminLoanListItem>(`/admin/loans/${loanId}`),

  approveLoan: (loanId: string) => apiPatch<LoanSummary>(`/admin/loans/${loanId}/approve`),

  rejectLoan: (loanId: string, reason?: string) =>
    apiPatch<LoanSummary>(`/admin/loans/${loanId}/reject`, reason ? { reason } : {}),

  closeLoan: (loanId: string, resolution: 'repaid' | 'defaulted', note?: string) =>
    apiPost<LoanSummary>(`/admin/loans/${loanId}/close`, { resolution, note }),

  merchants: (query: MerchantsQuery) =>
    apiGet<PaginatedResult<AdminMerchantSummary>>('/admin/merchants', query as Record<string, unknown>),

  getMerchant: (merchantId: string) => apiGet<MerchantDetail>(`/admin/merchants/${merchantId}`),

  createMerchant: (body: AdminCreateMerchantInput) =>
    apiPost<MerchantDetail>('/admin/merchants', body),

  updateMerchant: (merchantId: string, body: Partial<AdminCreateMerchantInput>) =>
    apiPatch<MerchantDetail>(`/admin/merchants/${merchantId}`, body),

  approveMerchant: (merchantId: string) =>
    apiPatch<MerchantDetail>(`/admin/merchants/${merchantId}/approve`),

  suspendMerchant: (merchantId: string) =>
    apiPatch<MerchantDetail>(`/admin/merchants/${merchantId}/suspend`),

  rejectMerchant: (merchantId: string, reason: string) =>
    apiPatch<MerchantDetail>(`/admin/merchants/${merchantId}/reject`, { reason }),

  settlements: (query: SettlementsQuery) =>
    apiGet<PaginatedResult<Settlement>>('/admin/settlements', query as Record<string, unknown>),

  financeSettlements: (query: SettlementsQuery) =>
    apiGet<PaginatedResult<AdminFinanceSettlementRow>>('/admin/finance/settlements', query as Record<string, unknown>),

  generateSettlements: (settlementDate?: string) =>
    apiPost<{ generated: number }>('/admin/settlements/generate', settlementDate ? { settlementDate } : {}),

  markSettlementPaid: (settlementId: string, paymentReference?: string) =>
    apiPost<Settlement>(`/admin/settlements/${settlementId}/mark-paid`, paymentReference ? { paymentReference } : {}),
}
