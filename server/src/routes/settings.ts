import { Router, Response } from 'express'
import { supabaseAdmin } from '../db.js'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)

// Allowlist of valid setting keys
const VALID_SETTINGS_KEYS = new Set(['credit_limit'])

// Get all settings
router.get('/', async (_req: AuthRequest, res: Response) => {
  const { data: rows, error } = await supabaseAdmin
    .from('settings')
    .select('*')

  if (error) return res.status(500).json({ error: error.message })

  const settings: Record<string, string> = {}
  for (const row of rows || []) {
    settings[row.key] = row.value
  }
  res.json({ settings })
})

// Update settings (admin only) — with allowlist validation
router.put('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  const entries = Object.entries(req.body)

  // Validate all keys against allowlist
  for (const [key] of entries) {
    if (!VALID_SETTINGS_KEYS.has(key)) {
      return res.status(400).json({ error: `إعداد غير صالح: ${key}` })
    }
  }

  // Validate values
  const validatedEntries: [string, string][] = []
  for (const [key, value] of entries) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return res.status(400).json({ error: `قيمة غير صالحة لـ ${key}` })
    }
    validatedEntries.push([key, String(value)])
  }

  // Apply updates
  for (const [key, value] of validatedEntries) {
    const { error } = await supabaseAdmin
      .from('settings')
      .upsert({ key, value })
    if (error) return res.status(500).json({ error: error.message })
  }

  res.json({ success: true })
})

export default router
