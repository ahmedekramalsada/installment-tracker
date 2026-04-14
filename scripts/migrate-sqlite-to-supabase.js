#!/usr/bin/env node
/**
 * SQLite → Supabase Migration Script
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-supabase.js \
 *     --sqlite-db ./data.db \
 *     --supabase-url https://xxx.supabase.co \
 *     --service-key your-service-role-key
 *
 * Prerequisites:
 *   npm install better-sqlite3 @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Parse CLI args ──
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sqlite-db' && args[i + 1]) config.sqliteDb = args[++i]
    else if (args[i] === '--supabase-url' && args[i + 1]) config.supabaseUrl = args[++i]
    else if (args[i] === '--service-key' && args[i + 1]) config.serviceKey = args[++i]
    else if (args[i] === '--help') {
      console.log('Usage: node scripts/migrate-sqlite-to-supabase.js --sqlite-db <path> --supabase-url <url> --service-key <key>')
      process.exit(0)
    }
  }
  return config
}

const config = parseArgs()

if (!config.sqliteDb || !config.supabaseUrl || !config.serviceKey) {
  console.error('❌ Missing required arguments.')
  console.error('Usage: node scripts/migrate-sqlite-to-supabase.js --sqlite-db <path> --supabase-url <url> --service-key <key>')
  process.exit(1)
}

// ── Resolve paths ──
const sqlitePath = path.resolve(config.sqliteDb)
if (!fs.existsSync(sqlitePath)) {
  console.error(`❌ SQLite database not found at: ${sqlitePath}`)
  process.exit(1)
}

// ── Dynamic import for better-sqlite3 (may not be installed) ──
let Database
try {
  const sqliteModule = await import('better-sqlite3')
  Database = sqliteModule.default
} catch {
  console.error('❌ better-sqlite3 is not installed.')
  console.error('   Run: npm install better-sqlite3')
  process.exit(1)
}

// ── Connect to both databases ──
console.log('📂 Connecting to SQLite database...')
const sqlite = new Database(sqlitePath, { readonly: true })
console.log('✅ SQLite connected:', sqlitePath)

console.log('☁️  Connecting to Supabase...')
const supabase = createClient(config.supabaseUrl, config.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
console.log('✅ Supabase connected:', config.supabaseUrl)

// ── Migration ──
const stats = {
  profiles: { migrated: 0, skipped: 0, errors: 0 },
  friends: { migrated: 0, skipped: 0, errors: 0 },
  purchases: { migrated: 0, skipped: 0, errors: 0 },
  settings: { migrated: 0, skipped: 0, errors: 0 },
  reminders: { migrated: 0, skipped: 0, errors: 0 },
}

// Track user ID mapping (old integer ID → new UUID)
const userIdMap = new Map()

async function migrate() {
  try {
    // 1. Migrate users (profiles)
    console.log('\n📋 Migrating users (profiles)...')
    const users = sqlite.prepare('SELECT * FROM users').all()
    for (const user of users) {
      const newId = crypto.randomUUID()
      userIdMap.set(user.id, newId)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: newId,
          username: user.username,
          password_hash: user.password,
          role: user.role,
          created_at: user.created_at,
        })

      if (error) {
        if (error.code === '23505') {
          console.log(`   ⏭️  Skipped duplicate user: ${user.username}`)
          stats.profiles.skipped++
        } else {
          console.error(`   ❌ Error migrating user ${user.username}:`, error.message)
          stats.profiles.errors++
        }
      } else {
        console.log(`   ✅ Migrated user: ${user.username} (${user.role})`)
        stats.profiles.migrated++
      }
    }

    // 2. Migrate friends
    console.log('\n👥 Migrating friends...')
    const friends = sqlite.prepare('SELECT * FROM friends').all()
    for (const friend of friends) {
      const newUserUuid = friend.user_id ? userIdMap.get(friend.user_id) : null

      const { error } = await supabase
        .from('friends')
        .insert({
          id: friend.id,
          user_id: newUserUuid,
          name: friend.name,
          phone: friend.phone || '',
          created_at: friend.created_at,
        })

      if (error) {
        console.error(`   ❌ Error migrating friend ${friend.name}:`, error.message)
        stats.friends.errors++
      } else {
        console.log(`   ✅ Migrated friend: ${friend.name}`)
        stats.friends.migrated++
      }
    }

    // 3. Migrate purchases
    console.log('\n🛒 Migrating purchases...')
    const purchases = sqlite.prepare('SELECT * FROM purchases').all()
    for (const purchase of purchases) {
      const { error } = await supabase
        .from('purchases')
        .insert({
          id: purchase.id,
          friend_id: purchase.friend_id,
          name: purchase.name,
          total_amount: purchase.total_amount,
          monthly_payment: purchase.monthly_payment,
          total_months: purchase.total_months,
          months_paid: purchase.months_paid,
          interest_rate: purchase.interest_rate || 0,
          fees: purchase.fees || 0,
          start_date: purchase.start_date,
          notes: purchase.notes || '',
          created_at: purchase.created_at,
        })

      if (error) {
        console.error(`   ❌ Error migrating purchase ${purchase.name}:`, error.message)
        stats.purchases.errors++
      } else {
        console.log(`   ✅ Migrated purchase: ${purchase.name}`)
        stats.purchases.migrated++
      }
    }

    // 4. Migrate settings
    console.log('\n⚙️  Migrating settings...')
    const settingsRows = sqlite.prepare('SELECT * FROM settings').all()
    for (const row of settingsRows) {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: row.key, value: row.value })

      if (error) {
        console.error(`   ❌ Error migrating setting ${row.key}:`, error.message)
        stats.settings.errors++
      } else {
        console.log(`   ✅ Migrated setting: ${row.key}`)
        stats.settings.migrated++
      }
    }

    // 5. Migrate reminders
    console.log('\n🔔 Migrating reminders...')
    const reminders = sqlite.prepare('SELECT * FROM reminders').all()
    for (const reminder of reminders) {
      const { error } = await supabase
        .from('reminders')
        .upsert({
          id: reminder.id,
          purchase_id: reminder.purchase_id,
          month_key: reminder.month_key,
          sent_at: reminder.sent_at,
        })

      if (error) {
        console.error(`   ❌ Error migrating reminder:`, error.message)
        stats.reminders.errors++
      } else {
        stats.reminders.migrated++
      }
    }

    // ── Summary ──
    console.log('\n' + '='.repeat(50))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(50))

    for (const [table, s] of Object.entries(stats)) {
      const emoji = s.errors > 0 ? '⚠️' : '✅'
      console.log(`${emoji} ${table}: ${s.migrated} migrated, ${s.skipped} skipped, ${s.errors} errors`)
    }

    const totalErrors = Object.values(stats).reduce((sum, s) => sum + s.errors, 0)
    if (totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully!')
    } else {
      console.log(`\n⚠️  Migration completed with ${totalErrors} error(s). Review the log above.`)
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

migrate()
