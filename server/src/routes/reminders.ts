import { Router, Response } from 'express'
import db from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// Get pending reminders - admin sees all, user sees their own
router.get('/pending', (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin'
  const currentMonth = new Date().toISOString().slice(0, 7)

  if (isAdmin) {
    const reminders = db.prepare(`
      SELECT 
        p.id as purchase_id,
        p.friend_id,
        f.name as friend_name,
        f.phone as friend_phone,
        p.name as purchase_name,
        p.monthly_payment,
        p.total_amount,
        p.months_paid,
        p.total_months,
        CASE 
          WHEN p.months_paid < p.total_months THEN 
            date(p.start_date, '+' || (p.months_paid + 1) || ' months')
          ELSE NULL 
        END as next_due_date
      FROM purchases p
      JOIN friends f ON p.friend_id = f.id
      WHERE p.months_paid < p.total_months
        AND f.phone != ''
        AND p.id NOT IN (
          SELECT purchase_id FROM reminders WHERE month_key = ?
        )
      ORDER BY f.name, p.name
    `).all(currentMonth) as any[]

    res.json({ reminders })
  } else {
    // Regular user sees their own active purchases as reminders
    const reminders = db.prepare(`
      SELECT 
        p.id as purchase_id,
        p.friend_id,
        f.name as friend_name,
        f.phone as friend_phone,
        p.name as purchase_name,
        p.monthly_payment,
        p.total_amount,
        p.months_paid,
        p.total_months,
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
      FROM purchases p
      JOIN friends f ON p.friend_id = f.id
      WHERE f.user_id = ?
        AND p.months_paid < p.total_months
      ORDER BY is_overdue DESC, next_due_date ASC
    `).all(req.user!.id) as any[]

    res.json({ reminders })
  }
})

// Mark reminders as sent for current month (admin only)
router.post('/send-all', adminMiddleware, (req: AuthRequest, res: Response) => {
  const { purchase_ids } = req.body as { purchase_ids: number[] }

  if (!purchase_ids || !Array.isArray(purchase_ids) || purchase_ids.length === 0) {
    return res.status(400).json({ error: 'يجب تحديد المشتريات' })
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  const stmt = db.prepare('INSERT OR IGNORE INTO reminders (purchase_id, month_key) VALUES (?, ?)')
  const insertMany = db.transaction((ids: number[]) => {
    for (const id of ids) {
      stmt.run(id, currentMonth)
    }
  })

  insertMany(purchase_ids)

  res.json({ success: true, count: purchase_ids.length })
})

// Get count of pending reminders
router.get('/count', (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin'
  const currentMonth = new Date().toISOString().slice(0, 7)

  if (isAdmin) {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM purchases p
      JOIN friends f ON p.friend_id = f.id
      WHERE p.months_paid < p.total_months
        AND f.phone != ''
        AND p.id NOT IN (
          SELECT purchase_id FROM reminders WHERE month_key = ?
        )
    `).get(currentMonth) as any

    res.json({ count: result.count })
  } else {
    // Regular user sees count of their active purchases
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM purchases p
      JOIN friends f ON p.friend_id = f.id
      WHERE f.user_id = ?
        AND p.months_paid < p.total_months
    `).get(req.user!.id) as any

    res.json({ count: result.count })
  }
})

// Clean old reminders (older than 3 months)
router.post('/cleanup', adminMiddleware, (_req: AuthRequest, res: Response) => {
  db.prepare(`
    DELETE FROM reminders 
    WHERE month_key < strftime('%Y-%m', 'now', '-3 months')
  `).run()
  res.json({ success: true })
})

export default router
