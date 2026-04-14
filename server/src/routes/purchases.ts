import { Router, Response } from 'express'
import { supabaseAdmin } from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)

// ── Zod Schemas ──
const createPurchaseSchema = z.object({
  friend_id: z.number().positive('معرف الصديق مطلوب'),
  name: z.string().min(1, 'الاسم مطلوب'),
  total_amount: z.number().positive('المبلغ مطلوب'),
  total_months: z.number().int().positive('عدد الأشهر مطلوب'),
  monthly_payment: z.number().positive().optional(),
  interest_rate: z.number().min(0).optional(),
  fees: z.number().min(0).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
})

const updatePurchaseSchema = z.object({
  name: z.string().min(1).optional(),
  total_amount: z.number().positive().optional(),
  total_months: z.number().int().positive().optional(),
  monthly_payment: z.number().positive().optional(),
  interest_rate: z.number().min(0).optional(),
  fees: z.number().min(0).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
})

/**
 * Compute next_due_date and is_overdue in JS
 */
function enrichPurchase(purchase: any) {
  if (purchase.months_paid < purchase.total_months) {
    const startDate = new Date(purchase.start_date)
    const nextDue = new Date(startDate)
    nextDue.setMonth(nextDue.getMonth() + purchase.months_paid + 1)
    purchase.next_due_date = nextDue.toISOString().split('T')[0]
    purchase.is_overdue = nextDue < new Date(new Date().toISOString().split('T')[0])
  } else {
    purchase.next_due_date = null
    purchase.is_overdue = false
  }
  return purchase
}

function getFriendName(p: any): string {
  const f = p.friends
  return Array.isArray(f) ? (f[0]?.name ?? '') : (f?.name ?? '')
}

/**
 * Validate ID parameter — must be a valid UUID
 */
function validateId(id: string): string | null {
  // Supabase UUIDs are standard UUIDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id
  }
  return null
}

// ── Routes ──

// Get all purchases (admin) or user's purchases
router.get('/', async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin
    .from('purchases')
    .select('*, friends!inner(name)')
    .order('created_at', { ascending: false })

  if (req.user!.role !== 'admin') {
    query = query.eq('friends.user_id', req.user!.id)
  }

  const { data: purchases, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const enriched = (purchases || []).map(p => enrichPurchase({ ...p, friend_name: getFriendName(p) }))
  res.json({ purchases: enriched })
})

// Get purchases for a specific friend
router.get('/friend/:friendId', async (req: AuthRequest, res: Response) => {
  const friendId = parseInt(String(req.params.friendId))
  if (isNaN(friendId)) return res.status(400).json({ error: 'معرف غير صالح' })

  if (req.user!.role !== 'admin') {
    const { data: friend } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('id', friendId)
      .eq('user_id', req.user!.id)
      .single()
    if (!friend) return res.status(403).json({ error: 'غير مصرح' })
  }

  const { data: purchases, error } = await supabaseAdmin
    .from('purchases')
    .select('*, friends!inner(name)')
    .eq('friend_id', friendId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  const enriched = (purchases || []).map(p => enrichPurchase({ ...p, friend_name: getFriendName(p) }))
  res.json({ purchases: enriched })
})

// Get single purchase
router.get('/:id', async (req: AuthRequest, res: Response) => {
  if (!validateId(String(req.params.id))) return res.status(400).json({ error: 'معرف غير صالح' })

  const { data: purchase, error } = await supabaseAdmin
    .from('purchases')
    .select('*, friends!inner(name)')
    .eq('id', req.params.id)
    .single()

  if (error || !purchase) return res.status(404).json({ error: 'غير موجود' })

  if (req.user!.role !== 'admin') {
    const { data: friend } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('id', purchase.friend_id)
      .eq('user_id', req.user!.id)
      .single()
    if (!friend) return res.status(403).json({ error: 'غير مصرح' })
  }

  res.json({ purchase: enrichPurchase(purchase) })
})

// Create purchase (admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  const parseResult = createPurchaseSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'بيانات غير صالحة' })
  }

  const { friend_id, name, total_amount, total_months, monthly_payment, interest_rate, fees, start_date, notes } = parseResult.data
  const rate = interest_rate || 0
  const feeAmount = fees || 0
  const totalWithInterest = total_amount * (1 + rate / 100) + feeAmount
  const monthlyPayment = monthly_payment || Math.round(totalWithInterest / total_months)

  const { data: purchase, error } = await supabaseAdmin
    .from('purchases')
    .insert({
      friend_id, name,
      total_amount: totalWithInterest,
      monthly_payment: monthlyPayment,
      total_months, months_paid: 0,
      interest_rate: rate, fees: feeAmount,
      start_date: start_date || new Date().toISOString().split('T')[0],
      notes: notes || '',
    })
    .select('*, friends!inner(name)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ purchase: enrichPurchase(purchase) })
})

