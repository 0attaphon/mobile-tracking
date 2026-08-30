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
      <label className="text-slate-400 text-sm" htmlFor="class-name-input">
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
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'saving'}
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-slate-700 disabled:opacity-50"
      >
        {status === 'saving' ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
      {status === 'saved' ? <span className="text-emerald-400 text-xs">บันทึกแล้ว</span> : null}
      {status === 'error' ? <span className="text-red-400 text-xs">เกิดข้อผิดพลาด</span> : null}
    </div>
  )
}
