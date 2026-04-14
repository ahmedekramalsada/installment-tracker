import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../db.js'

// FAIL HARD if JWT_SECRET is not set — no hardcoded fallback for security
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required')
  process.exit(1)
}

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string }
}

/**
 * Auth middleware: validates our session JWT
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { id: string; username: string; role: string }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'جلسة غير صالحة' })
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'صلاحيات المسؤول مطلوبة' })
  }
  next()
}

export function generateToken(user: { id: string; username: string; role: string }) {
  return jwt.sign(user, JWT_SECRET!, { expiresIn: '7d' })
}

/**
 * Authenticate user by username + password (stored in profiles table)
 */
export async function loginUser(username: string, password: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !data) {
    return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
  }

  const valid = await bcrypt.compare(password, data.password_hash)
  if (!valid) {
    return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
  }

  return {
    user: { id: data.id, username: data.username, role: data.role },
  }
}

/**
 * Register a new user — relies on UNIQUE constraint for atomicity
 */
export async function registerUser(username: string, password: string) {
  const hash = await bcrypt.hash(password, 10)
  const id = crypto.randomUUID()

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id,
      username,
      password_hash: hash,
      role: 'user',
    })
    .select()
    .single()

  if (error) {
    // UNIQUE constraint violation = username already taken
    if (error.code === '23505') {
      return { error: 'اسم المستخدم موجود بالفعل' }
    }
    return { error: error.message }
  }

  return {
    user: { id: profile.id, username: profile.username, role: profile.role },
  }
}

/**
 * Look up a profile by ID
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, created_at')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data
}
