import { Router, Response } from 'express'
import db from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', (req: AuthRequest, res: Response) => {
  let totalAmount = 0, totalPaid = 0, totalRemaining = 0, totalFees = 0, totalInterest = 0
  let friendsCount = 0, purchasesCount = 0, overdueCount = 0
  let creditLimit = 0, creditUsed = 0

  if (req.user!.role === 'admin') {
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM friends) as friends_count,
        COUNT(p.id) as purchases_count,
        COALESCE(SUM(p.total_amount), 0) as total_amount,
        COALESCE(SUM(p.months_paid * p.monthly_payment), 0) as total_paid,
        COALESCE(SUM(p.fees), 0) as total_fees
      FROM purchases p
    `).get() as any

    const overdue = db.prepare(`
      SELECT COUNT(*) as overdue_count
      FROM purchases p
      WHERE p.months_paid < p.total_months 
        AND date(p.start_date, '+' || (p.months_paid + 1) || ' months') < date('now')
    `).get() as any

    const creditLimitRow = db.prepare("SELECT value FROM settings WHERE key = 'credit_limit'").get() as any

    friendsCount = stats.friends_count
    purchasesCount = stats.purchases_count
    totalAmount = stats.total_amount
    totalPaid = stats.total_paid
    totalFees = stats.total_fees
    totalRemaining = totalAmount - totalPaid
    overdueCount = overdue.overdue_count
    creditLimit = creditLimitRow ? parseFloat(creditLimitRow.value) : 0
    creditUsed = totalAmount - totalPaid
  } else {
    const stats = db.prepare(`
      SELECT 
        COUNT(p.id) as purchases_count,
        COALESCE(SUM(p.total_amount), 0) as total_amount,
        COALESCE(SUM(p.months_paid * p.monthly_payment), 0) as total_paid,
        COALESCE(SUM(p.fees), 0) as total_fees
      FROM purchases p
      JOIN friends f ON p.friend_id = f.id
      WHERE f.user_id = ?
    `).get(req.user!.id) as any

    const overdue = db.prepare(`
      SELECT COUNT(*) as overdue_count
      FROM purchases p
      JOIN friends f ON p.friend_id = f.id
      WHERE f.user_id = ?
        AND p.months_paid < p.total_months 
        AND date(p.start_date, '+' || (p.months_paid + 1) || ' months') < date('now')
    `).get(req.user!.id) as any

    purchasesCount = stats.purchases_count
    totalAmount = stats.total_amount
    totalPaid = stats.total_paid
    totalFees = stats.total_fees
    totalRemaining = totalAmount - totalPaid
    overdueCount = overdue.overdue_count
  }

  res.json({
    stats: {
      totalAmount,
      totalPaid,
      totalRemaining,
      totalFees,
      totalInterest,
      friendsCount,
      purchasesCount,
      overdueCount,
      creditLimit,
      creditUsed,
    }
  })
})

// Stats per friend (admin only)
router.get('/friends', (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح' })
  }

  const friendStats = db.prepare(`
    SELECT 
      f.id,
      f.name,
      COUNT(p.id) as purchases_count,
      COALESCE(SUM(p.total_amount), 0) as total_amount,
      COALESCE(SUM(p.months_paid * p.monthly_payment), 0) as total_paid,
      COALESCE(SUM(p.total_amount - (p.months_paid * p.monthly_payment)), 0) as total_remaining
    FROM friends f
    LEFT JOIN purchases p ON p.friend_id = f.id
    GROUP BY f.id
    ORDER BY total_remaining DESC
  `).all()

  res.json({ friendStats })
})

// Monthly stats for charts (admin only)
router.get('/monthly', (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح' })
  }

  const monthlyStats = db.prepare(`
    SELECT 
      month,
      SUM(monthly_payment) as expected,
      SUM(monthly_payment) as collected
    FROM (
      SELECT 
        p.monthly_payment,
        date(p.start_date, '+' || m.month_offset || ' months') as month
      FROM purchases p
      CROSS JOIN (
        SELECT 0 as month_offset UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 
        UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 
        UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
      ) m
      WHERE m.month_offset < p.total_months
    )
    GROUP BY month
    ORDER BY month
  `).all() as any[]

  const cumulativePaid = db.prepare(`
    SELECT COALESCE(SUM(months_paid * monthly_payment), 0) as total_paid FROM purchases
  `).get() as any

  res.json({
    monthlyStats,
    totalCollected: cumulativePaid.total_paid,
  })
})

export default router
