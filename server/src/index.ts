import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import cron from 'node-cron'
import db from './db.js'
import authRoutes from './routes/auth.js'
import friendRoutes from './routes/friends.js'
import purchaseRoutes from './routes/purchases.js'
import statsRoutes from './routes/stats.js'
import settingsRoutes from './routes/settings.js'
import remindersRoutes from './routes/reminders.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3001')

app.use(cors())
app.use(express.json())

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/purchases', purchaseRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/reminders', remindersRoutes)

// Cron job: Clean old reminders on the 1st of every month at midnight
cron.schedule('0 0 1 * *', () => {
  console.log('🗓️ Monthly reminder cleanup started')
  const result = db.prepare(`
    DELETE FROM reminders 
    WHERE month_key < strftime('%Y-%m', 'now', '-3 months')
  `).run()
  console.log(`🗑️ Cleaned ${result.changes} old reminder records`)
})

// Serve frontend in production
const clientDist = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(clientDist))
app.use((_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
})
