import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Bell } from 'lucide-react'
import { ReminderPanel } from './ReminderPanel'

interface Props {
  isAdmin: boolean
}

export function ReminderBell({ isAdmin }: Props) {
  const [count, setCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)

  const loadCount = useCallback(async () => {
    try {
      const { count } = await api.getRemindersCount()
      setCount(count)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadCount()
  }, [loadCount])

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        title="التذكيرات"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {showPanel && (
        <ReminderPanel
          isAdmin={isAdmin}
          onClose={() => setShowPanel(false)}
          onSent={() => {
            setShowPanel(false)
            loadCount()
          }}
        />
      )}
    </>
  )
}
