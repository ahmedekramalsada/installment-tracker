import type { Purchase } from '../types'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyShort(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getProgressPercent(paid: number, total: number): number {
  if (total === 0) return 0
  return Math.round((paid / total) * 100)
}

function formatDateArabic(dateStr: string): string {
  if (!dateStr) return 'غير محدد'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getDueEmoji(daysUntil: number, isOverdue: boolean): string {
  if (isOverdue) return '🔴'
  if (daysUntil <= 3) return '🟠'
  if (daysUntil <= 7) return '🟡'
  return '🟢'
}

export function generateWhatsAppMessage(
  friendName: string,
  purchaseName: string,
  monthlyPayment: number,
  remaining: number,
  _monthsLeft: number,
  nextDueDate: string,
  totalAmount?: number,
  monthsPaid?: number,
  totalMonths?: number,
  isOverdue?: boolean
): string {
  const daysUntil = getDaysUntil(nextDueDate)

  const paid = totalAmount ? totalAmount - remaining : 0

  const header = `╭━━━ *تذكير بالتقسيط* ━━━╮\n┃\n`

  const greeting = `┣ 👋 مرحباً ${friendName}\n┃\n`

  const item = `┣ 📱 ${purchaseName}\n┃ 💰 القسط الشهري: *${formatCurrency(monthlyPayment)}*\n┃ 📅 الموعد: ${formatDateArabic(nextDueDate)}\n┃\n`

  const summary = `┣ 📊 ملخص الحساب:\n┃ ├─ المبلغ الإجمالي: ${formatCurrency(totalAmount || remaining)}\n┃ ├─ المدفوع: ${formatCurrency(paid)}\n┃ ├─ المتبقي: *${formatCurrency(remaining)}*\n┃ └─ التقدم: ${getProgressPercent(monthsPaid || 0, totalMonths || 1)}%\n`

  let status = ''
  if (isOverdue) {
    status = `\n┣ ⚠️ تنبيه: الدفعة متأخرة ${Math.abs(daysUntil)} يوم!\n┃ يرجى السداد لتجنب الرسوم.\n`
  } else if (daysUntil === 0) {
    status = `\n┣ ⏰ الدفعة مستحقة *اليوم*\n`
  } else if (daysUntil === 1) {
    status = `\n┣ ⏰ الدفعة مستحقة *غداً*\n`
  } else {
    status = `\n┣ ⏰ القادمة خلال ${daysUntil} يوم\n`
  }

  const footer = `┃\n┣ 🌟 شكراً لتعاملك معنا\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯`

  return header + greeting + item + summary + status + footer
}

export function generateWhatsAppBulkMessage(
  friendName: string,
  purchases: Purchase[]
): string {
  const active = purchases.filter((p) => p.months_paid < p.total_months)
  if (active.length === 0) return ''

  let totalMonthly = 0
  let totalRemaining = 0

  let itemsMsg = ''

  active.forEach((p, i) => {
    const remaining = p.total_amount - p.months_paid * p.monthly_payment
    const daysUntil = getDaysUntil(p.next_due_date)
    const isOverdue = p.is_overdue || false
    const dueEmoji = getDueEmoji(daysUntil, isOverdue)

    totalMonthly += p.monthly_payment
    totalRemaining += remaining

    itemsMsg += `${dueEmoji} *${i + 1}. ${p.name}*\n   💰 القسط: *${formatCurrency(p.monthly_payment)}* | 📅 ${formatDateArabic(p.next_due_date || '')}\n   ✅ مدفوع: ${p.months_paid}/${p.total_months} (${getProgressPercent(p.months_paid, p.total_months)}%) | 💵 المتبقي: ${formatCurrency(remaining)}\n\n`
  })

  const header = `╭━━━ *تذكير بالدفعات* ━━━╮\n┃\n`

  const greeting = `┣ 👋 مرحباً ${friendName}\n┃\n`

  const items = `┣ 📋 دفعات مستحقة:\n┃\n${itemsMsg}`

  const summary = `┣ 💰 الإجمالي الشهري: *${formatCurrency(totalMonthly)}*\n┃ 💵 إجمالي المتبقي: *${formatCurrency(totalRemaining)}*\n`

  const footer = `┃\n┣ 🌟 شكراً لتعاملك معنا\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯`

  return header + greeting + items + summary + footer
}

export function generateUserSummaryMessage(
  friendName: string,
  purchases: Purchase[]
): string {
  const active = purchases.filter((p) => p.months_paid < p.total_months)
  if (active.length === 0) return ''

  let totalMonthly = 0
  let totalRemaining = 0
  let hasOverdue = false

  let itemsMsg = ''

  active.forEach((p, i) => {
    const remaining = p.total_amount - p.months_paid * p.monthly_payment
    
    const daysUntil = getDaysUntil(p.next_due_date)
    const isOverdue = p.is_overdue || false
    if (isOverdue) hasOverdue = true
    const dueEmoji = getDueEmoji(daysUntil, isOverdue)
    const progress = getProgressPercent(p.months_paid, p.total_months)

    totalMonthly += p.monthly_payment
    totalRemaining += remaining

    itemsMsg += `${dueEmoji} *${i + 1}. ${p.name}*
   💰 القسط الشهري: *${formatCurrency(p.monthly_payment)}*
   📅 الموعد القادم: *${formatDateArabic(p.next_due_date || '')}*
   📊 التقدم: ${p.months_paid}/${p.total_months} (${progress}%)
   💵 المتبقي: *${formatCurrency(remaining)}*

`
  })

  let warning = ''
  if (hasOverdue) {
    warning = `⚠️ *تنبيه: لديك دفعات متأخرة!*
يرجى المبادرة بالسداد.

`
  }

  return `━━━━━━━━━━━━━━━
📋 *ملخص مدفوعاتك*
━━━━━━━━━━━━━━━

مرحبا *${friendName}* 👋

هذا ملخص لدفعاتك المستحقة:

${itemsMsg}━━━━━━━━━━━━━━━
💵 *إجمالي المطلوب شهرياً: ${formatCurrency(totalMonthly)}*
💵 *إجمالي المتبقي: ${formatCurrency(totalRemaining)}*
━━━━━━━━━━━━━━━

${warning}🌟 شكراً لتعاملك معنا`
}

export function getWhatsAppLink(phone: string, message: string): string {
  if (!phone || phone.trim() === '') return ''
  
  let cleanPhone = phone.replace(/[^0-9]/g, '')
  
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1)
  }
  if (cleanPhone.startsWith('1') && !cleanPhone.startsWith('20')) {
    cleanPhone = '20' + cleanPhone
  }
  
  if (cleanPhone.length < 11) return ''
  
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
}

export function getMonthName(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ar-EG', { month: 'short', year: '2-digit' }).format(date)
}

export function getDaysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  const due = new Date(dateStr)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
