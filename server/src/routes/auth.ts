import { Router, Response } from 'express'
import { loginUser, registerUser, generateToken, authMiddleware, AuthRequest, getProfile } from '../middleware/auth.js'
import { z } from 'zod'

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

export default router
