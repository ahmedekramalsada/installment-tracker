import { useState } from 'react'
import type { Purchase } from '../types'
import { api } from '../lib/api'
import { X } from 'lucide-react'

interface Props {
  purchase: Purchase
  onClose: () => void
  onUpdated: () => void
}

export function EditPurchaseModal({ purchase, onClose, onUpdated }: Props) {
  const [name, setName] = useState(purchase.name)
  const [totalAmount, setTotalAmount] = useState(purchase.total_amount.toString())
  const [monthlyPayment, setMonthlyPayment] = useState(purchase.monthly_payment.toString())
  const [totalMonths, setTotalMonths] = useState(purchase.total_months.toString())
  const [interestRate, setInterestRate] = useState(
    purchase.interest_rate > 0 ? purchase.interest_rate.toString() : ''
  )
  const [fees, setFees] = useState(purchase.fees > 0 ? purchase.fees.toString() : '')
  const [notes, setNotes] = useState(purchase.notes || '')
  const [monthsPaid, setMonthsPaid] = useState(purchase.months_paid)
  const [lastEdited, setLastEdited] = useState<'total' | 'monthly' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const months = parseInt(totalMonths) || 1
  const rate = parseFloat(interestRate) || 0
  const feeAmt = parseFloat(fees) || 0

  let finalTotal = parseFloat(totalAmount) || 0
  let finalMonthly = parseFloat(monthlyPayment) || 0

  if (lastEdited === 'monthly' && finalMonthly > 0) {
    finalTotal = finalMonthly * months
  } else if (lastEdited === 'total' && finalTotal > 0) {
    finalMonthly = Math.round(finalTotal / months)
  }

  const handleTotalChange = (val: string) => {
    setTotalAmount(val)
    setLastEdited('total')
    const total = parseFloat(val) || 0
    if (total > 0 && months > 0) {
      setMonthlyPayment(Math.round(total / months).toString())
    }
  }

  const handleMonthlyChange = (val: string) => {
    setMonthlyPayment(val)
    setLastEdited('monthly')
    const monthly = parseFloat(val) || 0
    if (monthly > 0 && months > 0) {
      setTotalAmount((monthly * months).toString())
    }
  }

  const handleMonthsChange = (val: string) => {
    setTotalMonths(val)
    const m = parseInt(val) || 1
    if (lastEdited === 'monthly' && finalMonthly > 0) {
      setTotalAmount((finalMonthly * m).toString())
    } else if (finalTotal > 0) {
      setMonthlyPayment(Math.round(finalTotal / m).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.updatePurchase(purchase.id, {
        name,
        total_amount: finalTotal,
        monthly_payment: finalMonthly,
        total_months: months,
        interest_rate: rate,
        fees: feeAmt,
        notes,
      })
      onUpdated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-4 sm:p-6 w-full max-w-md my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold">تعديل المشتريات</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1.5">اسم المنتج</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">عدد الأشهر</label>
            <input
              type="number"
              value={totalMonths}
              onChange={(e) => handleMonthsChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
              required
              min={monthsPaid}
              max="60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">المبلغ الإجمالي (ج.م)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                min="0"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">القسط الشهري (ج.م)</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={(e) => handleMonthlyChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">نسبة الفائدة %</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">الرسوم (ج.م)</label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                min="0"
              />
            </div>
          </div>

          {/* Months Paid Adjustment */}
          <div className="bg-white/5 rounded-xl p-3">
            <label className="block text-slate-400 text-sm mb-2">الأشهر المدفوعة</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMonthsPaid(Math.max(0, monthsPaid - 1))}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xl font-bold transition-colors"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className="text-emerald-400 text-2xl font-bold">{monthsPaid}</span>
                <span className="text-slate-500 text-sm"> / {months}</span>
              </div>
              <button
                type="button"
                onClick={() => setMonthsPaid(Math.min(months, monthsPaid + 1))}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xl font-bold transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-slate-500 text-xs text-center mt-2">
              المدفوع: {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(monthsPaid * finalMonthly)}
            </p>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>

          {finalMonthly > 0 && (
            <div className="bg-primary-500/10 rounded-xl p-4 text-center space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs mb-1">القسط الشهري</p>
                  <p className="text-primary-400 text-xl font-bold">
                    {new Intl.NumberFormat('ar-EG', {
                      style: 'currency',
                      currency: 'EGP',
                      minimumFractionDigits: 0,
                    }).format(finalMonthly)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">إجمالي المبلغ</p>
                  <p className="text-emerald-400 text-xl font-bold">
                    {new Intl.NumberFormat('ar-EG', {
                      style: 'currency',
                      currency: 'EGP',
                      minimumFractionDigits: 0,
                    }).format(finalTotal)}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
