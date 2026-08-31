'use client'

import { useState } from 'react'
import { updateClassName } from '@/app/students/[id]/actions'

export function ClassNameEditor({
  studentId,
  initialClassName,
}: {
  studentId: string
  initialClassName: string | null
}) {
  const [value, setValue] = useState(initialClassName ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSave() {
    setStatus('saving')
    try {
      await updateClassName(studentId, value)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="print:hidden flex items-center gap-2">
      <label className="text-slate-600 dark:text-slate-400 text-sm" htmlFor="class-name-input">
        ห้องเรียน
      </label>
      <input
        id="class-name-input"
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setStatus('idle')
        }}
        placeholder="เช่น ม.1/1"
        className="rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'saving'}
        className="rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
      >
        {status === 'saving' ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
      {status === 'saved' ? <span className="text-emerald-600 dark:text-emerald-400 text-xs">บันทึกแล้ว</span> : null}
      {status === 'error' ? <span className="text-red-600 dark:text-red-400 text-xs">เกิดข้อผิดพลาด</span> : null}
    </div>
  )
}
