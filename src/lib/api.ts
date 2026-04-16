const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

// Global error handler — can be overridden by the toast system
let globalErrorHandler: ((message: string) => void) | null = null

export function setGlobalErrorHandler(handler: (message: string) => void) {
  globalErrorHandler = handler
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل في الاتصال بالخادم'
    if (globalErrorHandler) globalErrorHandler(message)
    throw new Error(message)
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    const message = data.error || 'حدث خطأ غير متوقع'
    if (globalErrorHandler) globalErrorHandler(message)
    throw new Error(message)
  }

  return data
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ user: any }>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getUsers: () => request<{ users: any[] }>('/auth/users'),

  resetUserPassword: (userId: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId, newPassword }),
    }),

  // Friends
  getFriends: () => request<{ friends: any[] }>('/friends'),

  createFriend: (data: { name: string; phone?: string; username?: string; password?: string }) =>
    request<{ friend: any }>('/friends', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFriend: (id: number, data: { name?: string; phone?: string }) =>
    request<{ friend: any }>(`/friends/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFriend: (id: number) =>
    request<{ success: boolean }>(`/friends/${id}`, { method: 'DELETE' }),

  // Purchases
  getPurchases: () => request<{ purchases: any[] }>('/purchases'),

  getPurchasesByFriend: (friendId: number) =>
    request<{ purchases: any[] }>(`/purchases/friend/${friendId}`),

  createPurchase: (data: {
    friend_id: number
    name: string
    total_amount: number
    monthly_payment?: number
    total_months: number
    interest_rate?: number
    fees?: number
    start_date?: string
    notes?: string
  }) =>
    request<{ purchase: any }>('/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePurchase: (id: number, data: any) =>
    request<{ purchase: any }>(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePurchase: (id: number) =>
    request<{ success: boolean }>(`/purchases/${id}`, { method: 'DELETE' }),

  payMonth: (id: number) =>
    request<{ purchase: any }>(`/purchases/${id}/pay`, { method: 'POST' }),

  unpayMonth: (id: number) =>
    request<{ purchase: any }>(`/purchases/${id}/unpay`, { method: 'POST' }),

  getPaymentHistory: (id: number) =>
    request<{ payments: any[] }>(`/purchases/${id}/payments`, { method: 'GET' }),

  // Stats
  getStats: () => request<{ stats: any }>('/stats'),

  getFriendStats: () => request<{ friendStats: any[] }>('/stats/friends'),

  getMonthlyStats: () => request<{ monthlyStats: any[]; totalCollected: number }>('/stats/monthly'),

  // Settings
  getSettings: () => request<{ settings: Record<string, string> }>('/settings'),

  updateSettings: (data: Record<string, string>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Reminders
  getPendingReminders: () =>
    request<{ reminders: any[] }>('/reminders/pending'),

  getRemindersCount: () =>
    request<{ count: number }>('/reminders/count'),

  markRemindersSent: (purchaseIds: number[]) =>
    request<{ success: boolean; count: number }>('/reminders/send-all', {
      method: 'POST',
      body: JSON.stringify({ purchase_ids: purchaseIds }),
    }),
}
