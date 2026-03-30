import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/login', (req: AuthRequest, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
  }

  const token = generateToken({ id: user.id, username: user.username, role: user.role })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
})

router.post('/register', (req: AuthRequest, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, 'user')
  const token = generateToken({ id: result.lastInsertRowid as number, username, role: 'user' })
  res.json({ token, user: { id: result.lastInsertRowid, username, role: 'user' } })
})

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.user!.id)
  res.json({ user })
})

export default router
