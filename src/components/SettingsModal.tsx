import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { X, Save, Users, Key, CheckCircle, RefreshCw } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

interface User {
  id: string
  username: string
  role: string
  created_at: string
}

interface Props {
  currentLimit: number
  isAdmin: boolean
  onClose: () => void
  onSaved: () => void
}

export function SettingsModal({ currentLimit, isAdmin, onClose, onSaved }: Props) {
  const [creditLimit, setCreditLimit] = useState(currentLimit.toString())
  const [phone, setPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneSuccess, setPhoneSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'phone' | 'settings' | 'password' | 'users'>('phone')
  const [resettingUser, setResettingUser] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  const handlePhoneChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPhoneLoading(true)
    try {
      await api.updatePhone(phone)
      setPhoneSuccess('تم تحديث رقم الهاتف بنجاح')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPhoneLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
  }, [activeTab])

  const loadUsers = async () => {
    try {
      const res = await api.getUsers()
      setUsers(res.users)
    } catch (err) {
      console.error(err)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleResetUserPassword = async (userId: string) => {
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setResetError('')
    setResetSuccess('')
    try {
      await api.resetUserPassword(parseInt(userId), resetPassword)
      setResetSuccess('تم إعادة تعيين كلمة المرور بنجاح')
      setResetPassword('')
      setResettingUser(null)
    } catch (err: any) {
      setResetError(err.message)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    setPasswordLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setPasswordSuccess('تم تغيير كلمة المرور بنجاح')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.updateSettings({ credit_limit: creditLimit })
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold">الإعدادات</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('phone')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'phone'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            رقم الهاتف
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الإعدادات
            </button>
          )}
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تغيير كلمة المرور
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              المستخدمون
            </button>
          )}
        </div>

        {activeTab === 'phone' && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            {phoneSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 text-emerald-400 text-sm text-center">
                {phoneSuccess}
              </div>
            )}
            <form onSubmit={handlePhoneChange} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium transition-all disabled:opacity-50"
              >
                {phoneLoading ? 'جاري الحفظ...' : 'حفظ رقم الهاتف'}
              </button>
            </form>
          </>
        )}

        {activeTab === 'settings' && isAdmin && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">حد الائتمان (ج.م)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                  required
                  min="0"
                />
                <p className="text-slate-500 text-xs mt-1">
                  الحد الحالي: {formatCurrency(currentLimit)}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {passwordSuccess}
              </div>
            )}
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">كلمة المرور الحالية</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                required
                minLength={6}
              />
              <p className="text-slate-500 text-xs mt-1">6 أحرف على الأقل</p>
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              {passwordLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        )}

        {activeTab === 'users' && isAdmin && (
          <>
            {usersLoading ? (
              <div className="text-center py-8 text-slate-400">جاري تحميل...</div>
            ) : users.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{user.username}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(user.created_at).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </div>
                      {user.role === 'admin' ? (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">مسؤول</span>
                      ) : (
                        <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full">مستخدم</span>
                      )}
                    </div>
                    {user.role !== 'admin' && (
                      <div className="border-t border-white/10 pt-2 mt-2">
                        {resettingUser === user.id ? (
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              placeholder="كلمة مرور جديدة"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm"
                            />
                            <button
                              onClick={() => handleResetUserPassword(user.id)}
                              disabled={passwordLoading}
                              className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm"
                            >
                              حفظ
                            </button>
                            <button
                              onClick={() => { setResettingUser(null); setResetPassword(''); setResetError('') }}
                              className="px-3 py-2 rounded-lg bg-white/5 text-slate-400 text-sm"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setResettingUser(user.id)}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            إعادة تعيين كلمة المرور
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">لا يوجد مستخدمون</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}