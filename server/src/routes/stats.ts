import { Router, Response } from 'express'
import { supabaseAdmin } from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// Safe numeric conversion
function num(val: any): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

router.get('/', async (req: AuthRequest, res: Response) => {
  let totalAmount = 0, totalPaid = 0, totalFees = 0
  let friendsCount = 0, purchasesCount = 0, overdueCount = 0
  let creditLimit = 0

  if (req.user!.role === 'admin') {
    const { count: fCount } = await supabaseAdmin
      .from('friends')
      .select('*', { count: 'exact', head: true })
    friendsCount = fCount || 0

    const { data: purchaseStats, error: statsError } = await supabaseAdmin
      .from('purchases')
      .select('total_amount, months_paid, monthly_payment, fees')

    if (statsError) return res.status(500).json({ error: statsError.message })

    if (purchaseStats && purchaseStats.length > 0) {
      purchasesCount = purchaseStats.length
      totalAmount = purchaseStats.reduce((s, p) => s + num(p.total_amount), 0)
      totalPaid = purchaseStats.reduce((s, p) => s + (num(p.months_paid) * num(p.monthly_payment)), 0)
      totalFees = purchaseStats.reduce((s, p) => s + num(p.fees), 0)
    }

    // Overdue count
    const { data: allPurchases, error: overdueError } = await supabaseAdmin
      .from('purchases')
      .select('months_paid, total_months, start_date')

    if (!overdueError && allPurchases) {
      const today = new Date().toISOString().split('T')[0]
      overdueCount = allPurchases.filter((p: any) => {
        if (num(p.months_paid) >= num(p.total_months)) return false
        const startDate = new Date(p.start_date)
        if (isNaN(startDate.getTime())) return false
        const nextDue = new Date(startDate)
        nextDue.setMonth(nextDue.getMonth() + num(p.months_paid) + 1)
        return nextDue.toISOString().split('T')[0] < today
      }).length
    }

    const { data: creditRow } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'credit_limit')
      .single()

    creditLimit = creditRow ? num(creditRow.value) : 0
  } else {
    const { data: friendIds } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', req.user!.id)

    const friendIdList = friendIds?.map((f: any) => f.id) || []
    if (friendIdList.length > 0) {
      const { data: purchaseStats } = await supabaseAdmin
        .from('purchases')
        .select('total_amount, months_paid, monthly_payment, fees')
        .in('friend_id', friendIdList)

      if (purchaseStats && purchaseStats.length > 0) {
        purchasesCount = purchaseStats.length
        totalAmount = purchaseStats.reduce((s, p) => s + num(p.total_amount), 0)
        totalPaid = purchaseStats.reduce((s, p) => s + (num(p.months_paid) * num(p.monthly_payment)), 0)
        totalFees = purchaseStats.reduce((s, p) => s + num(p.fees), 0)
      }

      const { data: allPurchases } = await supabaseAdmin
        .from('purchases')
        .select('months_paid, total_months, start_date')
        .in('friend_id', friendIdList)

      if (allPurchases) {
        const today = new Date().toISOString().split('T')[0]
        overdueCount = allPurchases.filter((p: any) => {
          if (num(p.months_paid) >= num(p.total_months)) return false
          const startDate = new Date(p.start_date)
          if (isNaN(startDate.getTime())) return false
          const nextDue = new Date(startDate)
          nextDue.setMonth(nextDue.getMonth() + num(p.months_paid) + 1)
          return nextDue.toISOString().split('T')[0] < today
        }).length
      }
    }
  }

  res.json({
    stats: {
      totalAmount,
      totalPaid,
      totalRemaining: totalAmount - totalPaid,
      totalFees,
      totalInterest: 0,
      friendsCount,
      purchasesCount,
      overdueCount,
      creditLimit,
      creditUsed: totalAmount - totalPaid,
    }
  })
})

// Stats per friend (admin only)
router.get('/friends', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  const { data: friends, error: friendsError } = await supabaseAdmin
    .from('friends')
    .select('id, name')

  if (friendsError) return res.status(500).json({ error: friendsError.message })

  const { data: purchases, error: purchasesError } = await supabaseAdmin
    .from('purchases')
    .select('friend_id, total_amount, months_paid, monthly_payment')

  if (purchasesError) return res.status(500).json({ error: purchasesError.message })

  const friendStats = (friends || []).map(f => {
    const fp = purchases?.filter((p: any) => p.friend_id === f.id) || []
    const totalAmount = fp.reduce((s, p) => s + num(p.total_amount), 0)
    const totalPaid = fp.reduce((s, p) => s + (num(p.months_paid) * num(p.monthly_payment)), 0)

    return {
      id: f.id,
      name: f.name,
      purchases_count: fp.length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_remaining: totalAmount - totalPaid,
    }
  }).sort((a, b) => b.total_remaining - a.total_remaining)

  res.json({ friendStats })
})

// Monthly stats for charts (admin only)
router.get('/monthly', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  const { data: purchases, error } = await supabaseAdmin
    .from('purchases')
    .select('monthly_payment, total_months, start_date, months_paid')

  if (error) return res.status(500).json({ error: error.message })

  const monthlyMap = new Map<string, number>()

  for (const p of purchases || []) {
    const startDate = new Date(p.start_date)
    if (isNaN(startDate.getTime())) continue
    const totalMonths = num(p.total_months)
    for (let m = 0; m < totalMonths; m++) {
      const monthDate = new Date(startDate)
      monthDate.setMonth(monthDate.getMonth() + m)
      const monthKey = monthDate.toISOString().slice(0, 7)
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + num(p.monthly_payment))
    }
  }

  const monthlyStats = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, expected]) => ({ month, expected, collected: expected }))

  const totalCollected = (purchases || []).reduce(
    (sum, p) => sum + (num(p.months_paid) * num(p.monthly_payment)), 0
  )

  res.json({ monthlyStats, totalCollected })
})

export default router
