import { Router, Response } from 'express'
import { supabaseAdmin } from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// Helper: extract single friend object from Supabase nested select
function getFriend(p: any): { name: string; phone: string } {
  const f = p.friends
  return Array.isArray(f) ? (f[0] || { name: '', phone: '' }) : (f || { name: '', phone: '' })
}

// Get pending reminders
router.get('/pending', async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin'
  const currentMonth = new Date().toISOString().slice(0, 7)
  const today = new Date().toISOString().split('T')[0]

  if (isAdmin) {
    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select('id, friend_id, name, monthly_payment, total_amount, months_paid, total_months, start_date, friends!inner(name, phone)')
      .lt('months_paid', 'total_months')
      .neq('friends.phone', '')
      .order('friends.name')

    if (error) return res.status(500).json({ error: error.message })

    const { data: reminded } = await supabaseAdmin
      .from('reminders')
      .select('purchase_id')
      .eq('month_key', currentMonth)

    const remindedIds = new Set(reminded?.map((r: any) => r.purchase_id) || [])

    const reminders = (purchases || [])
      .filter((p: any) => !remindedIds.has(p.id))
      .map((p: any) => {
        const friend = getFriend(p)
        const startDate = new Date(p.start_date)
        const nextDue = new Date(startDate)
        nextDue.setMonth(nextDue.getMonth() + p.months_paid + 1)
        return {
          purchase_id: p.id,
          friend_id: p.friend_id,
          friend_name: friend.name,
          friend_phone: friend.phone,
          purchase_name: p.name,
          monthly_payment: p.monthly_payment,
          total_amount: p.total_amount,
          months_paid: p.months_paid,
          total_months: p.total_months,
          next_due_date: nextDue.toISOString().split('T')[0],
        }
      })

    res.json({ reminders })
  } else {
    const { data: friendIds } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', req.user!.id)

    const friendIdList = friendIds?.map((f: any) => f.id) || []
    if (friendIdList.length === 0) return res.json({ reminders: [] })

    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select('id, friend_id, name, monthly_payment, total_amount, months_paid, total_months, start_date, friends!inner(name, phone)')
      .in('friend_id', friendIdList)
      .lt('months_paid', 'total_months')
      .order('start_date')

    if (error) return res.status(500).json({ error: error.message })

    const reminders = (purchases || []).map((p: any) => {
      const friend = getFriend(p)
      const startDate = new Date(p.start_date)
      const nextDue = new Date(startDate)
      nextDue.setMonth(nextDue.getMonth() + p.months_paid + 1)
      const nextDueStr = nextDue.toISOString().split('T')[0]
      const isOverdue = nextDueStr < today

      return {
        purchase_id: p.id,
        friend_id: p.friend_id,
        friend_name: friend.name,
        friend_phone: friend.phone,
        purchase_name: p.name,
        monthly_payment: p.monthly_payment,
        total_amount: p.total_amount,
        months_paid: p.months_paid,
        total_months: p.total_months,
        next_due_date: nextDueStr,
        is_overdue: isOverdue,
      }
    }).sort((a: any, b: any) => {
      if (a.is_overdue !== b.is_overdue) return (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0)
      return a.next_due_date.localeCompare(b.next_due_date)
    })

    res.json({ reminders })
  }
})

// Mark reminders as sent for current month (admin only)
router.post('/send-all', adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { purchase_ids } = req.body as { purchase_ids: number[] }

  if (!purchase_ids || !Array.isArray(purchase_ids) || purchase_ids.length === 0) {
    return res.status(400).json({ error: 'يجب تحديد المشتريات' })
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  let successCount = 0

  for (const id of purchase_ids) {
    const { error } = await supabaseAdmin
      .from('reminders')
      .upsert({ purchase_id: id, month_key: currentMonth })
    if (!error) successCount++
  }

  res.json({ success: true, count: successCount })
})

// Get count of pending reminders
router.get('/count', async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin'
  const currentMonth = new Date().toISOString().slice(0, 7)

  if (isAdmin) {
    const { data: purchases } = await supabaseAdmin
      .from('purchases')
      .select('id, friends!inner(phone)')
      .lt('months_paid', 'total_months')
      .neq('friends.phone', '')

    const { data: reminded } = await supabaseAdmin
      .from('reminders')
      .select('purchase_id')
      .eq('month_key', currentMonth)

    const remindedIds = new Set(reminded?.map((r: any) => r.purchase_id) || [])
    const count = (purchases || []).filter((p: any) => !remindedIds.has(p.id)).length
    res.json({ count })
  } else {
    const { data: friendIds } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', req.user!.id)

    const friendIdList = friendIds?.map((f: any) => f.id) || []
    if (friendIdList.length === 0) return res.json({ count: 0 })

    const { count, error } = await supabaseAdmin
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .in('friend_id', friendIdList)
      .lt('months_paid', 'total_months')

    if (error) return res.status(500).json({ error: error.message })
    res.json({ count: count || 0 })
  }
})

// Clean old reminders
router.post('/cleanup', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const cutoffKey = threeMonthsAgo.toISOString().slice(0, 7)

  const { error } = await supabaseAdmin
    .from('reminders')
    .delete()
    .lt('month_key', cutoffKey)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
