import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { formatCurrency, getDaysUntil } from '../lib/utils'
import type { Purchase } from '../types'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const ARABIC_DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

interface CalendarEvent {
  purchase: Purchase
  date: Date
  status: 'overdue' | 'upcoming' | 'paid'
}

export function CalendarPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { purchases } = await api.getPurchases()
        setPurchases(purchases)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: (number | null)[] = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let i = 1; i <= totalDays; i++) days.push(i)
    return days
  }, [year, month])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}

    purchases.forEach((p) => {
      if (p.months_paid >= p.total_months) return

      for (let m = p.months_paid + 1; m <= p.total_months; m++) {
        const dueDate = new Date(p.start_date)
        dueDate.setMonth(dueDate.getMonth() + m)

        const key = dueDate.toISOString().split('T')[0]
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        let status: 'overdue' | 'upcoming' | 'paid' = 'upcoming'
        if (dueDate < today) status = 'overdue'
        if (m <= p.months_paid) status = 'paid'

        if (!map[key]) map[key] = []
        map[key].push({ purchase: p, date: dueDate, status })
      }
    })

    return map
  }, [purchases])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : []

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400">جاري تحميل التقويم...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        تقويم الدفعات
      </h2>

      <div className="glass rounded-2xl p-5">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <h3 className="text-white font-bold text-lg">
            {ARABIC_MONTHS[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {ARABIC_DAYS.map((day) => (
            <div key={day} className="text-center text-slate-500 text-xs font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="aspect-square" />
            }

            const dateKey = new Date(year, month, day).toISOString().split('T')[0]
            const events = eventsByDate[dateKey] || []
            const isToday = new Date().toISOString().split('T')[0] === dateKey
            const isSelected = selectedDate === dateKey
            const hasOverdue = events.some((e) => e.status === 'overdue')

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? 'bg-primary-500/30 border border-primary-500/50'
                    : isToday
                      ? 'bg-white/10 border border-white/20'
                      : events.length > 0
                        ? 'bg-white/5 hover:bg-white/10'
                        : 'hover:bg-white/5'
                }`}
              >
                <span className={`text-sm ${isToday ? 'text-white font-bold' : 'text-slate-300'}`}>
                  {day}
                </span>
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasOverdue ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                    />
                    {events.length > 1 && (
                      <span className="text-[8px] text-slate-400">+{events.length - 1}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 justify-center text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">قادم</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-400">متأخر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-white/20 bg-white/10" />
            <span className="text-slate-400">اليوم</span>
          </div>
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">
            دفعات يوم {new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div className="space-y-3">
            {selectedEvents.map((event, idx) => {
              const remaining = event.purchase.total_amount - event.purchase.months_paid * event.purchase.monthly_payment
              const days = getDaysUntil(selectedDate)
              return (
                <div
                  key={idx}
                  className={`rounded-xl p-3 border ${
                    event.status === 'overdue'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">{event.purchase.name}</h4>
                      <p className="text-slate-400 text-sm">{event.purchase.friend_name}</p>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${event.status === 'overdue' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(event.purchase.monthly_payment)}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {days > 0 ? `بعد ${days} يوم` : days === 0 ? 'اليوم' : `متأخر ${Math.abs(days)} يوم`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    المتبقي: {formatCurrency(remaining)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
