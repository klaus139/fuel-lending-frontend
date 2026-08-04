export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedResult<T> = {
  items: T[]
  pagination: PaginationMeta
}

export type UserRole =
  | 'customer'
  | 'merchant'
  | 'merchant_admin'
  | 'merchant_seller'
  | 'admin'

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  isPhoneVerified: boolean
  isEmailVerified: boolean
  isKycVerified: boolean
}

export type AuthTokensResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export type LoanStatus =
  | 'pending'
  | 'active'
  | 'partially_repaid'
  | 'repaid'
  | 'defaulted'
  | 'rejected'

export type LoanCanonicalStatus =
  | 'DRAFT'
  | 'APPLICATION_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REJECTED'
  | 'APPROVED'
  | 'PENDING_DISBURSEMENT'
  | 'DISBURSEMENT_FAILED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'CLOSED_PAID_OFF'
  | 'DEFAULTED'
  | 'WRITTEN_OFF'
  | 'RECOVERED'

export type LoanDpdBucket =
  | 'CURRENT'
  | 'DPD_1_30'
  | 'DPD_31_60'
  | 'DPD_61_90'
  | 'DPD_90_PLUS'

export type LoanStatusHistoryEntry = {
  from: string
  to: string
  at: string
  actorId?: string
  reason?: string
  eventId?: string
}

export type TransactionStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'cancelled'

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type SettlementStatus = 'pending' | 'paid' | 'confirmed'
export type SettlementApprovalStatus = 'none' | 'pending_approval' | 'approved' | 'rejected'
export type MerchantSalesSnapshotStatus = 'open' | 'reconciled' | 'settled'
export type UserAccountStatus = 'active' | 'blocked'

export type AdminDashboardData = {
  generatedAt: string
  users: {
    total: number
    customers: number
    merchants: number
    admins: number
    blocked: number
    newCustomers7d: number
    newCustomers30d: number
  }
  merchantProfiles: {
    total: number
    approved: number
    pending: number
    suspended: number
    rejected: number
    new7d: number
    new30d: number
  }
  /** Outstanding unpaid fuel purchases. */
  purchases: {
    unpaid: number
    partiallyRepaid: number
    overdue: number
    totalOutstanding: number
  }
  settlements: {
    pendingCount: number
    pendingAmount: number
    paidThisMonth: number
  }
  sales: {
    todayCount: number
    todayVolume: number
    todayLitres: number
    last7DaysCount: number
    last7DaysVolume: number
    last7DaysLitres: number
    last30DaysCount: number
    last30DaysVolume: number
    last30DaysLitres: number
    allTimeCount: number
    allTimeVolume: number
    allTimeLitres: number
  }
  /** Platform service-charge revenue (company take). */
  revenue: {
    today: number
    last7Days: number
    last30Days: number
    allTime: number
  }
  transactions: {
    total: number
    completed: number
    pending: number
    failed: number
  }
}

export type AdminFinanceOverview = {
  loans: {
    totalDisbursed: number
    totalRepaid: number
    totalOutstanding: number
    activeCount: number
    overdueCount: number
  }
  settlements: {
    pendingCount: number
    pendingAmount: number
    paidCount: number
    paidAmount: number
  }
}

export type RepaymentRateReport = {
  totalDisbursed: number
  totalRepaid: number
  totalOutstanding: number
  repaymentRatePercent: number
  repaymentTransactionCount: number
}

export type TransactionVolumeReport = {
  totalCount: number
  totalVolume: number
  totalLitres: number
  /** Sum of purchase service charges in the filter window. */
  totalServiceCharge: number
  completedCount: number
  completedVolume: number
  completedLitres: number
  byDay: { date: string; count: number; volume: number; litres: number }[]
}

/** Company revenue = sum of service charges on completed sales. */
export type CompanyRevenueReport = {
  totalRevenue: number
  salesCount: number
  totalLitres: number
  totalFuelAmount: number
  averageRevenuePerSale: number
  fromDate?: string
  toDate?: string
  merchantCode?: string
  byDay: {
    date: string
    revenue: number
    salesCount: number
    litres: number
    fuelAmount: number
  }[]
}