// Update purchase (admin only) — now with Zod validation
router.put('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  if (!validateId(String(req.params.id))) return res.status(400).json({ error: 'معرف غير صالح' })

  const parseResult = updatePurchaseSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'بيانات غير صالحة' })
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (fetchError || !existing) return res.status(404).json({ error: 'غير موجود' })

  const amount = parseResult.data.total_amount ?? existing.total_amount
  const months = parseResult.data.total_months ?? existing.total_months
  const rate = parseResult.data.interest_rate ?? existing.interest_rate
  const feeAmount = parseResult.data.fees ?? existing.fees
  const totalWithInterest = amount * (1 + rate / 100) + feeAmount
  const monthlyPayment = parseResult.data.monthly_payment || Math.round(totalWithInterest / months)

  const { data: purchase, error } = await supabaseAdmin
    .from('purchases')
    .update({
      name: parseResult.data.name ?? existing.name,
      total_amount: totalWithInterest,
      monthly_payment: monthlyPayment,
      total_months: months,
      interest_rate: rate,
      fees: feeAmount,
      start_date: parseResult.data.start_date ?? existing.start_date,
      notes: parseResult.data.notes ?? existing.notes,
    })
    .eq('id', req.params.id)
    .select('*, friends!inner(name)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ purchase: enrichPurchase(purchase) })
})

// Delete purchase (admin only)
router.delete('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  if (!validateId(String(req.params.id))) return res.status(400).json({ error: 'معرف غير صالح' })

  const { error } = await supabaseAdmin.from('purchases').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// Pay one month (admin only) — with error handling for payment_history
router.post('/:id/pay', adminMiddleware, async (req: AuthRequest, res: Response) => {
  if (!validateId(String(req.params.id))) return res.status(400).json({ error: 'معرف غير صالح' })

  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (fetchError || !purchase) return res.status(404).json({ error: 'غير موجود' })
  if (purchase.months_paid >= purchase.total_months) {
    return res.status(400).json({ error: 'تم السداد بالكامل' })
  }

  // Update months_paid
  const { error: updateError } = await supabaseAdmin
    .from('purchases')
    .update({ months_paid: purchase.months_paid + 1 })
    .eq('id', req.params.id)

  if (updateError) return res.status(500).json({ error: updateError.message })

  // Record in payment_history — if this fails, log but don't fail the payment
  const { error: historyError } = await supabaseAdmin
    .from('payment_history')
    .insert({
      purchase_id: purchase.id,
      amount: purchase.monthly_payment,
      notes: `شهر ${purchase.months_paid + 1} من ${purchase.total_months}`,
      created_by: req.user!.id,
    })

  if (historyError) {
    console.error('⚠️ Failed to record payment history:', historyError.message)
  }

  const { data: updated, error } = await supabaseAdmin
    .from('purchases')
    .select('*, friends!inner(name)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ purchase: enrichPurchase(updated) })
})

// Unpay one month (admin only) — with error handling for payment_history
router.post('/:id/unpay', adminMiddleware, async (req: AuthRequest, res: Response) => {
  if (!validateId(String(req.params.id))) return res.status(400).json({ error: 'معرف غير صالح' })

  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (fetchError || !purchase) return res.status(404).json({ error: 'غير موجود' })
  if (purchase.months_paid <= 0) {
    return res.status(400).json({ error: 'لا توجد دفعات لإلغائها' })
  }

  const { error: updateError } = await supabaseAdmin
    .from('purchases')
    .update({ months_paid: purchase.months_paid - 1 })
    .eq('id', req.params.id)

  if (updateError) return res.status(500).json({ error: updateError.message })

  // Remove latest payment_history entry — if fails, log but don't fail
  const { error: historyError } = await supabaseAdmin
    .from('payment_history')
    .delete()
    .eq('purchase_id', purchase.id)
    .order('payment_date', { ascending: false })
    .limit(1)

  if (historyError) {
    console.error('⚠️ Failed to remove payment history:', historyError.message)
  }

  const { data: updated, error } = await supabaseAdmin
    .from('purchases')
    .select('*, friends!inner(name)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ purchase: enrichPurchase(updated) })
})

// Get payment history for a purchase
router.get('/:id/payments', adminMiddleware, async (req: AuthRequest, res: Response) => {
  if (!validateId(String(req.params.id))) return res.status(400).json({ error: 'معرف غير صالح' })

  const { data: payments, error } = await supabaseAdmin
    .from('payment_history')
    .select('*, profiles!created_by(username)')
    .eq('purchase_id', req.params.id)
    .order('payment_date', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ payments: payments || [] })
})

export default router
