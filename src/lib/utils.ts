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
  monthsLeft: number,
  nextDueDate: string,
  totalAmount?: number,
  monthsPaid?: number,
  totalMonths?: number,
  isOverdue?: boolean
): string {
  const daysUntil = getDaysUntil(nextDueDate)
  const dueEmoji = getDueEmoji(daysUntil, isOverdue || false)

  const progressPercent = totalMonths && monthsPaid !== undefined
    ? getProgressPercent(monthsPaid, totalMonths)
    : getProgressPercent(totalMonths ? totalMonths - monthsLeft : 0, totalMonths || 1)

  const paid = totalAmount ? totalAmount - remaining : 0

  let msg = `━━━━━━━━━━━━━━━
📋 *تذكير بالتقسيط*
━━━━━━━━━━━━━━━

مرحبا *${friendName}* 👋

نود تذكيرك بموعد الدفعة المستحقة:

📱 *${purchaseName}*

💰 القسط الشهري: *${formatCurrency(monthlyPayment)}*
📅 الموعد: *${formatDateArabic(nextDueDate)}*

━━━━━━━━━━━━━━━
📊 *ملخص الحساب*
• المبلغ الإجمالي: ${formatCurrency(totalAmount || remaining)}
• المدفوع: ${formatCurrency(paid)}
• المتبقي: *${formatCurrency(remaining)}*
• الأشهر المتبية: ${monthsLeft} شهر
• التقدم: ${progressPercent}%
━━━━━━━━━━━━━━━

${dueEmoji} `

  if (isOverdue) {
    msg += `⚠️ *تنبيه: هذه الدفعة متأخرة ${Math.abs(daysUntil)} يوم!*\nيرجى المبادرة بالسداد لتجنب أي رسوم إضافية.`
  } else if (daysUntil === 0) {
    msg += `الدفعة مستحقة *اليوم!* ⏰`
  } else if (daysUntil === 1) {
    msg += `الدفعة مستحقة *غداً* ⏰`
  } else {
    msg += `الدفعة القادمة خلال *${daysUntil} يوم*`
  }

  msg += `

نتمنى لك يوماً سعيداً 🌟
شكراً لتعاملك معنا`

  return msg
}

export function generateWhatsAppBulkMessage(
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

    totalMonthly += p.monthly_payment
    totalRemaining += remaining

    itemsMsg += `${dueEmoji} *${i + 1}. ${p.name}*
   💰 القسط: *${formatCurrency(p.monthly_payment)}*
   📅 الموعد: *${formatDateArabic(p.next_due_date || '')}*
   ✅ تم سداد: ${p.months_paid}/${p.total_months} (${getProgressPercent(p.months_paid, p.total_months)}%)
   💵 المتبقي: *${formatCurrency(remaining)}*

`
  })

  let warning = ''
  if (hasOverdue) {
    warning = `⚠️ *تنبيه: يوجد دفعات متأخرة!*
يرجى المبادرة بالسداد لتجنب أي رسوم إضافية.

`
  }

  return `━━━━━━━━━━━━━━━
📋 *تذكير بالدفعات المستحقة*
━━━━━━━━━━━━━━━

مرحبا *${friendName}* 👋

لديك الدفعات التالية مستحقة:

━━━━━━━━━━━━━━━
${itemsMsg}━━━━━━━━━━━━━━━

💵 *إجمالي المطلوب شهرياً: ${formatCurrency(totalMonthly)}*
💵 *إجمالي المتبقي: ${formatCurrency(totalRemaining)}*

${warning}نتمنى لك يوماً سعيداً 🌟
شكراً لتعاملك معنا`
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
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
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
