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

export type TransactionStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'cancelled'

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type SettlementStatus = 'pending' | 'paid'
export type UserAccountStatus = 'active' | 'blocked'

export type AdminDashboardData = {
  generatedAt: string
  users: {
    customers: number
    merchants: number
    admins: number
    blocked: number
  }
  loans: {
    pending: number
    active: number
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
  completedCount: number
  completedVolume: number
  byDay: { date: string; count: number; volume: number }[]
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

export type AdminSaleRow = {
  _id: string
  id?: string
  fuelLitres: number
  pricePerLitre: number
  amount: number
  status: TransactionStatus
  merchantCode?: string
  businessName?: string
  stationName?: string
  settlementId?: string
  completedAt?: string
  createdAt: string
}

export type LoanSummary = {
  id: string
  principalAmount: number
  interestAmount: number
  totalAmountDue: number
  amountRepaid: number
  outstandingBalance: number
  fuelBalanceGranted: number
  fuelBalanceUsed: number
  totalLitresPurchased: number
  interestPerLitre: number
  tenureDays: number
  status: LoanStatus
  disbursedAt?: string
  dueDate: string
  rejectReason?: string
  createdAt: string
}

export type AdminLoanListItem = LoanSummary & {
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
  createdAt: string
}

export type Settlement = {
  _id: string
  id?: string
  merchantUserId: string
  merchantCode: string
  settlementDate: string
  grossAmount: number
  transactionCount: number
  status: SettlementStatus
  source: 'auto' | 'manual'
  note?: string
  paidAt?: string
  paymentReference?: string
  createdAt: string
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
}

export type SalesQuery = {
  page?: number
  limit?: number
  merchantCode?: string
  status?: TransactionStatus
  fromDate?: string
  toDate?: string
  settlementStatus?: 'unsettled' | 'settled'
  sortBy?: 'createdAt' | 'amount' | 'completedAt'
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
