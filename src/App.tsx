import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from './store'
import { api } from './lib/api'
import type { Friend, Stats, Tab } from './types'
import { exportAllExcel } from './lib/export'
import { LoginPage } from './pages/LoginPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CalendarPage } from './pages/CalendarPage'
import { Dashboard } from './components/Dashboard'
import { FriendCard } from './components/FriendCard'
import { AddFriendModal } from './components/AddFriendModal'
import { SettingsModal } from './components/SettingsModal'
import { ExportButton } from './components/ExportButton'
import { ReminderBell } from './components/ReminderBell'
import {
  LogOut, UserPlus, CreditCard, Sparkles, Shield, User,
  Search, BarChart3, Calendar as CalendarIcon, Home, Settings,
} from 'lucide-react'

function App() {
  const { user, loading, checkAuth, logout } = useAuthStore()
  const [friends, setFriends] = useState<Friend[]>([])
  const [stats, setStats] = useState<Stats>({
    totalAmount: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalFees: 0,
    totalInterest: 0,
    friendsCount: 0,
    purchasesCount: 0,
  })
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [allPurchases, setAllPurchases] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [friendsRes, statsRes, purchasesRes] = await Promise.all([
        api.getFriends(),
        api.getStats(),
        api.getPurchases(),
      ])
      setFriends(friendsRes.friends)
      setStats(statsRes.stats)
      setAllPurchases(purchasesRes.purchases)
    } catch {
      // Errors are handled by the global error handler (toast)
    } finally {
      setDataLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-lg">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const isAdmin = user.role === 'admin'

  const tabs = [
    { id: 'home' as Tab, label: 'الرئيسية', icon: Home },
    { id: 'analytics' as Tab, label: 'التحليلات', icon: BarChart3 },
    { id: 'calendar' as Tab, label: 'التقويم', icon: CalendarIcon },
  ]

  const handleExportAllExcel = () => {
    exportAllExcel(friends, allPurchases)
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">متتبع التقسيط</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Sparkles className="w-3 h-3 text-primary-400" />
                <span className="text-slate-400 text-xs">تابع مدفوعاتك بسهولة</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-amber-400" />
              ) : (
                <User className="w-4 h-4 text-primary-400" />
              )}
              <span className="text-white text-sm">{user.username}</span>
              {isAdmin && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">مسؤول</span>
              )}
            </div>
            <ReminderBell isAdmin={isAdmin} />
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="الإعدادات"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          {isAdmin && (
            <div className="mr-auto flex gap-2">
              <ExportButton
                onExportPDF={() => {}}
                onExportExcel={handleExportAllExcel}
                label="تصدير الكل"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'home' && (
          <>
            {/* Dashboard Stats */}
            <Dashboard stats={stats} isAdmin={isAdmin} />

            {/* Search Bar */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث عن صديق أو منتج..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">
                {isAdmin ? 'الأصدقاء' : 'مشترياتي'}
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  إضافة صديق
                </button>
              )}
            </div>

            {dataLoading ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-slate-400">جاري تحميل البيانات...</p>
              </div>
            ) : friends.length > 0 ? (
              <div className="grid gap-4">
                {friends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    isAdmin={isAdmin}
                    searchQuery={searchQuery}
                    onUpdate={loadData}
                  />
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-lg mb-4">
                  {isAdmin ? 'لا يوجد أصدقاء بعد' : 'لا توجد مشتريات مسجلة'}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium transition-all hover:from-primary-500 hover:to-primary-400"
                  >
                    <UserPlus className="w-4 h-4" />
                    أضف أول صديق
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && isAdmin && <AnalyticsPage />}
        {activeTab === 'calendar' && <CalendarPage />}

        {/* Footer */}
        <div className="text-center mt-12 text-slate-600 text-sm">
          <p>متتبع التقسيط v2.0 - جميع الحقوق محفوظة 2026</p>
        </div>
      </div>

      {showAddFriend && isAdmin && (
        <AddFriendModal
          onClose={() => setShowAddFriend(false)}
          onAdded={() => {
            setShowAddFriend(false)
            loadData()
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentLimit={stats.creditLimit || 0}
          isAdmin={isAdmin}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

export default App
