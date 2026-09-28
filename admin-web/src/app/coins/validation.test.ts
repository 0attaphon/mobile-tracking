import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COIN_ERROR_MESSAGES,
  normalizeStudentCode,
  parseDeductionResult,
  runAdminAction,
  serverErrorCode,
  serverErrorCodeFrom,
  validateDeduction,
} from './validation.ts'

const requestId = '10000000-0000-4000-8000-000000000001'

test('student codes are trimmed and blank codes are rejected', () => {
  assert.equal(normalizeStudentCode('  STU-001  '), 'STU-001')
  assert.equal(normalizeStudentCode('   '), null)
})

test('deduction amount rejects zero, negative, decimal, unsafe, and excessive values', () => {
  for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validateDeduction({ amount, expectedBalance: 100, requestId }), 'INVALID_AMOUNT')
  }
  assert.equal(
    validateDeduction({ amount: 101, expectedBalance: 100, requestId }),
    'INSUFFICIENT_COINS'
  )
  assert.equal(validateDeduction({ amount: 100, expectedBalance: 100, requestId }), null)
})

test('stale balance, replay conflict, missing student, and admin errors have Thai messages', () => {
  for (const code of [
    'BALANCE_CHANGED',
    'IDEMPOTENCY_CONFLICT',
    'STUDENT_NOT_FOUND',
    'ADMIN_REQUIRED',
  ] as const) {
    assert.equal(serverErrorCode(`rpc failed: ${code}`), code)
    assert.ok(COIN_ERROR_MESSAGES[code].length > 0)
  }
  assert.equal(serverErrorCodeFrom({ message: 'rpc failed', details: 'BALANCE_CHANGED' }), 'BALANCE_CHANGED')
})

test('admin authorization is checked before the protected query/action', async () => {
  let queried = false
  const denied = await runAdminAction(
    async () => ({ isAdmin: false }),
    async () => {
      queried = true
      return { ok: true as const, data: 'unexpected' }
    }
  )
  assert.deepEqual(denied, {
    ok: false,
    code: 'ADMIN_REQUIRED',
    message: COIN_ERROR_MESSAGES.ADMIN_REQUIRED,
  })
  assert.equal(queried, false)

  const allowed = await runAdminAction(
    async () => ({ isAdmin: true }),
    async () => {
      queried = true
      return { ok: false as const, code: 'STUDENT_NOT_FOUND' as const, message: COIN_ERROR_MESSAGES.STUDENT_NOT_FOUND }
    }
  )
  assert.equal(allowed.ok, false)
  assert.equal(queried, true)
})

test('database replay returns the original ledger result and stale balances map to stable errors', () => {
  const replay = parseDeductionResult([
    { balance: 45, ledger_id: 'ledger-original', replayed: true },
  ])
  assert.deepEqual(replay, { balance: 45, ledgerId: 'ledger-original', replayed: true })
  assert.equal(parseDeductionResult({ balance: '45', ledger_id: 'id', replayed: true }), null)
  assert.equal(serverErrorCode('BALANCE_CHANGED'), 'BALANCE_CHANGED')
})
