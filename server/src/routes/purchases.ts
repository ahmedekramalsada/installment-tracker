import { Router, Response } from 'express'
import db from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

const PURCHASE_WITH_DUE = `
  p.*,
  f.name as friend_name,
  CASE 
    WHEN p.months_paid < p.total_months THEN 
      date(p.start_date, '+' || (p.months_paid + 1) || ' months')
    ELSE NULL 
  END as next_due_date,
  CASE 
    WHEN p.months_paid < p.total_months AND 
         date(p.start_date, '+' || (p.months_paid + 1) || ' months') < date('now')
    THEN 1 ELSE 0 
  END as is_overdue
`

router.use(authMiddleware)

// Get purchases for a friend
router.get('/friend/:friendId', (req: AuthRequest, res: Response) => {
  const friendId = req.params.friendId

  if (req.user!.role !== 'admin') {
    const friend = db.prepare('SELECT * FROM friends WHERE id = ? AND user_id = ?').get(friendId, req.user!.id)
    if (!friend) {
      return res.status(403).json({ error: 'غير مصرح' })
    }
  }

  const purchases = db.prepare(`
    SELECT ${PURCHASE_WITH_DUE}
    FROM purchases p
    JOIN friends f ON p.friend_id = f.id
    WHERE p.friend_id = ?
    ORDER BY p.created_at DESC
  `).all(friendId)
  res.json({ purchases })
})

// Get all purchases (admin) or user's purchases
router.get('/', (req: AuthRequest, res: Response) => {
  if (req.user!.role === 'admin') {
    const purchases = db.prepare(`
      SELECT ${PURCHASE_WITH_DUE}
      FROM purchases p 
      JOIN friends f ON p.friend_id = f.id 
      ORDER BY p.created_at DESC
    `).all()
    res.json({ purchases })
  } else {
    const purchases = db.prepare(`
      SELECT ${PURCHASE_WITH_DUE}
      FROM purchases p 
      JOIN friends f ON p.friend_id = f.id 
      WHERE f.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user!.id)
    res.json({ purchases })
  }
})

// Get single purchase
router.get('/:id', (req: AuthRequest, res: Response) => {
  const purchase = db.prepare(`
    SELECT ${PURCHASE_WITH_DUE}
    FROM purchases p
    JOIN friends f ON p.friend_id = f.id
    WHERE p.id = ?
  `).get(req.params.id) as any
  if (!purchase) return res.status(404).json({ error: 'غير موجود' })

  if (req.user!.role !== 'admin') {
    const friend = db.prepare('SELECT * FROM friends WHERE id = ? AND user_id = ?').get(purchase.friend_id, req.user!.id)
    if (!friend) return res.status(403).json({ error: 'غير مصرح' })
  }

  res.json({ purchase })
})

// Create purchase (admin only)
router.post('/', adminMiddleware, (req: AuthRequest, res: Response) => {
  const { friend_id, name, total_amount, monthly_payment, total_months, interest_rate, fees, start_date, notes } = req.body

  if (!friend_id || !name || !total_amount || !total_months) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' })
  }

  const rate = interest_rate || 0
  const feeAmount = fees || 0
  const totalWithInterest = total_amount * (1 + rate / 100) + feeAmount

  // Use custom monthly payment if provided, otherwise calculate
  const monthlyPayment = monthly_payment || Math.round(totalWithInterest / total_months)

  const result = db.prepare(`
    INSERT INTO purchases (friend_id, name, total_amount, monthly_payment, total_months, months_paid, interest_rate, fees, start_date, notes)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).run(friend_id, name, totalWithInterest, monthlyPayment, total_months, rate, feeAmount, start_date || new Date().toISOString().split('T')[0], notes || '')

  const purchase = db.prepare(`
    SELECT ${PURCHASE_WITH_DUE}
    FROM purchases p
    JOIN friends f ON p.friend_id = f.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid)
  res.json({ purchase })
})

// Update purchase (admin only)
router.put('/:id', adminMiddleware, (req: AuthRequest, res: Response) => {
  const { name, total_amount, monthly_payment, total_months, interest_rate, fees, start_date, notes } = req.body
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id) as any
  if (!purchase) return res.status(404).json({ error: 'غير موجود' })

  const amount = total_amount ?? purchase.total_amount
  const months = total_months ?? purchase.total_months
  const rate = interest_rate ?? purchase.interest_rate
  const feeAmount = fees ?? purchase.fees
  const totalWithInterest = amount * (1 + rate / 100) + feeAmount

  // Use custom monthly payment if provided, otherwise calculate
  const monthlyPayment = monthly_payment || Math.round(totalWithInterest / months)

  db.prepare(`
    UPDATE purchases SET name = ?, total_amount = ?, monthly_payment = ?, total_months = ?, interest_rate = ?, fees = ?, start_date = ?, notes = ?
    WHERE id = ?
  `).run(name || purchase.name, totalWithInterest, monthlyPayment, months, rate, feeAmount, start_date || purchase.start_date, notes ?? purchase.notes, req.params.id)

  const updated = db.prepare(`
    SELECT ${PURCHASE_WITH_DUE}
    FROM purchases p
    JOIN friends f ON p.friend_id = f.id
    WHERE p.id = ?
  `).get(req.params.id)
  res.json({ purchase: updated })
})

// Delete purchase (admin only)
router.delete('/:id', adminMiddleware, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Pay one month (admin only)
router.post('/:id/pay', adminMiddleware, (req: AuthRequest, res: Response) => {
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id) as any
  if (!purchase) return res.status(404).json({ error: 'غير موجود' })
  if (purchase.months_paid >= purchase.total_months) return res.status(400).json({ error: 'تم السداد بالكامل' })

  db.prepare('UPDATE purchases SET months_paid = months_paid + 1 WHERE id = ?').run(req.params.id)
  const updated = db.prepare(`
    SELECT ${PURCHASE_WITH_DUE}
    FROM purchases p
    JOIN friends f ON p.friend_id = f.id
    WHERE p.id = ?
  `).get(req.params.id)
  res.json({ purchase: updated })
})

// Unpay one month (admin only)
router.post('/:id/unpay', adminMiddleware, (req: AuthRequest, res: Response) => {
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id) as any
  if (!purchase) return res.status(404).json({ error: 'غير موجود' })
  if (purchase.months_paid <= 0) return res.status(400).json({ error: 'لا توجد دفعات لإلغائها' })

  db.prepare('UPDATE purchases SET months_paid = months_paid - 1 WHERE id = ?').run(req.params.id)
  const updated = db.prepare(`
    SELECT ${PURCHASE_WITH_DUE}
    FROM purchases p
    JOIN friends f ON p.friend_id = f.id
    WHERE p.id = ?
  `).get(req.params.id)
  res.json({ purchase: updated })
})

export default router
