import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Purchase, Friend } from '../types'
import { formatCurrency } from './utils'

export function exportFriendPDF(friendName: string, purchases: Purchase[]) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(`Installment Report - ${friendName}`, 14, 20)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString('ar-EG')}`, 14, 28)

  const tableData = purchases.map((p) => {
    const paid = p.months_paid * p.monthly_payment
    const remaining = p.total_amount - paid
    return [
      p.name,
      p.total_amount.toLocaleString(),
      p.monthly_payment.toLocaleString(),
      `${p.months_paid}/${p.total_months}`,
      paid.toLocaleString(),
      remaining.toLocaleString(),
      p.interest_rate > 0 ? `${p.interest_rate}%` : '-',
      p.fees > 0 ? p.fees.toLocaleString() : '-',
    ]
  })

  autoTable(doc, {
    startY: 35,
    head: [['Product', 'Total', 'Monthly', 'Progress', 'Paid', 'Remaining', 'Interest', 'Fees']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  const totalAmount = purchases.reduce((s, p) => s + p.total_amount, 0)
  const totalPaid = purchases.reduce((s, p) => s + p.months_paid * p.monthly_payment, 0)
  const totalRemaining = totalAmount - totalPaid

  const finalY = (doc as any).lastAutoTable?.finalY || 35
  doc.setFontSize(11)
  doc.text(`Total: ${formatCurrency(totalAmount)} | Paid: ${formatCurrency(totalPaid)} | Remaining: ${formatCurrency(totalRemaining)}`, 14, finalY + 10)

  doc.save(`${friendName}-report.pdf`)
}

export function exportAllExcel(friends: Friend[], allPurchases: Purchase[]) {
  const data = allPurchases.map((p) => ({
    'الصديق': p.friend_name || '',
    'المنتج': p.name,
    'الإجمالي': p.total_amount,
    'القسط الشهري': p.monthly_payment,
    'الأشهر المدفوعة': p.months_paid,
    'إجمالي الأشهر': p.total_months,
    'المتبقي': p.total_amount - p.months_paid * p.monthly_payment,
    'نسبة الفائدة': p.interest_rate,
    'الرسوم': p.fees,
    'تاريخ البدء': p.start_date,
    'الموعد القادم': p.next_due_date || '',
    'متأخر': p.is_overdue ? 'نعم' : 'لا',
  }))

  const ws = XLSX.utils.json_to_sheet(data)

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Installments')

  // Add summary sheet
  const summary = friends.map((f) => {
    const friendPurchases = allPurchases.filter((p) => p.friend_id === f.id)
    const total = friendPurchases.reduce((s, p) => s + p.total_amount, 0)
    const paid = friendPurchases.reduce((s, p) => s + p.months_paid * p.monthly_payment, 0)
    return {
      'الصديق': f.name,
      'الهاتف': f.phone,
      'عدد المشتريات': friendPurchases.length,
      'الإجمالي': total,
      'المدفوع': paid,
      'المتبقي': total - paid,
    }
  })
  const ws2 = XLSX.utils.json_to_sheet(summary)
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  XLSX.writeFile(wb, 'installments-report.xlsx')
}
