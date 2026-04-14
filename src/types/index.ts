export interface User {
  id: string
  username: string
  role: 'admin' | 'user'
}

export interface Friend {
  id: number
  user_id: string | null
  name: string
  phone: string
  created_at: string
}

export interface Purchase {
  id: number
  friend_id: number
  friend_name?: string
  name: string
  total_amount: number
  monthly_payment: number
  total_months: number
  months_paid: number
  interest_rate: number
  fees: number
  start_date: string
  notes: string
  created_at: string
  next_due_date?: string | null
  is_overdue?: boolean
}

export interface Stats {
  totalAmount: number
  totalPaid: number
  totalRemaining: number
  totalFees: number
  totalInterest: number
  friendsCount: number
  purchasesCount: number
  overdueCount?: number
  creditLimit?: number
  creditUsed?: number
}

export interface FriendStat {
  id: number
  name: string
  purchases_count: number
  total_amount: number
  total_paid: number
  total_remaining: number
}

export interface MonthlyStat {
  month: string
  expected: number
  collected: number
}

export type Tab = 'home' | 'analytics' | 'calendar'

export interface PendingReminder {
  purchase_id: number
  friend_id: number
  friend_name: string
  friend_phone: string
  purchase_name: string
  monthly_payment: number
  total_amount: number
  months_paid: number
  total_months: number
  next_due_date: string | null
  is_overdue?: boolean
}

export interface PaymentHistory {
  id: number
  purchase_id: number
  amount: number
  payment_date: string
  notes: string
  created_by?: string
  profiles?: { username: string }
}

export interface AuditLog {
  id: number
  table_name: string
  record_id: number | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changed_by: string | null
  changed_at: string
}
