import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import type { Purchase } from '../types'
import { PurchaseCard } from './PurchaseCard'
import { AddPurchaseModal } from './AddPurchaseModal'
import { ExportButton } from './ExportButton'
import { exportFriendPDF } from '../lib/export'
import {
  Plus, Trash2, ChevronDown, User, AlertTriangle, MessageCircle,
} from 'lucide-react'
import {
  formatCurrencyShort, generateWhatsAppBulkMessage, getWhatsAppLink,
} from '../lib/utils'

interface Props {
  friend: { id: number; name: string; phone: string }
  isAdmin: boolean
  searchQuery: string
  onUpdate: () => void
}

export function FriendCard({ friend, isAdmin, searchQuery, onUpdate }: Props) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [expanded, setExpanded] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadPurchases = async () => {
    try {
      const { purchases } = await api.getPurchasesByFriend(friend.id)
      setPurchases(purchases)
    } catch {
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded) loadPurchases()
  }, [expanded, friend.id])

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف ${friend.name}؟`)) return
    await api.deleteFriend(friend.id)
    onUpdate()
  }

  const total = purchases.reduce((s, p) => s + p.total_amount, 0)
  const paid = purchases.reduce((s, p) => s + p.months_paid * p.monthly_payment, 0)
  const remaining = total - paid
  const hasActive = purchases.some((p) => p.months_paid < p.total_months)
  const hasOverdue = purchases.some((p) => p.is_overdue)

  const filteredPurchases = useMemo(() => {
    if (!searchQuery) return purchases
    const q = searchQuery.toLowerCase()
    return purchases.filter((p) => p.name.toLowerCase().includes(q))
  }, [purchases, searchQuery])

  const friendMatchesSearch = !searchQuery ||
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())

  if (searchQuery && !friendMatchesSearch && filteredPurchases.length === 0) {
    return null
  }

  const handleWhatsAppAll = () => {
    const msg = generateWhatsAppBulkMessage(friend.name, purchases)
    if (msg && friend.phone) {
      window.open(getWhatsAppLink(friend.phone, msg), '_blank')
    }
  }

  const handleExportPDF = () => {
    exportFriendPDF(friend.name, purchases)
  }

  return (
    <>
      <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/15 ${
        hasOverdue ? 'border-red-500/30' : ''
      }`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-5 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              hasOverdue
                ? 'bg-gradient-to-br from-red-500 to-red-700'
                : 'bg-gradient-to-br from-primary-500 to-primary-700'
            }`}>
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg">{friend.name}</h3>
                {hasOverdue && (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400">
                  {purchases.length} {purchases.length === 1 ? 'مشتريات' : 'مشتريات'}
                </span>
                {purchases.length > 0 && (
                  <>
                    <span className="text-emerald-400">مدفوع: {formatCurrencyShort(paid)}</span>
                    {remaining > 0 && (
                      <span className="text-amber-400">متبقي: {formatCurrencyShort(remaining)}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasOverdue && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            {hasActive && !hasOverdue && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {expanded && (
          <div className="px-5 pb-5">
            <div className="h-px bg-white/5 mb-4" />
            {loading ? (
              <p className="text-slate-500 text-center py-6">جاري التحميل...</p>
            ) : filteredPurchases.length > 0 ? (
              <div className="grid gap-3">
                {filteredPurchases.map((p) => (
                  <PurchaseCard
                    key={p.id}
                    purchase={p}
                    isAdmin={isAdmin}
                    onUpdate={() => {
                      loadPurchases()
                      onUpdate()
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-6">لا توجد مشتريات بعد</p>
            )}
            <div className="flex gap-2 mt-4">
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 py-2.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مشتريات
                </button>
              )}
              {friend.phone && hasActive && (
                <button
                  onClick={handleWhatsAppAll}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm transition-colors"
                  title="تذكير واتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
              {purchases.length > 0 && (
                <ExportButton
                  onExportPDF={handleExportPDF}
                  onExportExcel={() => {}}
                  label=""
                />
              )}
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                  title="حذف الصديق"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddPurchaseModal
          friendId={friend.id}
          friendName={friend.name}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            loadPurchases()
            onUpdate()
          }}
        />
      )}
    </>
  )
}
