import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import type { FriendStat } from '../types'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function AnalyticsPage() {
  const [friendStats, setFriendStats] = useState<FriendStat[]>([])
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [friendRes, monthlyRes] = await Promise.all([
          api.getFriendStats(),
          api.getMonthlyStats(),
        ])
        setFriendStats(friendRes.friendStats)
        setMonthlyStats(monthlyRes.monthlyStats)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400">جاري تحميل التحليلات...</p>
      </div>
    )
  }

  const pieData = friendStats
    .filter((f) => f.total_remaining > 0)
    .map((f) => ({ name: f.name, value: f.total_remaining }))

  const barData = monthlyStats.map((m) => ({
    month: m.month?.substring(5) || '',
    'المتوقع': m.expected,
    'المحصّل': m.collected,
  }))

  const areaData = friendStats.map((f) => ({
    name: f.name,
    'المدفوع': f.total_paid,
    'المتبقي': f.total_remaining,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">التحليلات</h2>

      {/* Pie Chart - Who Owes What */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">توزيع المديونيات</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">لا توجد مديونيات حالياً</p>
        )}
      </div>

      {/* Bar Chart - Monthly Expected vs Collected */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">الدفعات الشهرية المتوقعة</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="المتوقع" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="المحصّل" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">لا توجد بيانات شهرية</p>
        )}
      </div>

      {/* Area Chart - Per Friend Paid vs Remaining */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">المدفوع والمتبقي لكل صديق</h3>
        {areaData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="المدفوع" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Area type="monotone" dataKey="المتبقي" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">لا توجد بيانات</p>
        )}
      </div>

      {/* Friend Stats Table */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">ملخص الأصدقاء</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right text-slate-400 pb-3 px-2">الصديق</th>
                <th className="text-right text-slate-400 pb-3 px-2">المشتريات</th>
                <th className="text-right text-slate-400 pb-3 px-2">الإجمالي</th>
                <th className="text-right text-slate-400 pb-3 px-2">المدفوع</th>
                <th className="text-right text-slate-400 pb-3 px-2">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {friendStats.map((f) => (
                <tr key={f.id} className="border-b border-white/5">
                  <td className="py-3 px-2 text-white font-medium">{f.name}</td>
                  <td className="py-3 px-2 text-slate-300">{f.purchases_count}</td>
                  <td className="py-3 px-2 text-slate-300">{formatCurrency(f.total_amount)}</td>
                  <td className="py-3 px-2 text-emerald-400">{formatCurrency(f.total_paid)}</td>
                  <td className="py-3 px-2 text-amber-400">{formatCurrency(f.total_remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