export type AdminUserSummary = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  accountStatus: UserAccountStatus
  isEmailVerified: boolean
  isKycVerified: boolean
  createdAt: string
}

export type LoanBreakdown = {
  creditLimit: number
  amountDisbursed: number
  amountSpent: number
  amountUnspent: number
  amountToPay: number
  litresConsumed: number
  interestAccrued: number
  serviceCharge?: number
  overdueInterest?: number
  totalOwed: number
}

export type LoanSummary = {
  id: string
  principalAmount: number
  interestAmount: number
  serviceChargeAmount?: number
  overdueInterestAmount?: number
  totalAmountDue: number
  amountRepaid: number
  outstandingBalance: number
  fuelBalanceGranted: number
  fuelBalanceUsed: number
  totalLitresPurchased: number
  interestPerLitre: number
  serviceChargePerLitre?: number
  tenureDays: number
  status: LoanStatus
  canonicalStatus?: LoanCanonicalStatus | string
  dpdBucket?: LoanDpdBucket | string
  version?: number
  statusHistory?: LoanStatusHistoryEntry[]
  disbursedAt?: string
  dueDate: string
  rejectReason?: string
  createdAt: string
}

export type AdminLoanListItem = LoanSummary & {
  breakdown: LoanBreakdown
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export type AdminOverdueLoanItem = AdminLoanListItem & {
  daysOverdue: number
}

export type LoanReconMismatch = {
  _id: string
  loanId: string
  projectedOutstanding: number
  ledgerOutstanding: number
  diff: number
  checkedAt: string
  resolvedAt?: string
}

export type TriggerRepaymentResult = {
  loan: LoanSummary
  repaymentId: string | null
  allocation: {
    overdueInterestPortion: number
    serviceChargePortion: number
    principalPortion: number
    interestPortion: number
    totalPayment: number
  } | null
  walletBalance: number
  message: string
}

export type SendLoanReminderResult = {
  sent: true
  email: string
  outstandingBalance: number
  dueDate: string
}

export type AdminTransactionBreakdown = {
  litresConsumed: number
  fuelCost: number
  /** @deprecated use serviceCharge on AdminSaleRow */
  interestAdded: number
  purchaseTotal: number
}

/** Merchant fuel sale row — litres + amounts (not loans). */
export type AdminSaleRow = {
  id: string
  fuelLitres: number
  pricePerLitre: number
  /** Fuel cost only (litres × price/L). */
  amount: number
  serviceCharge: number
  purchaseTotal: number
  status: TransactionStatus
  purchaseType: string
  merchantCode?: string
  businessName?: string
  stationName?: string
  settlementStatus: 'settled' | 'unsettled' | 'n/a'
  settlementId?: string
  customerSnapshot?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  declineReason?: string
  completedAt?: string
  createdAt: string
}

export type AdminSalesSummary = {
  salesCount: number
  totalLitres: number
  totalFuelAmount: number
  totalServiceCharge: number
  totalPurchaseAmount: number
}

export type AdminSalesListResult = PaginatedResult<AdminSaleRow> & {
  summary: AdminSalesSummary
}

export type AdminMerchantSummary = {
  id: string
  userId: string
  merchantId: string
  merchantName: string
  businessName: string
  businessLocation: string
  address: string
  city: string
  stationBranch: string
  lga: string
  state: string
  landmark: string
  status: MerchantStatus
  email: string
  phone: string
  fuelPricePerLitre?: number
  cacNumber?: string
  cacDocumentUrl?: string
  ninVerified?: boolean
  ninFirstNameScore?: number
  ninLastNameScore?: number
  createdAt: string
}

export type Settlement = {
  _id: string
  id?: string
  merchantUserId: string
  merchantCode: string
  settlementDate: string
  grossAmount: number
  totalLitres?: number
  transactionCount: number
  status: SettlementStatus
  approvalStatus?: SettlementApprovalStatus
  source: 'auto' | 'manual'
  note?: string
  paidAt?: string
  paymentReference?: string
  confirmedAt?: string
  createdAt: string
}

export type ReconciliationMerchantRow = {
  merchantProfileId: string
  merchantUserId: string
  merchantCode: string
  businessName: string
  merchantName: string
  openSnapshotCount: number
  reconciledSnapshotCount: number
  latestSalesDate?: string
}

export type ReconciliationSnapshotRow = {
  id: string
  merchantUserId: string
  merchantCode: string
  salesDate: string
  totalAmount: number
  totalLitres: number
  transactionCount: number
  status: MerchantSalesSnapshotStatus
  reconciledAt?: string
  settlementId?: string
}

export type SnapshotTransactionsResult = {
  snapshot: ReconciliationSnapshotRow
  items: AdminSaleRow[]
  pagination: PaginationMeta
}

export type AdminFinanceSettlementRow = Settlement & {
  merchantName: string
  businessName: string
}

export type AdminCreateMerchantInput = {
  merchantName: string
  email: string
  phone: string
  address: string
  city: string
  stationBranch: string
  lga: string
  state: string
  businessName: string
  businessLocation: string
  landmark: string
  nin: string
  /** Optional CAC / RC number */
  cacNumber?: string
}

export type MerchantDetail = AdminMerchantSummary & {
  rejectReason?: string
  fuelPricePerLitre?: number
  reviewedAt?: string
}

export type AdminMerchantBranchSummary = {
  id: string
  name: string
  address: string
  city: string
  lga: string
  state: string
  landmark: string
  status: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export type AdminMerchantSellerSummary = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  branchId: string | null
  branchName: string | null
  accountStatus: string
  createdAt: string
}

export type AdminMerchantSalesSummary = {
  salesCount: number
  grossAmount: number
  fromDate?: string
  toDate?: string
  settlementStatus?: 'unsettled' | 'settled'
  branchId?: string
  sellerId?: string
}

export type AdminMerchantDailySalesRow = {
  date: string
  salesCount: number
  grossAmount: number
}

export type NetworkFuelMerchantRow = {
  merchantUserId: string
  merchantProfileId: string
  merchantCode: string
  businessName: string
  postedPricePerLitre: number | null
  salesCount: number
  totalLitres: number
  totalFuelAmount: number
  averageSoldPricePerLitre: number
}

export type NetworkFuelDayRow = {
  date: string
  salesCount: number
  totalLitres: number
  totalFuelAmount: number
  averageSoldPricePerLitre: number
}

export type NetworkFuelStats = {
  fromDate?: string
  toDate?: string
  postedPrices: {
    merchantsWithPrice: number
    average: number
    min: number
    max: number
  }
  period: {
    salesCount: number
    totalLitres: number
    totalFuelAmount: number
    averageSoldPricePerLitre: number
    merchantCountWithSales: number
  }
  byMerchant: NetworkFuelMerchantRow[]
  byDay: NetworkFuelDayRow[]
}

export type ServiceChargeMode = 'fixed' | 'percent'

export type AdminLoanConfig = {
  serviceChargeMode: ServiceChargeMode
  serviceChargePerLitre: number
  /** @deprecated use serviceChargePerLitre */
  interestPerLitre: number
  serviceChargePercent: number
  overdueDailyInterestPercent: number
  sources: {
    serviceChargeMode: 'database' | 'env'
    serviceChargePerLitre: 'database' | 'env'
    interestPerLitre: 'database' | 'env'
    serviceChargePercent: 'database' | 'env'
    overdueDailyInterestPercent: 'database' | 'env'
  }
}

export type VehicleType = 'bike' | 'car' | 'keke' | 'bus' | 'taxi' | 'trailer'

export type VehicleFuelCaps = Record<VehicleType, number>

export type AdminVehicleFuelCapsConfig = {
  caps: VehicleFuelCaps
  source: 'database' | 'env'
  vehicleTypes: VehicleType[]
}

export type AdminReferralConfig = {
  bonusLitres: number
  referencePricePerLitre: number
  milestoneCount: number
  debtReductionPercent: number
  sources: {
    bonusLitres: 'database' | 'env'
    referencePricePerLitre: 'database' | 'env'
    milestoneCount: 'database' | 'env'
    debtReductionPercent: 'database' | 'env'
  }
}

export type SalesQuery = {
  page?: number
  limit?: number
  merchantCode?: string
  status?: TransactionStatus
  fromDate?: string
  toDate?: string
  settlementStatus?: 'unsettled' | 'settled'
  sortBy?: 'createdAt' | 'amount' | 'completedAt' | 'serviceCharge' | 'fuelLitres'
  sortOrder?: 'asc' | 'desc'
}

export type UsersQuery = {
  page?: number
  limit?: number
  role?: UserRole
  accountStatus?: UserAccountStatus
  search?: string
}

export type LoansQuery = {
  page?: number
  limit?: number
  status?: LoanStatus
}

export type MerchantsQuery = {
  page?: number
  limit?: number
  status?: MerchantStatus
}

export type SettlementsQuery = {
  page?: number
  limit?: number
  status?: SettlementStatus
  merchantUserId?: string
  settlementDate?: string
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type SupportTopic =
  | 'credit_issue'
  | 'fuel_disbursement'
  | 'repayment'
  | 'other'

export type SupportMessage = {
  id: string
  senderRole: 'customer' | 'admin'
  message: string
  createdAt: string
}

export type SupportTicketSummary = {
  id: string
  topic: SupportTopic
  topicLabel: string
  subject: string
  status: SupportTicketStatus
  lastMessage: string
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  messageCount: number
  hasAdminReply: boolean
}

export type SupportTicketDetail = SupportTicketSummary & {
  messages: SupportMessage[]
}

export type SupportTicketsQuery = {
  page?: number
  limit?: number
  status?: SupportTicketStatus
  userId?: string
}

export type AdminPurchaseRating = {
  id: string
  transactionId: string
  userId: string
  customerName: string
  customerEmail: string
  merchantUserId: string
  merchantProfileId?: string
  stationName: string
  stationCode?: string
  rating: number
  review?: string
  createdAt: string
  updatedAt: string
}

export type AdminRatingsStats = {
  total: number
  averageRating: number
  ratingCounts: Record<number, number>
}

export type AdminRatingsListResult = PaginatedResult<AdminPurchaseRating> & {
  stats: AdminRatingsStats
}

export type RatingsQuery = {
  page?: number
  limit?: number
  rating?: number
  minRating?: number
  merchantUserId?: string
  userId?: string
}

export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

export type AdminUserKyc = {
  status: KycStatus
  kycId?: string
  rejectReason?: string | null
  submittedAt?: string
  reviewedAt?: string | null
  verification?: {
    ninVerified: boolean
    ninFirstNameScore?: number
    ninLastNameScore?: number
  }
  photoUrl?: string
  motorPhotoUrl?: string
  motorType?: string
  motorRegistrationNumber?: string
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  lga?: string
}

export type AdminUserCreditRating = {
  decision: string
  creditLimit: number
  approvedPrincipal: number
  evaluatedAt: string
  checks: { code: string; passed: boolean; message: string }[]
}

export type AdminUserTierInfo = {
  currentTier: {
    id: string
    code: string
    name: string
    creditLimit: number
  }
  creditLimit: number
  hasPaymentCard: boolean
}

export type AdminWalletOverview = {
  virtualAccount: {
    accountNumber: string
    bankName: string
    accountName: string
    reference: string
    status: string
    provider: string
    createdAt: string
  } | null
  balance: number
  currency: string
  recentTransactions: {
    id: string
    type: string
    amount: number
    balanceAfter: number
    description?: string
    createdAt: string
  }[]
}

export type AdminKycSubmission = {
  id: string
  userId: string
  status: Exclude<KycStatus, 'not_submitted'>
  dateOfBirth: string
  address: string
  city: string
  state: string
  lga: string
  photoUrl: string
  motorType: string
  motorRegistrationNumber: string
  motorPhotoUrl: string
  verification?: AdminUserKyc['verification']
  rejectReason?: string
  submittedAt: string
  reviewedAt?: string
}

export type AdminVirtualAccount = {
  accountNumber: string
  bankName: string
  accountName: string
  reference: string
  status: string
  provider: string
  createdAt: string
}

export type AdminKycSubmitResult = {
  kycId: string
  status: Exclude<KycStatus, 'not_submitted'>
}

export type AdminKycSubmitInput = {
  nin: string
  dateOfBirth: string
  address: string
  city: string
  state: string
  lga: string
  motorType: 'bike' | 'car' | 'keke'
  motorRegistrationNumber: string
  photo: File
  motorPhoto: File
}

export type AdminUserOutstanding =
  | { hasActiveLoan: false }
  | {
      hasActiveLoan: true
      loanId: string
      principalAmount: number
      interestAmount: number
      totalAmountDue: number
      amountRepaid: number
      outstandingBalance: number
      dueDate: string
      status: LoanStatus
    }

export type AdminUserOverview = {
  profile: AdminUserSummary
  kyc: AdminUserKyc | null
  tier: AdminUserTierInfo | null
  fuelBalance: {
    balance: number
    currency: string
    totalLitresPurchased: number
  }
  wallet: AdminWalletOverview | null
  outstanding: AdminUserOutstanding
  activeLoan: LoanSummary | null
  nextPayment: {
    amount: number
    dueDate: string
    loanId: string
  } | null
  creditRating: AdminUserCreditRating | null
  stats: {
    totalLoans: number
    repaidLoans: number
    completedFuelPurchases: number
  }
}

export type AdminRepaymentRow = {
  id: string
  loanId: string
  userId: string
  amount: number
  interestPortion: number
  overdueInterestPortion?: number
  serviceChargePortion?: number
  principalPortion: number
  source: string
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export type AdminUserTransaction = {
  id: string
  fuelLitres: number
  pricePerLitre: number
  amount: number
  status: TransactionStatus
  merchantSnapshot?: {
    businessName?: string
    stationCode?: string
  }
  completedAt?: string
  createdAt: string
}

export type NotificationCategory = 'broadcast' | 'promo' | 'support' | 'direct' | 'system'
export type NotificationAudience = 'all' | 'all_customers' | 'all_merchants' | 'users'
export type NotificationContentType = 'text' | 'image' | 'video' | 'mixed'
export type NotificationStatus = 'draft' | 'published' | 'archived'

export type NotificationMedia = {
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
  mimeType?: string
}

export type NotificationMeta = {
  categories: { value: NotificationCategory; label: string }[]
  audiences: { value: NotificationAudience }[]
  contentTypes: { value: NotificationContentType }[]
}

export type AdminNotificationItem = {
  id: string
  category: NotificationCategory
  categoryLabel: string
  contentType: NotificationContentType
  title: string
  body: string
  media: NotificationMedia[]
  audience: NotificationAudience
  userIds: string[]
  status: NotificationStatus
  data: Record<string, unknown>
  publishedAt?: string
  expiresAt?: string
  createdAt: string
  createdByAdminId?: string
}

export type CreateNotificationInput = {
  category: NotificationCategory
  title: string
  body: string
  audience: NotificationAudience
  userIds?: string[]
  media?: NotificationMedia[]
  expiresAt?: string
  status?: 'draft' | 'published'
  data?: Record<string, unknown>
}

export type NotificationsQuery = {
  page?: number
  limit?: number
  category?: NotificationCategory
  status?: NotificationStatus
}
