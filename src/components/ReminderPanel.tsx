import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { formatCurrency, generateWhatsAppBulkMessage, generateWhatsAppMessage, getWhatsAppLink, getDaysUntil } from '../lib/utils'
import type { PendingReminder } from '../types'
import { X, MessageCircle, Send, Loader2, AlertTriangle, Clock } from 'lucide-react'

interface Props {
  isAdmin: boolean
  onClose: () => void
  onSent: () => void
}

export function ReminderPanel({ isAdmin, onClose, onSent }: Props) {
  const [reminders, setReminders] = useState<PendingReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { reminders } = await api.getPendingReminders()
        setReminders(reminders)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Group reminders by friend (admin view)
  const groupedByFriend = reminders.reduce(
    (acc, r) => {
      const key = `${r.friend_id}-${r.friend_name}`
      if (!acc[key]) {
        acc[key] = {
          friend_id: r.friend_id,
          friend_name: r.friend_name,
          friend_phone: r.friend_phone,
          reminders: [],
        }
      }
      acc[key].reminders.push(r)
      return acc
    },
    {} as Record<string, { friend_id: number; friend_name: string; friend_phone: string; reminders: PendingReminder[] }>
  )

  const friendGroups = Object.values(groupedByFriend)

  const handleSendAll = async () => {
    setSending(true)

    friendGroups.forEach((group) => {
      const msg = generateWhatsAppBulkMessage(
        group.friend_name,
        group.reminders.map((r) => ({
          id: r.purchase_id,
          friend_id: r.friend_id,
          name: r.purchase_name,
          total_amount: r.total_amount,
          monthly_payment: r.monthly_payment,
          total_months: r.total_months,
          months_paid: r.months_paid,
          interest_rate: 0,
          fees: 0,
          start_date: '',
          notes: '',
          created_at: '',
          next_due_date: r.next_due_date,
          is_overdue: (r as any).is_overdue || false,
        }))
      )

      if (msg && group.friend_phone) {
        window.open(getWhatsAppLink(group.friend_phone, msg), '_blank')
      }
    })

    try {
      await api.markRemindersSent(reminders.map((r) => r.purchase_id))
    } catch {
      // ignore
    }

    setSending(false)
    onSent()
  }

  const handleSendOne = (reminder: PendingReminder) => {
    const remaining = reminder.total_amount - reminder.months_paid * reminder.monthly_payment
    const monthsLeft = reminder.total_months - reminder.months_paid
    const isOverdue = (reminder as any).is_overdue

    const msg = generateWhatsAppMessage(
      reminder.friend_name,
      reminder.purchase_name,
      reminder.monthly_payment,
      remaining,
      monthsLeft,
      reminder.next_due_date || '',
      reminder.total_amount,
      reminder.months_paid,
      reminder.total_months,
      isOverdue
    )

    window.open(getWhatsAppLink(reminder.friend_phone, msg), '_blank')

    api.markRemindersSent([reminder.purchase_id])
      .then(() => {
        setReminders((prev) => {
          const next = prev.filter((r) => r.purchase_id !== reminder.purchase_id)
          if (next.length === 0) onSent()
          return next
        })
      })
      .catch(() => {
        // Error already shown by global handler
      })
  }

  const totalAmount = reminders.reduce((s, r) => s + r.monthly_payment, 0)

  // USER VIEW - Show their own due payments
  if (!isAdmin) {
    const overdueCount = reminders.filter((r: any) => r.is_overdue).length

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 pt-20 px-4"
        onClick={onClose}
      >
        <div
          className="glass rounded-2xl p-5 w-full max-w-md max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              مدفوعاتي المستحقة
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <p className="text-slate-500 text-center py-8">جاري التحميل...</p>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-emerald-400 font-medium mb-1">لا توجد مدفوعات مستحقة</p>
              <p className="text-slate-500 text-sm">جميع مدفوعاتك محدثة</p>
            </div>
          ) : (
            <>
              {overdueCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">
                    لديك {overdueCount} {overdueCount === 1 ? 'دفعة متأخرة' : 'دفعات متأخرة'}
                  </p>
                </div>
              )}

              <div className="space-y-3 mb-4">
                {reminders.map((r) => {
                  const remaining = r.total_amount - r.months_paid * r.monthly_payment
                  const daysUntil = getDaysUntil(r.next_due_date)
                  const isOverdue = (r as any).is_overdue

                  return (
                    <div
                      key={r.purchase_id}
                      className={`rounded-xl p-4 border ${
                        isOverdue
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{r.purchase_name}</h4>
                          <p className="text-slate-400 text-sm">
                            {r.months_paid}/{r.total_months} أشهر
                          </p>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${isOverdue ? 'text-red-400' : 'text-primary-400'}`}>
                            {formatCurrency(r.monthly_payment)}
                          </p>
                          <p className="text-slate-500 text-xs">شهرياً</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-500">
                          المتبقي: {formatCurrency(remaining)}
                        </span>
                        <span className={isOverdue ? 'text-red-400' : daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'}>
                          {isOverdue
                            ? `متأخر ${Math.abs(daysUntil)} يوم`
                            : daysUntil === 0
                              ? 'مستحق اليوم!'
                              : `بعد ${daysUntil} يوم`
                          }
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverdue
                              ? 'bg-gradient-to-r from-red-400 to-red-500'
                              : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          }`}
                          style={{ width: `${Math.round((r.months_paid / r.total_months) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="bg-primary-500/10 rounded-xl p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">إجمالي القسط الشهري</p>
                <p className="text-primary-400 text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ADMIN VIEW - Send reminders to friends
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-5 w-full max-w-md max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            تذكيرات الدفعات
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-8">جاري التحميل...</p>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-emerald-400 font-medium mb-1">لا توجد تذكيرات معلقة</p>
            <p className="text-slate-500 text-sm">جميع التذكيرات تم إرسالها هذا الشهر</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              {friendGroups.map((group) => (
                <div key={group.friend_id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">{group.friend_name}</h4>
                    <span className="text-slate-400 text-xs">{group.friend_phone}</span>
                  </div>
                  <div className="space-y-2">
                    {group.reminders.map((r) => (
                      <div
                        key={r.purchase_id}
                        className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                      >
                        <div>
                          <p className="text-slate-300 text-sm">{r.purchase_name}</p>
                          <p className="text-slate-500 text-xs">
                            {r.months_paid}/{r.total_months} أشهر
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-sm font-medium">
                            {formatCurrency(r.monthly_payment)}
                          </span>
                          <button
                            onClick={() => handleSendOne(r)}
                            className="w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 transition-colors"
                            title="إرسال تذكير"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-primary-500/10 rounded-xl p-3 mb-4 text-center">
              <p className="text-slate-400 text-xs mb-1">إجمالي القسط الشهري المستحق</p>
              <p className="text-primary-400 text-xl font-bold">{formatCurrency(totalAmount)}</p>
              <p className="text-slate-500 text-xs mt-1">
                {reminders.length} تذكير لـ {friendGroups.length} أصدقاء
              </p>
            </div>

            {/* Send All Button */}
            <button
              onClick={handleSendAll}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  إرسال الكل عبر واتساب ({friendGroups.length})
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
