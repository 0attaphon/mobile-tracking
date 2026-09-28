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

    return {
      ok: true,
      data: {
        id: data.id,
        code: data.student_id,
        nickname: data.nickname,
        className: data.class_name,
        balance: data.coins,
      },
    }
  })
}

export async function deductCoins(input: {
  studentCode: string
  amount: number
  requestId: string
  expectedBalance: number
}): Promise<CoinActionResult<DeductionResult>> {
  return runAdminAction(requireAdmin, async ({ supabase }) => {
    const studentCode = normalizeStudentCode(input.studentCode)
    if (!studentCode) return failure('INVALID_STUDENT_CODE')
    const validationError = validateDeduction(input)
    if (validationError) return failure(validationError)

    const { data, error } = await supabase.rpc('admin_deduct_student_coins', {
      p_student_code: studentCode,
      p_amount: input.amount,
      p_request_id: input.requestId,
      p_expected_balance: input.expectedBalance,
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
