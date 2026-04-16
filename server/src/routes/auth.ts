import { Router, Response } from 'express'
import { loginUser, registerUser, generateToken, authMiddleware, adminMiddleware, AuthRequest, getProfile, changePassword } from '../middleware/auth.js'
import { supabaseAdmin } from '../db.js'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const router = Router()

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

const registerSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})

router.post('/login', async (req: AuthRequest, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'بيانات غير صالحة' })
  }

  const { username, password } = parseResult.data
  const result = await loginUser(username, password)

  if (result.error || !result.user) {
    return res.status(401).json({ error: result.error || 'فشل في تسجيل الدخول' })
  }

  const token = generateToken(result.user!)
  res.json({ token, user: result.user })
})

router.post('/register', async (req: AuthRequest, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'بيانات غير صالحة' })
  }

  const { username, password } = parseResult.data
  const result = await registerUser(username, password)

  if (result.error || !result.user) {
    return res.status(400).json({ error: result.error || 'فشل في التسجيل' })
  }

  try {
    await supabaseAdmin
      .from('friends')
      .insert({ user_id: result.user.id, name: username })
  } catch (err) {
    console.log('Auto-create friend error:', err)
  }

  const token = generateToken(result.user!)
  res.json({ token, user: result.user })
})

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await getProfile(req.user!.id)
  if (!user) {
    return res.status(404).json({ error: 'الحساب غير موجود' })
  }
  res.json({ user })
})

router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبة' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('password_hash')
    .eq('id', req.user!.id)
    .single()

  if (profileError || !profile) {
    return res.status(404).json({ error: 'الحساب غير موجود' })
  }

  const valid = await bcrypt.compare(currentPassword, profile.password_hash)
  if (!valid) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' })
  }

  const result = await changePassword(req.user!.id, newPassword)
  if (result.error) {
    return res.status(500).json({ error: result.error })
  }

  res.json({ success: true })
})

router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { data: users, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ users: users || [] })
})

router.post('/reset-password', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { userId, newPassword } = req.body

  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'معرف المستخدم وكلمة المرور مطلوبة' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  }

  const result = await changePassword(userId, newPassword)
  if (result.error) {
    return res.status(500).json({ error: result.error })
  }

  res.json({ success: true })
})

export default router
