import { useMemo } from 'react'
import { formatCurrency, getProgressPercent } from '../lib/utils'
import type { Stats } from '../types'
import { CreditCard, Users, TrendingUp, CheckCircle, DollarSign, AlertTriangle, Shield } from 'lucide-react'

interface Props {
  stats: Stats
  isAdmin: boolean
}

export function Dashboard({ stats, isAdmin }: Props) {
  const cards = useMemo(() => {
    const base = [
      {
        label: 'إجمالي المبالغ',
        value: formatCurrency(stats.totalAmount),
        icon: CreditCard,
        gradient: 'from-blue-500 to-blue-600',
      },
      {
        label: 'إجمالي المدفوع',
        value: formatCurrency(stats.totalPaid),
        icon: CheckCircle,
        gradient: 'from-emerald-500 to-emerald-600',
      },
      {
        label: 'المتبقي',
        value: formatCurrency(stats.totalRemaining),
        icon: TrendingUp,
        gradient: 'from-amber-500 to-orange-500',
      },
    ]

    if (isAdmin) {
      base.push({
        label: 'الأصدقاء',
        value: stats.friendsCount.toString(),
        icon: Users,
        gradient: 'from-purple-500 to-violet-600',
      })
    }

    if ((stats.overdueCount ?? 0) > 0) {
      base.push({
        label: 'متأخر',
        value: (stats.overdueCount ?? 0).toString(),
        icon: AlertTriangle,
        gradient: 'from-red-500 to-rose-600',
      })
    }

    if (stats.totalFees > 0) {
      base.push({
        label: 'الرسوم',
        value: formatCurrency(stats.totalFees),
        icon: DollarSign,
        gradient: 'from-rose-500 to-red-500',
      })
    }

    return base
  }, [stats, isAdmin])

  const creditPercent = stats.creditLimit
    ? getProgressPercent(stats.creditUsed || 0, stats.creditLimit)
    : 0

  return (
    <div className="space-y-4 mb-8">
      {/* Credit Limit Bar (admin only) */}
      {isAdmin && (stats.creditLimit ?? 0) > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold">حد الائتمان</span>
            </div>
            <span className="text-slate-400 text-sm">
              {formatCurrency(stats.creditUsed || 0)} / {formatCurrency(stats.creditLimit || 0)}
            </span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditPercent > 90
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : creditPercent > 70
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              }`}
              style={{ width: `${Math.min(creditPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-slate-500">{creditPercent}% مستخدم</span>
            <span className="text-emerald-400">
              متاح: {formatCurrency((stats.creditLimit || 0) - (stats.creditUsed || 0))}
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {cards.map((card) => (
          <div
            key={card.label}
            className="glass rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-slate-400 text-sm">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
