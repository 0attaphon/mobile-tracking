'use server'

import { requireAdmin } from '@/lib/supabase/server'
import {
  COIN_ERROR_MESSAGES,
  normalizeStudentCode,
  parseDeductionResult,
  runAdminAction,
  serverErrorCodeFrom,
  validateDeduction,
  type CoinActionErrorCode,
  type CoinActionResult,
  type DeductionResult,
} from './validation'

export type StudentCoinSummary = {
  id: string
  code: string
  nickname: string | null
  className: string | null
  balance: number
  walletVersion: number
}

export type CoinDeductionHistoryItem = {
  id: string
  requestId: string
  delta: number
  balanceBefore: number
  balanceAfter: number
  createdAt: string
}

export type { DeductionResult } from './validation'

function failure<T>(code: CoinActionErrorCode): CoinActionResult<T> {
  return { ok: false, code, message: COIN_ERROR_MESSAGES[code] }
}

export async function lookupStudentByCode(
  code: string
): Promise<CoinActionResult<StudentCoinSummary>> {
  return runAdminAction(requireAdmin, async ({ supabase }) => {
    const normalized = normalizeStudentCode(code)
    if (!normalized) return failure('INVALID_STUDENT_CODE')

    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, nickname, class_name, coins')
      .eq('student_id', normalized)
      .maybeSingle()

    if (error) return failure(serverErrorCodeFrom(error))
    if (!data) return failure('STUDENT_NOT_FOUND')

    const { count, error: versionError } = await supabase
      .from('coin_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', data.id)
    if (versionError) return failure(serverErrorCodeFrom(versionError))
    if (count === null) return failure('UNKNOWN')

    return {
      ok: true,
      data: {
        id: data.id,
        code: data.student_id,
        nickname: data.nickname,
        className: data.class_name,
        balance: data.coins,
        walletVersion: count,
      },
    }
  })
}

export async function deductCoins(input: {
  studentCode: string
  amount: number
  requestId: string
  expectedBalance: number
  expectedWalletVersion: number
}): Promise<CoinActionResult<DeductionResult>> {
  return runAdminAction(requireAdmin, async ({ supabase }) => {
    const studentCode = normalizeStudentCode(input.studentCode)
    if (!studentCode) return failure('INVALID_STUDENT_CODE')
    const validationError = validateDeduction(input)
    if (validationError) return failure(validationError)

    const { data, error } = await supabase.rpc('admin_deduct_student_coins_v2', {
      p_student_code: studentCode,
      p_amount: input.amount,
      p_request_id: input.requestId,
      p_expected_balance: input.expectedBalance,
      p_expected_wallet_version: input.expectedWalletVersion,
    })
    if (error) return failure(serverErrorCodeFrom(error))

    const result = parseDeductionResult(data)
    if (!result) return failure('UNKNOWN')
    return {
      ok: true,
      data: result,
    }
  })
}

export async function getStudentDeductionHistory(
  studentCode: string
): Promise<CoinActionResult<CoinDeductionHistoryItem[]>> {
  return runAdminAction(requireAdmin, async ({ supabase }) => {
    const normalized = normalizeStudentCode(studentCode)
    if (!normalized) return failure('INVALID_STUDENT_CODE')

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', normalized)
      .maybeSingle()
    if (studentError) return failure(serverErrorCodeFrom(studentError))
    if (!student) return failure('STUDENT_NOT_FOUND')

    const { data, error } = await supabase
      .from('coin_ledger')
      .select('id, request_id, delta, balance_before, balance_after, created_at')
      .eq('student_id', student.id)
      .eq('transaction_type', 'admin_deduction')
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return failure(serverErrorCodeFrom(error))

    return {
      ok: true,
      data: (data ?? []).map((item) => ({
        id: item.id,
        requestId: item.request_id,
        delta: item.delta,
        balanceBefore: item.balance_before,
        balanceAfter: item.balance_after,
        createdAt: item.created_at,
      })),
    }
  })
}
