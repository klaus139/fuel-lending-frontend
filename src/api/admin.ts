import { apiGet, apiPatch, apiPost, apiPut, setTokens, clearTokens } from './client'
import type {
  AuthTokensResponse,
  AuthUser,
  PaginatedResult,
  AdminDashboardData,
  AdminFinanceOverview,
  RepaymentRateReport,
  TransactionVolumeReport,
  AdminUserSummary,
  AdminUserOverview,
  AdminRepaymentRow,
  AdminUserTransaction,
  SupportTopic,
  AdminSaleRow,
  AdminLoanListItem,
  AdminOverdueLoanItem,
  AdminMerchantSummary,
  AdminCreateMerchantInput,
  MerchantDetail,
  AdminMerchantBranchSummary,
  AdminMerchantSellerSummary,
  AdminMerchantSalesSummary,
  AdminMerchantDailySalesRow,
  Settlement,
  AdminFinanceSettlementRow,
  SalesQuery,
  UsersQuery,
  LoansQuery,
  MerchantsQuery,
  SettlementsQuery,
  LoanSummary,
  SupportTicketsQuery,
  SupportTicketSummary,
  SupportTicketDetail,
  SupportTicketStatus,
  AdminLoanConfig,
  ReconciliationMerchantRow,
  ReconciliationSnapshotRow,
  SnapshotTransactionsResult,
  LoanReconMismatch,
  TriggerRepaymentResult,
  SendLoanReminderResult,
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

  getUserOverview: (userId: string) => apiGet<AdminUserOverview>(`/admin/users/${userId}/overview`),

  getUserLoans: (userId: string, page = 1, limit = 10) =>
    apiGet<PaginatedResult<LoanSummary>>(`/admin/users/${userId}/loans`, { page, limit }),

  getUserTransactions: (userId: string, page = 1, limit = 10) =>
    apiGet<PaginatedResult<AdminUserTransaction>>(`/admin/users/${userId}/transactions`, {
      page,
      limit,
    }),

  sendUserMessage: (
    userId: string,
    body: { message: string; topic?: SupportTopic; subject?: string },
  ) => apiPost<SupportTicketDetail>(`/admin/users/${userId}/messages`, body),

  repayments: (query: { page?: number; limit?: number; userId?: string; loanId?: string }) =>
    apiGet<PaginatedResult<AdminRepaymentRow>>('/admin/repayments', query as Record<string, unknown>),

  updateUser: (userId: string, body: { firstName?: string; lastName?: string; email?: string; phone?: string }) =>
    apiPatch<AdminUserSummary>(`/admin/users/${userId}`, body),

  updateUserStatus: (userId: string, accountStatus: 'active' | 'blocked') =>
    apiPatch<AdminUserSummary>(`/admin/users/${userId}/status`, { accountStatus }),

  loans: (query: LoansQuery) =>
    apiGet<PaginatedResult<AdminLoanListItem>>('/admin/loans', query as Record<string, unknown>),

  overdueLoans: (page: number, limit: number) =>
    apiGet<PaginatedResult<AdminOverdueLoanItem>>('/admin/loans/overdue', { page, limit }),

  collectionsByDpd: (page: number, limit: number, dpdBucket?: string) =>
    apiGet<PaginatedResult<AdminOverdueLoanItem>>('/admin/loans/collections', {
      page,
      limit,
      ...(dpdBucket ? { dpdBucket } : {}),
    }),

  loanReconMismatches: () =>
    apiGet<{ items: LoanReconMismatch[] }>('/admin/loans/recon-mismatches'),

  getLoan: (loanId: string) => apiGet<AdminLoanListItem>(`/admin/loans/${loanId}`),

  approveLoan: (loanId: string) => apiPatch<LoanSummary>(`/admin/loans/${loanId}/approve`),

  rejectLoan: (loanId: string, reason?: string) =>
    apiPatch<LoanSummary>(`/admin/loans/${loanId}/reject`, reason ? { reason } : {}),

  closeLoan: (loanId: string, resolution: 'repaid' | 'defaulted', note?: string) =>
    apiPost<LoanSummary>(`/admin/loans/${loanId}/close`, { resolution, note }),

  triggerLoanRepayment: (loanId: string) =>
    apiPost<TriggerRepaymentResult>(`/admin/loans/${loanId}/trigger-repayment`),

  sendLoanReminder: (loanId: string) =>
    apiPost<SendLoanReminderResult>(`/admin/loans/${loanId}/send-reminder`),

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

  merchantBranches: (merchantId: string) =>
    apiGet<AdminMerchantBranchSummary[]>(`/admin/merchants/${merchantId}/branches`),

  merchantSellers: (merchantId: string, branchId?: string) =>
    apiGet<AdminMerchantSellerSummary[]>(`/admin/merchants/${merchantId}/sellers`, {
      ...(branchId ? { branchId } : {}),
    }),

  merchantSalesSummary: (
    merchantId: string,
    query?: { fromDate?: string; toDate?: string; settlementStatus?: string },
  ) =>
    apiGet<AdminMerchantSalesSummary>(
      `/admin/merchants/${merchantId}/sales/summary`,
      query as Record<string, unknown>,
    ),

  merchantDailySales: (
    merchantId: string,
    query?: { fromDate?: string; toDate?: string },
  ) =>
    apiGet<AdminMerchantDailySalesRow[]>(
      `/admin/merchants/${merchantId}/sales/daily`,
      query as Record<string, unknown>,
    ),

  merchantSales: (
    merchantId: string,
    query?: SalesQuery & { branchId?: string; sellerId?: string },
  ) =>
    apiGet<PaginatedResult<AdminSaleRow>>(
      `/admin/merchants/${merchantId}/sales`,
      query as Record<string, unknown>,
    ),

  settlements: (query: SettlementsQuery) =>
    apiGet<PaginatedResult<Settlement>>('/admin/settlements', query as Record<string, unknown>),

  financeSettlements: (query: SettlementsQuery) =>
    apiGet<PaginatedResult<AdminFinanceSettlementRow>>('/admin/finance/settlements', query as Record<string, unknown>),

  generateSettlements: (settlementDate?: string) =>
    apiPost<{ generated: number }>('/admin/settlements/generate', settlementDate ? { settlementDate } : {}),

  markSettlementPaid: (settlementId: string, paymentReference?: string) =>
    apiPost<Settlement>(`/admin/settlements/${settlementId}/mark-paid`, paymentReference ? { paymentReference } : {}),

  supportTickets: (query: SupportTicketsQuery) =>
    apiGet<PaginatedResult<SupportTicketSummary>>('/admin/support/tickets', query as Record<string, unknown>),

  getSupportTicket: (ticketId: string) =>
    apiGet<SupportTicketDetail>(`/admin/support/tickets/${ticketId}`),

  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) =>
    apiPatch<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/status`, { status }),

  replySupportTicket: (ticketId: string, message: string) =>
    apiPost<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/replies`, { message }),

  getLoanConfig: () => apiGet<AdminLoanConfig>('/admin/config/loan'),

  setLoanConfig: (body: {
    serviceChargeMode?: 'fixed' | 'percent'
    serviceChargePerLitre?: number
    /** @deprecated use serviceChargePerLitre */
    interestPerLitre?: number
    serviceChargePercent?: number
    overdueDailyInterestPercent?: number
  }) => apiPut<AdminLoanConfig>('/admin/config/loan', body),

  reconciliationMerchants: (page = 1, limit = 20) =>
    apiGet<PaginatedResult<ReconciliationMerchantRow>>('/admin/reconciliation/merchants', {
      page,
      limit,
    }),

  merchantSnapshots: (
    merchantProfileId: string,
    page = 1,
    limit = 20,
    status?: ReconciliationSnapshotRow['status'],
  ) =>
    apiGet<PaginatedResult<ReconciliationSnapshotRow>>(
      `/admin/reconciliation/merchants/${merchantProfileId}/snapshots`,
      { page, limit, ...(status ? { status } : {}) },
    ),

  syncMerchantSnapshot: (merchantProfileId: string, salesDate: string) =>
    apiPost<ReconciliationSnapshotRow>(
      `/admin/reconciliation/merchants/${merchantProfileId}/snapshots/sync`,
      { salesDate },
    ),

  snapshotTransactions: (merchantProfileId: string, salesDate: string, page = 1, limit = 20) =>
    apiGet<SnapshotTransactionsResult>(
      `/admin/reconciliation/merchants/${merchantProfileId}/snapshots/${salesDate}/transactions`,
      { page, limit },
    ),

  reconcileSnapshot: (snapshotId: string) =>
    apiPost<ReconciliationSnapshotRow>(`/admin/reconciliation/snapshots/${snapshotId}/reconcile`),

  initiateSettlementFromSnapshot: (snapshotId: string) =>
    apiPost<Settlement>(`/admin/reconciliation/snapshots/${snapshotId}/initiate-settlement`),
}
