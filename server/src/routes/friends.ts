import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)

const createFriendSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().max(20).optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100).optional(),
})

const updateFriendSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
})

// Get all friends (admin) or own friend record (user)
router.get('/', async (req: AuthRequest, res: Response) => {
  if (req.user!.role === 'admin') {
    const { data: friends, error } = await supabaseAdmin
      .from('friends')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ friends: friends || [] })
  }

  const { data: friend, error } = await supabaseAdmin
    .from('friends')
    .select('*')
    .eq('user_id', req.user!.id)
    .single()

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  res.json({ friends: friend ? [friend] : [] })
})

// Create friend (admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  const parseResult = createFriendSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'بيانات غير صالحة' })
  }

  const { name, phone, username, password } = parseResult.data

  let userId: string | null = null

  if (username && password) {
    const hash = await bcrypt.hash(password, 10)
    const newId = crypto.randomUUID()

    // Try to create user — UNIQUE constraint handles duplicate usernames atomically
    const { error: userError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: newId, username, password_hash: hash, role: 'user' })

    if (userError) {
      if (userError.code === '23505') {
        return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' })
      }
      return res.status(500).json({ error: userError.message })
    }
    userId = newId
  }

  const { data: friend, error } = await supabaseAdmin
    .from('friends')
    .insert({ user_id: userId, name, phone: phone || '' })
    .select()
    .single()

  if (error) {
    // Clean up user if friend creation failed
    if (userId) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
    }
    return res.status(500).json({ error: error.message })
  }

  res.json({ friend })
})

// Update friend (admin only) — now with Zod validation
router.put('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(String(req.params.id))
  if (isNaN(id)) return res.status(400).json({ error: 'معرف غير صالح' })

  const parseResult = updateFriendSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'بيانات غير صالحة' })
  }

  const updates: Record<string, string> = {}
  if (parseResult.data.name !== undefined) updates.name = parseResult.data.name
  if (parseResult.data.phone !== undefined) updates.phone = parseResult.data.phone

  if (Object.keys(updates).length === 0) {
    const { data: friend } = await supabaseAdmin.from('friends').select('*').eq('id', id).single()
    return res.json({ friend })
  }

  const { data: friend, error } = await supabaseAdmin
    .from('friends')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ friend })
})

// Delete friend (admin only)
router.delete('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(String(req.params.id))
  if (isNaN(id)) return res.status(400).json({ error: 'معرف غير صالح' })

  const { error } = await supabaseAdmin.from('friends').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
