export type CoinActionErrorCode =
  | 'ADMIN_REQUIRED'
  | 'STUDENT_NOT_FOUND'
  | 'INVALID_STUDENT_CODE'
  | 'INVALID_AMOUNT'
  | 'INSUFFICIENT_COINS'
  | 'BALANCE_CHANGED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNKNOWN'

export type CoinActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CoinActionErrorCode; message: string }

export type DeductionResult = { balance: number; ledgerId: string; replayed: boolean }

export const COIN_ERROR_MESSAGES: Record<CoinActionErrorCode, string> = {
  ADMIN_REQUIRED: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ',
  STUDENT_NOT_FOUND: 'ไม่พบนักเรียนที่มีรหัสนี้',
  INVALID_STUDENT_CODE: 'กรุณากรอกรหัสนักเรียน',
  INVALID_AMOUNT: 'จำนวนเหรียญต้องเป็นจำนวนเต็มบวกที่ถูกต้อง',
  INSUFFICIENT_COINS: 'ยอดเหรียญของนักเรียนไม่เพียงพอ',
  BALANCE_CHANGED: 'ยอดเหรียญเปลี่ยนแปลง กรุณาตรวจสอบและยืนยันใหม่',
  IDEMPOTENCY_CONFLICT: 'รหัสคำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว',
  UNKNOWN: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่',
}

export function normalizeStudentCode(code: string): string | null {
  if (typeof code !== 'string') return null
  const normalized = code.trim()
  return normalized.length > 0 ? normalized : null
}

export async function runAdminAction<TContext extends { isAdmin: boolean }, TResult>(
  loadContext: () => Promise<TContext>,
  action: (context: TContext) => Promise<CoinActionResult<TResult>>
): Promise<CoinActionResult<TResult>> {
  const context = await loadContext()
  if (!context.isAdmin) return { ok: false, code: 'ADMIN_REQUIRED', message: COIN_ERROR_MESSAGES.ADMIN_REQUIRED }
  return action(context)
}

export function validateDeduction(input: {
  amount: number
  expectedBalance: number
  requestId: string
}): CoinActionErrorCode | null {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return 'INVALID_AMOUNT'
  if (!Number.isSafeInteger(input.expectedBalance) || input.expectedBalance < 0) {
    return 'INVALID_AMOUNT'
  }
  if (input.amount > input.expectedBalance) return 'INSUFFICIENT_COINS'
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    return 'IDEMPOTENCY_CONFLICT'
  }
  return null
}

export function serverErrorCode(message: string): CoinActionErrorCode {
  const upper = message.toUpperCase()
  const stableCodes: CoinActionErrorCode[] = [
    'ADMIN_REQUIRED',
    'STUDENT_NOT_FOUND',
    'INSUFFICIENT_COINS',
    'BALANCE_CHANGED',
    'IDEMPOTENCY_CONFLICT',
  ]
  return stableCodes.find((code) => upper.includes(code)) ?? 'UNKNOWN'
}

export function serverErrorCodeFrom(error: unknown): CoinActionErrorCode {
  if (typeof error === 'string') return serverErrorCode(error)
  if (error && typeof error === 'object') {
    const fields = error as { message?: unknown; details?: unknown; hint?: unknown }
    return serverErrorCode([fields.message, fields.details, fields.hint]
      .filter((value): value is string => typeof value === 'string')
      .join(' '))
  }
  return 'UNKNOWN'
}

export function parseDeductionResult(data: unknown): DeductionResult | null {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  const result = row as { balance?: unknown; ledger_id?: unknown; replayed?: unknown }
  if (
    typeof result.balance !== 'number' ||
    !Number.isSafeInteger(result.balance) ||
    typeof result.ledger_id !== 'string' ||
    typeof result.replayed !== 'boolean'
  ) return null
  return { balance: result.balance, ledgerId: result.ledger_id, replayed: result.replayed }
}
