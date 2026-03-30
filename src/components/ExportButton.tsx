import { useState } from 'react'
import { Download, FileText, Sheet } from 'lucide-react'

interface Props {
  onExportPDF: () => void
  onExportExcel: () => void
  label?: string
}

export function ExportButton({ onExportPDF, onExportExcel, label }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-colors"
      >
        <Download className="w-4 h-4" />
        {label || 'تصدير'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 glass rounded-xl overflow-hidden min-w-[160px]">
            <button
              onClick={() => {
                onExportPDF()
                setOpen(false)
              }}
              className="w-full px-4 py-3 flex items-center gap-2 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-400" />
              PDF
            </button>
            <button
              onClick={() => {
                onExportExcel()
                setOpen(false)
              }}
              className="w-full px-4 py-3 flex items-center gap-2 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Sheet className="w-4 h-4 text-emerald-400" />
              Excel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
