import { apiGet, apiPatch, apiPost, apiPostFormData, apiPut, setTokens, clearTokens } from './client'
import type {
  AuthTokensResponse,
  AuthUser,
  PaginatedResult,
  AdminDashboardData,
  AdminFinanceOverview,
  RepaymentRateReport,
  TransactionVolumeReport,
  CompanyRevenueReport,
  AdminUserSummary,
  AdminUserOverview,
  AdminUserOutstanding,
  AdminRepaymentRow,
  AdminUserTransaction,
  SupportTopic,
  AdminSaleRow,
  AdminSalesListResult,
  AdminLoanListItem,
  AdminOverdueLoanItem,
  AdminMerchantSummary,
  AdminCreateMerchantInput,
  MerchantDetail,
  AdminMerchantBranchSummary,
  AdminMerchantSellerSummary,
  AdminMerchantSalesSummary,
  AdminMerchantDailySalesRow,
  NetworkFuelStats,
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
  AdminRatingsListResult,
  RatingsQuery,
  AdminLoanConfig,
  AdminVehicleFuelCapsConfig,
  AdminReferralConfig,
  VehicleType,
  ReconciliationMerchantRow,
  ReconciliationSnapshotRow,
  SnapshotTransactionsResult,
  LoanReconMismatch,
  TriggerRepaymentResult,
  SendLoanReminderResult,
  AdminKycSubmission,
  AdminKycSubmitInput,
  AdminKycSubmitResult,
  AdminVirtualAccount,
  KycStatus,
  NotificationMeta,
  AdminNotificationItem,
  CreateNotificationInput,
  NotificationsQuery,
  NotificationMedia,
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

  revenue: (query?: { fromDate?: string; toDate?: string; merchantCode?: string }) =>
    apiGet<CompanyRevenueReport>('/admin/reports/revenue', {
      ...(query?.fromDate ? { fromDate: query.fromDate } : {}),
      ...(query?.toDate ? { toDate: query.toDate } : {}),
      ...(query?.merchantCode ? { merchantCode: query.merchantCode } : {}),
    }),

  sales: (query: SalesQuery) =>
    apiGet<AdminSalesListResult>('/admin/sales', query as Record<string, unknown>),

  transactions: (query: SalesQuery) =>
    apiGet<AdminSalesListResult>('/admin/transactions', query as Record<string, unknown>),

  users: (query: UsersQuery) =>
    apiGet<PaginatedResult<AdminUserSummary>>('/admin/users', query as Record<string, unknown>),

  getUser: (userId: string) => apiGet<AdminUserSummary>(`/admin/users/${userId}`),

  getUserOverview: (userId: string) => apiGet<AdminUserOverview>(`/admin/users/${userId}/overview`),

  getUserSettlement: (userId: string) =>
    apiGet<{
      user: {
        id: string
        firstName: string
        lastName: string
        email: string
        phone: string
      }
      walletBalance: number
      outstanding: AdminUserOutstanding
    }>(`/admin/users/${userId}/settlement`),

  settleUserPurchase: (
    userId: string,
    body: { amount: number; note?: string },
  ) =>
    apiPost<{
      message: string
      creditedAmount: number
      appliedAmount: number
      fullyRepaid: boolean
      outstandingBalance: number
      walletBalance: number
    }>(`/admin/users/${userId}/settle-purchase`, body),

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

  listKyc: (status?: Exclude<KycStatus, 'not_submitted'>) =>
    apiGet<AdminKycSubmission[]>('/admin/kyc', status ? { status } : undefined),

  getKyc: (kycId: string) => apiGet<AdminKycSubmission>(`/admin/kyc/${kycId}`),

  approveKyc: (kycId: string) => apiPatch<AdminKycSubmission>(`/admin/kyc/${kycId}/approve`),

  rejectKyc: (kycId: string, reason: string) =>
    apiPatch<AdminKycSubmission>(`/admin/kyc/${kycId}/reject`, { reason }),

  reverifyKyc: (kycId: string) => apiPost<AdminKycSubmission>(`/admin/kyc/${kycId}/reverify`),

  submitKycForUser: (userId: string, input: AdminKycSubmitInput) => {
    const form = new FormData()
    form.append('nin', input.nin)
    form.append('dateOfBirth', input.dateOfBirth)
    form.append('address', input.address)
    form.append('city', input.city)
    form.append('state', input.state)
    form.append('lga', input.lga)
    form.append('motorType', input.motorType)
    form.append('motorRegistrationNumber', input.motorRegistrationNumber)
    form.append('photo', input.photo)
    form.append('motorPhoto', input.motorPhoto)
    return apiPostFormData<AdminKycSubmitResult>(`/admin/users/${userId}/kyc`, form)
  },

  provisionUserWallet: (userId: string) =>
    apiPost<AdminVirtualAccount>(`/admin/users/${userId}/wallet/provision`),

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

  merchantFuelStats: (query?: { fromDate?: string; toDate?: string }) =>
    apiGet<NetworkFuelStats>('/admin/merchants/fuel-stats', query as Record<string, unknown>),

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

  requestSettlementApproval: (settlementId: string) =>
    apiPost<Settlement>(`/admin/settlements/${settlementId}/request-approval`),

  approveSettlement: (settlementId: string) =>
    apiPost<Settlement>(`/admin/settlements/${settlementId}/approve`),

  supportTickets: (query: SupportTicketsQuery) =>
    apiGet<PaginatedResult<SupportTicketSummary>>('/admin/support/tickets', query as Record<string, unknown>),

  getSupportTicket: (ticketId: string) =>
    apiGet<SupportTicketDetail>(`/admin/support/tickets/${ticketId}`),

  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) =>
    apiPatch<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/status`, { status }),

  replySupportTicket: (ticketId: string, message: string) =>
    apiPost<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/replies`, { message }),

  ratings: (query: RatingsQuery) =>
    apiGet<AdminRatingsListResult>('/admin/ratings', query as Record<string, unknown>),

  getLoanConfig: () => apiGet<AdminLoanConfig>('/admin/config/loan'),

  setLoanConfig: (body: {
    serviceChargeMode?: 'fixed' | 'percent'
    serviceChargePerLitre?: number
    /** @deprecated use serviceChargePerLitre */
    interestPerLitre?: number
    serviceChargePercent?: number
    overdueDailyInterestPercent?: number
  }) => apiPut<AdminLoanConfig>('/admin/config/loan', body),

  getVehicleFuelCaps: () =>
    apiGet<AdminVehicleFuelCapsConfig>('/admin/config/vehicle-fuel-caps'),

  setVehicleFuelCaps: (caps: Partial<Record<VehicleType, number>>) =>
    apiPut<AdminVehicleFuelCapsConfig>('/admin/config/vehicle-fuel-caps', { caps }),

  getReferralConfig: () => apiGet<AdminReferralConfig>('/admin/config/referrals'),

  setReferralConfig: (body: {
    bonusLitres?: number
    referencePricePerLitre?: number
    milestoneCount?: number
    debtReductionPercent?: number
  }) => apiPut<AdminReferralConfig>('/admin/config/referrals', body),

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

  notificationMeta: () => apiGet<NotificationMeta>('/admin/notifications/meta'),

  listNotifications: (query: NotificationsQuery = {}) =>
    apiGet<PaginatedResult<AdminNotificationItem>>(
      '/admin/notifications',
      query as Record<string, unknown>,
    ),

  createNotification: (body: CreateNotificationInput) =>
    apiPost<AdminNotificationItem>('/admin/notifications', body),

  uploadNotificationMedia: async (file: File): Promise<NotificationMedia> => {
    const form = new FormData()
    form.append('file', file)
    return apiPostFormData<NotificationMedia>('/admin/notifications/media', form)
  },
}
