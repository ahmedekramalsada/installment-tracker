import { useState } from 'react'
import type { Purchase } from '../types'
import {
  formatCurrency, getProgressPercent, generateWhatsAppMessage,
  getWhatsAppLink, getDaysUntil,
} from '../lib/utils'
import { api } from '../lib/api'
import {
  Check, Plus, Trash2, Pencil, Percent, DollarSign, MessageCircle, AlertTriangle,
} from 'lucide-react'
import { EditPurchaseModal } from './EditPurchaseModal'

interface Props {
  purchase: Purchase
  isAdmin: boolean
  onUpdate: () => void
}

export function PurchaseCard({ purchase, isAdmin, onUpdate }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const percent = getProgressPercent(purchase.months_paid, purchase.total_months)
  const paid = purchase.months_paid * purchase.monthly_payment
  const remaining = purchase.total_amount - paid
  const isPaid = purchase.months_paid >= purchase.total_months
  const isOverdue = purchase.is_overdue === 1
  const monthsLeft = purchase.total_months - purchase.months_paid
  const daysUntil = getDaysUntil(purchase.next_due_date)

  const handlePay = async () => {
    await api.payMonth(purchase.id)
    onUpdate()
  }

  const handleUnpay = async () => {
    await api.unpayMonth(purchase.id)
    onUpdate()
  }

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه المشتريات؟')) return
    await api.deletePurchase(purchase.id)
    onUpdate()
  }

  const handleWhatsApp = () => {
    const msg = generateWhatsAppMessage(
      purchase.friend_name || '',
      purchase.name,
      purchase.monthly_payment,
      remaining,
      monthsLeft,
      purchase.next_due_date || '',
      purchase.total_amount,
      purchase.months_paid,
      purchase.total_months,
      isOverdue
    )
    window.open(getWhatsAppLink('', msg), '_blank')
  }

  return (
    <>
      <div
        className={`rounded-xl p-4 transition-all duration-300 ${
          isPaid
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : isOverdue
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-white/5 border border-white/5'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold text-base">{purchase.name}</h4>
              {isOverdue && <AlertTriangle className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-slate-400 text-sm">
              {formatCurrency(purchase.total_amount)} إجمالي
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <button
                onClick={() => setShowEdit(true)}
                className="w-7 h-7 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 transition-colors"
                title="تعديل"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {!isPaid && (
                <button
                  onClick={handlePay}
                  className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 transition-colors"
                  title="تسجيل دفعة"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {purchase.months_paid > 0 && !isPaid && (
                <button
                  onClick={handleUnpay}
                  className="w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center text-amber-400 transition-colors"
                  title="إلغاء دفعة"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleWhatsApp}
                className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 transition-colors"
                title="تذكير واتساب"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className={`grid gap-3 mb-3 text-center ${purchase.interest_rate > 0 || purchase.fees > 0 ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <div>
            <p className="text-slate-500 text-xs mb-1">القسط الشهري</p>
            <p className="text-white font-medium text-sm">{formatCurrency(purchase.monthly_payment)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">المدفوع</p>
            <p className="text-emerald-400 font-medium text-sm">{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">المتبقي</p>
            <p className="text-amber-400 font-medium text-sm">{formatCurrency(remaining)}</p>
          </div>
          {purchase.interest_rate > 0 && (
            <div>
              <p className="text-slate-500 text-xs mb-1 flex items-center justify-center gap-1">
                <Percent className="w-3 h-3" /> الفائدة
              </p>
              <p className="text-purple-400 font-medium text-sm">{purchase.interest_rate}%</p>
            </div>
          )}
          {purchase.fees > 0 && (
            <div>
              <p className="text-slate-500 text-xs mb-1 flex items-center justify-center gap-1">
                <DollarSign className="w-3 h-3" /> الرسوم
              </p>
              <p className="text-rose-400 font-medium text-sm">{formatCurrency(purchase.fees)}</p>
            </div>
          )}
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">
              {purchase.months_paid} / {purchase.total_months} أشهر
            </span>
            <span className={isPaid ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-slate-400'}>
              {percent}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPaid
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : isOverdue
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : percent > 50
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Due date info */}
        {!isPaid && purchase.next_due_date && (
          <div className={`text-xs text-center mt-2 ${
            isOverdue ? 'text-red-400' : daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'
          }`}>
            {isOverdue
              ? `متأخر ${Math.abs(daysUntil)} يوم - الموعد: ${purchase.next_due_date}`
              : daysUntil === 0
                ? 'الدفعة مستحقة اليوم!'
                : `الدفعة القادمة: ${purchase.next_due_date} (بعد ${daysUntil} يوم)`
            }
          </div>
        )}

        {isPaid && (
          <p className="text-emerald-400 text-xs text-center mt-2 font-medium">تم السداد بالكامل</p>
        )}

        {purchase.notes && (
          <p className="text-slate-500 text-xs mt-2 text-center">{purchase.notes}</p>
        )}
      </div>

      {showEdit && (
        <EditPurchaseModal
          purchase={purchase}
          onClose={() => setShowEdit(false)}
          onUpdated={() => {
            setShowEdit(false)
            onUpdate()
          }}
        />
      )}
    </>
  )
}
