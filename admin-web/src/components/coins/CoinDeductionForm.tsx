'use client'

import { useState, type FormEvent } from 'react'
import {
  deductCoins,
  lookupStudentByCode,
  type StudentCoinSummary,
} from '@/app/coins/actions'
import { COIN_ERROR_MESSAGES, POSTGRES_INT4_MAX } from '@/app/coins/validation'

function formatCoins(value: number) {
  return new Intl.NumberFormat('th-TH').format(value)
}

export function CoinDeductionForm() {
  const [studentCode, setStudentCode] = useState('')
  const [student, setStudent] = useState<StudentCoinSummary | null>(null)
  const [amountText, setAmountText] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const amount = /^\d+$/.test(amountText) ? Number(amountText) : NaN
  const validAmount = Number.isSafeInteger(amount) && amount > 0 && amount <= POSTGRES_INT4_MAX
  const affordable = validAmount && !!student && amount <= student.balance
  const busy = loading

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setLookupError('')
    setSubmitError('')
    setNotice('')
    setStudent(null)
    setAmountText('')
    setRequestId(null)
    const result = await lookupStudentByCode(studentCode)
    if (result.ok) setStudent(result.data)
    else setLookupError(result.message)
    setLoading(false)
  }

  function handleAmountChange(value: string) {
    setAmountText(value)
    const nextAmount = /^\d+$/.test(value) ? Number(value) : NaN
    const canConfirm = Number.isSafeInteger(nextAmount) && nextAmount > 0 &&
      nextAmount <= POSTGRES_INT4_MAX && !!student && nextAmount <= student.balance
    setRequestId(canConfirm ? crypto.randomUUID() : null)
    setSubmitError('')
    setNotice('')
  }

  async function handleDeduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!student || !affordable || busy) return

    // Keep the same id while retrying an unchanged confirmation after a transient failure.
    const activeRequestId = requestId ?? crypto.randomUUID()
    setRequestId(activeRequestId)
    setLoading(true)
    setSubmitError('')
    setNotice('')
    const result = await deductCoins({
      studentCode: student.code,
      amount,
      requestId: activeRequestId,
      expectedBalance: student.balance,
    })
    if (result.ok) {
      const updatedBalance = result.data.balance
      setStudent({ ...student, balance: updatedBalance })
      setAmountText('')
      setRequestId(null)
      setNotice(`หักเหรียญสำเร็จ ยอดคงเหลือ ${formatCoins(updatedBalance)} เหรียญ`)
    } else if (result.code === 'BALANCE_CHANGED') {
      const refreshed = await lookupStudentByCode(student.code)
      setRequestId(null)
      setAmountText('')
      if (refreshed.ok) setStudent(refreshed.data)
      else {
        setStudent(null)
        setLookupError(refreshed.message)
      }
      setSubmitError(COIN_ERROR_MESSAGES.BALANCE_CHANGED)
    } else {
      setSubmitError(result.message)
    }
    setLoading(false)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <form onSubmit={handleLookup} className="space-y-3">
        <label htmlFor="student-code" className="block text-sm font-medium">รหัสนักเรียน</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="student-code"
            value={studentCode}
            onChange={(event) => setStudentCode(event.target.value)}
            disabled={busy}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
            placeholder="กรอกรหัสนักเรียน"
          />
          <button
            type="submit"
            disabled={busy || studentCode.trim().length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && !student ? 'กำลังค้นหา…' : 'ค้นหานักเรียน'}
          </button>
        </div>
      </form>

      {lookupError ? <p role="alert" className="mt-3 text-sm text-red-600">{lookupError}</p> : null}

      {student ? (
        <form onSubmit={handleDeduct} className="mt-6 space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <h2 className="font-semibold">ตรวจสอบนักเรียน</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">รหัสนักเรียน</dt><dd className="font-medium">{student.code}</dd></div>
              <div><dt className="text-slate-500">ชื่อเล่น</dt><dd className="font-medium">{student.nickname || '—'}</dd></div>
              <div><dt className="text-slate-500">ห้องเรียน</dt><dd className="font-medium">{student.className || '—'}</dd></div>
              <div><dt className="text-slate-500">ยอดเหรียญยืนยันล่าสุด</dt><dd className="font-semibold">{formatCoins(student.balance)} เหรียญ</dd></div>
            </dl>
          </div>

          <div>
            <label htmlFor="deduction-amount" className="mb-2 block text-sm font-medium">จำนวนเหรียญที่ต้องการหัก</label>
            <input
              id="deduction-amount"
              inputMode="numeric"
              value={amountText}
              onChange={(event) => handleAmountChange(event.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              placeholder="จำนวนเต็มมากกว่า 0"
              aria-describedby="deduction-help"
            />
            <p id="deduction-help" className="mt-1 text-xs text-slate-500">ใส่จำนวนเต็มบวกไม่เกินยอดคงเหลือ</p>
          </div>

          {amountText ? (
            <div aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <h2 className="mb-2 font-semibold">ตรวจสอบก่อนยืนยัน</h2>
              <p>ยอดเดิม <strong>{formatCoins(student.balance)}</strong> → หัก <strong>{validAmount ? formatCoins(amount) : '—'}</strong> → ยอดคงเหลือ <strong>{validAmount && amount <= student.balance ? formatCoins(student.balance - amount) : '—'}</strong> เหรียญ</p>
              {!validAmount ? <p className="mt-2 text-red-600">{COIN_ERROR_MESSAGES.INVALID_AMOUNT}</p> : null}
              {validAmount && !affordable ? <p className="mt-2 text-red-600">{COIN_ERROR_MESSAGES.INSUFFICIENT_COINS}</p> : null}
            </div>
          ) : null}

          {submitError ? <p role="alert" className="text-sm text-red-600">{submitError}</p> : null}
          {notice ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p> : null}

          <button
            type="submit"
            disabled={busy || !affordable}
            className="w-full rounded-lg bg-rose-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึกรายการ…' : `ยืนยันหัก ${validAmount ? formatCoins(amount) : ''} เหรียญ`}
          </button>
        </form>
      ) : null}
    </section>
  )
}
