import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './db.js'
import { generateToken } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import friendRoutes from './routes/friends.js'
import purchaseRoutes from './routes/purchases.js'
import statsRoutes from './routes/stats.js'
import settingsRoutes from './routes/settings.js'
import remindersRoutes from './routes/reminders.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3001')
const isProd = process.env.NODE_ENV === 'production'

// ── Middleware ──
app.use(cors())
app.use(express.json({ limit: '1mb' })) // Body size limit
app.use(isProd ? morgan('combined') : morgan('dev'))

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', apiLimiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'محاولات كثيرة جداً، حاول مرة أخرى لاحقاً',
})
app.use('/api/auth', authLimiter)

// ── Health Check ──
app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin.from('settings').select('key').limit(1)
    if (error) {
      return res.status(503).json({ status: 'unhealthy', database: 'disconnected' })
    }
    res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'error' })
  }
})

// ── Seed Admin User (dev/first-run only) ──
app.post('/api/seed-admin', async (_req, res) => {
  // Only works if no admin exists yet
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', 'admin')
    .single()

  if (existing) {
    return res.status(409).json({ error: 'المسؤول موجود بالفعل' })
  }

  const hash = await bcrypt.hash('admin123', 10)
  const id = crypto.randomUUID()

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .insert({ id, username: 'admin', password_hash: hash, role: 'admin' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const token = generateToken({ id: profile.id, username: 'admin', role: 'admin' })
  res.status(201).json({ message: 'تم إنشاء حساب المسؤول', user: { id: profile.id, username: 'admin', role: 'admin' }, token })
})

// ── API Routes ──
app.use('/api/auth', authRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/purchases', purchaseRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/reminders', remindersRoutes)

// ── Global Error Handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err.message)
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'بيانات غير صالحة' })
  }
  res.status(500).json({ error: 'حدث خطأ غير متوقع' })
})

// ── Serve Frontend (production only) ──
if (isProd) {
  const clientDist = path.join(__dirname, '..', '..', 'dist')
  app.use(express.static(clientDist, { maxAge: '1d' }))
  app.use((_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// ── Start Server ──
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  if (!isProd) {
    console.log(`🔧 Dev mode — seed admin: POST http://localhost:${PORT}/api/seed-admin`)
  }
})

// ── Graceful Shutdown ──
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`)
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
