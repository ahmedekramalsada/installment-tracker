import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// Get all friends (admin) or own friend record (user)
router.get('/', (req: AuthRequest, res: Response) => {
  if (req.user!.role === 'admin') {
    const friends = db.prepare('SELECT * FROM friends ORDER BY created_at DESC').all()
    res.json({ friends })
  } else {
    const friend = db.prepare('SELECT * FROM friends WHERE user_id = ?').get(req.user!.id)
    res.json({ friends: friend ? [friend] : [] })
  }
})

// Create friend (admin only)
router.post('/', adminMiddleware, (req: AuthRequest, res: Response) => {
  const { name, phone, username, password } = req.body
  if (!name) {
    return res.status(400).json({ error: 'الاسم مطلوب' })
  }

  let userId: number | null = null

  if (username && password) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' })
    }
    const hash = bcrypt.hashSync(password, 10)
    const userResult = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, 'user')
    userId = userResult.lastInsertRowid as number
  }

  const result = db.prepare('INSERT INTO friends (user_id, name, phone) VALUES (?, ?, ?)').run(
    userId, name, phone || ''
  )

  const friend = db.prepare('SELECT * FROM friends WHERE id = ?').get(result.lastInsertRowid)
  res.json({ friend })
})

// Update friend (admin only)
router.put('/:id', adminMiddleware, (req: AuthRequest, res: Response) => {
  const { name, phone } = req.body
  db.prepare('UPDATE friends SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?').run(name, phone, req.params.id)
  const friend = db.prepare('SELECT * FROM friends WHERE id = ?').get(req.params.id)
  res.json({ friend })
})

// Delete friend (admin only)
router.delete('/:id', adminMiddleware, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM friends WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
