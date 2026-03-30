import { useState } from 'react'
import { api } from '../lib/api'
import { X } from 'lucide-react'

interface Props {
  friendId: number
  friendName: string
  onClose: () => void
  onAdded: () => void
}

export function AddPurchaseModal({ friendId, friendName, onClose, onAdded }: Props) {
  const [name, setName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [totalMonths, setTotalMonths] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [fees, setFees] = useState('')
  const [notes, setNotes] = useState('')
  const [lastEdited, setLastEdited] = useState<'total' | 'monthly' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const months = parseInt(totalMonths) || 1
  const rate = parseFloat(interestRate) || 0
  const feeAmt = parseFloat(fees) || 0

  // Auto-calculate based on what was last edited
  let finalTotal = parseFloat(totalAmount) || 0
  let finalMonthly = parseFloat(monthlyPayment) || 0

  if (lastEdited === 'monthly' && finalMonthly > 0) {
    // User typed monthly → calculate total
    finalTotal = finalMonthly * months
  } else if (lastEdited === 'total' && finalTotal > 0) {
    // User typed total → calculate monthly
    finalMonthly = Math.round(finalTotal / months)
  } else if (finalMonthly > 0 && finalTotal === 0) {
    finalTotal = finalMonthly * months
  } else if (finalTotal > 0 && finalMonthly === 0) {
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
      await api.createPurchase({
        friend_id: friendId,
        name,
        total_amount: finalTotal,
        monthly_payment: finalMonthly,
        total_months: months,
        interest_rate: rate,
        fees: feeAmt,
        notes,
      })
      onAdded()
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
        className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold">إضافة مشتريات لـ {friendName}</h3>
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
              placeholder="مثال: آيفون 16"
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
              placeholder="12"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
              required
              min="1"
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
                placeholder="60000"
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
                placeholder="5000"
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
                placeholder="0"
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
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات..."
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
              <p className="text-slate-500 text-xs">
                {months} أشهر {rate > 0 && <span>+ {rate}% فائدة</span>} {feeAmt > 0 && <span>+ رسوم</span>}
              </p>
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
              disabled={loading || (finalTotal <= 0 && finalMonthly <= 0)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'جاري الإضافة...' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
