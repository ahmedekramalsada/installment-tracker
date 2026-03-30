import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'installment-tracker-secret-key-2026'

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string }
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

export function generateToken(user: { id: number; username: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
