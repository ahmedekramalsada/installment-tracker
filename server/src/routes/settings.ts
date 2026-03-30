import { Router, Response } from 'express'
import db from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// Get all settings
router.get('/', (_req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  res.json({ settings })
})

// Update settings (admin only)
router.put('/', adminMiddleware, (req: AuthRequest, res: Response) => {
  const entries = Object.entries(req.body) as [string, string][]
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of entries) {
    stmt.run(key, String(value))
  }
  res.json({ success: true })
})

export default router
