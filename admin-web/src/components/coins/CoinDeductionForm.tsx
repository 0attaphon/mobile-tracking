'use client'

import { useState, type FormEvent } from 'react'
import {
  deductCoins,
  getStudentDeductionHistory,
  lookupStudentByCode,
  type CoinDeductionHistoryItem,
  type StudentCoinSummary,
} from '@/app/coins/actions'
import { COIN_ERROR_MESSAGES, POSTGRES_INT4_MAX } from '@/app/coins/validation'

function formatCoins(value: number) {
  return new Intl.NumberFormat('th-TH').format(value)
}

const RETRYABLE_ERROR = 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'

export function CoinDeductionForm() {
  const [studentCode, setStudentCode] = useState('')
  const [student, setStudent] = useState<StudentCoinSummary | null>(null)
  const [history, setHistory] = useState<CoinDeductionHistoryItem[]>([])
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
    setHistory([])
    setAmountText('')
    setRequestId(null)
    try {
      const result = await lookupStudentByCode(studentCode)
      if (result.ok) {
        setStudent(result.data)
        const historyResult = await getStudentDeductionHistory(result.data.code)
        if (historyResult.ok) setHistory(historyResult.data)
      }
      else setLookupError(result.message)
    } catch {
      setLookupError(RETRYABLE_ERROR)
    } finally {
      setLoading(false)
    }
  }

  function handleStudentCodeChange(value: string) {
    setStudentCode(value)
    setStudent(null)
    setHistory([])
    setAmountText('')
    setRequestId(null)
    setLookupError('')
    setSubmitError('')
    setNotice('')
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
    try {
      let result: Awaited<ReturnType<typeof deductCoins>>
      try {
        result = await deductCoins({
          studentCode: student.code,
          amount,
          requestId: activeRequestId,
          expectedBalance: student.balance,
          expectedWalletVersion: student.walletVersion,
        })
      } catch {
        // The server may have processed this request before the connection failed.
        // Preserve the ID so an unchanged retry is idempotent.
        setSubmitError(RETRYABLE_ERROR)
        return
      }

      if (result.ok) {
        let updatedBalance = result.data.balance
        setStudent({ ...student, balance: updatedBalance, walletVersion: student.walletVersion + 1 })
        setAmountText('')
        setRequestId(null)
        const confirmedEntry: CoinDeductionHistoryItem = {
          id: result.data.ledgerId,
          requestId: activeRequestId,
          delta: -amount,
          balanceBefore: student.balance,
          balanceAfter: updatedBalance,
          createdAt: new Date().toISOString(),
        }
        setHistory((current) => [confirmedEntry, ...current.filter((item) => item.id !== confirmedEntry.id)].slice(0, 10))
        const historyResult = await getStudentDeductionHistory(student.code)
        if (historyResult.ok) {
          // The server ledger is authoritative; replacing it also keeps retries/replays to one row.
          setHistory(historyResult.data)
        }
        const refreshed = await lookupStudentByCode(student.code)
        if (refreshed.ok) {
          setStudent(refreshed.data)
          updatedBalance = refreshed.data.balance
        }
        setNotice(`${result.data.replayed ? 'รายการนี้ดำเนินการแล้ว' : 'หักเหรียญสำเร็จ'} ยอดคงเหลือ ${formatCoins(updatedBalance)} เหรียญ`)
      } else if (result.code === 'BALANCE_CHANGED') {
        setRequestId(null)
        setAmountText('')
        setStudent(null)
        try {
          const refreshed = await lookupStudentByCode(student.code)
          if (refreshed.ok) setStudent(refreshed.data)
          else setLookupError(refreshed.message)
        } catch {
          setLookupError(RETRYABLE_ERROR)
        }
        setSubmitError(COIN_ERROR_MESSAGES.BALANCE_CHANGED)
      } else {
        setSubmitError(result.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <form onSubmit={handleLookup} className="space-y-3">
        <label htmlFor="student-code" className="block text-sm font-medium">รหัสนักเรียน</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="student-code"
            value={studentCode}
            onChange={(event) => handleStudentCodeChange(event.target.value)}
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

      {student ? (
        <section aria-labelledby="coin-history-heading" className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <h2 id="coin-history-heading" className="font-semibold">ประวัติการหักเหรียญล่าสุด</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">ยังไม่มีประวัติการหักเหรียญ</p>
          ) : (
            <ol className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {history.map((item) => (
                <li key={item.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]">
                  <span>{new Date(item.createdAt).toLocaleString('th-TH')}</span>
                  <span className="font-medium">−{formatCoins(Math.abs(item.delta))} เหรียญ</span>
                  <span className="text-slate-500 sm:col-span-2">{formatCoins(item.balanceBefore)} → {formatCoins(item.balanceAfter)} เหรียญ</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </section>
  )
}
