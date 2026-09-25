import { isSupabaseConfigured, supabase } from './client'
import {
  enqueuePendingReward,
  flushPendingRewardQueue,
  listPendingRewards,
  type PendingReward,
} from './pendingRewards'

export type WalletErrorCode =
  | 'ADMIN_REQUIRED'
  | 'STUDENT_NOT_FOUND'
  | 'INSUFFICIENT_COINS'
  | 'BALANCE_CHANGED'
  | 'ALREADY_OWNED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'FOCUS_SESSION_ACTIVE'
  | 'OFFLINE'
  | 'UNKNOWN'

export class WalletError extends Error {
  constructor(
    public readonly code: WalletErrorCode,
    message?: string
  ) {
    super(message ?? code)
    this.name = 'WalletError'
  }
}

export type WalletClaimResult = {
  confirmedBalance: number
  ledgerId: string
  replayed: boolean
}

const STABLE_SERVER_CODES: WalletErrorCode[] = [
  'ADMIN_REQUIRED',
  'STUDENT_NOT_FOUND',
  'INSUFFICIENT_COINS',
  'BALANCE_CHANGED',
  'ALREADY_OWNED',
  'IDEMPOTENCY_CONFLICT',
  'FOCUS_SESSION_ACTIVE',
]

function firstRow(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : null
}

function toWalletError(error: unknown): WalletError {
  if (error instanceof WalletError) return error
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : error instanceof Error
        ? error.message
        : String(error ?? '')
  const upper = message.toUpperCase()
  const stableCode = STABLE_SERVER_CODES.find((code) => upper.includes(code))
  if (stableCode) return new WalletError(stableCode, message)
  if (
    upper.includes('NETWORK') ||
    upper.includes('FAILED TO FETCH') ||
    upper.includes('FETCH FAILED')
  ) {
    return new WalletError('OFFLINE', message)
  }
  return new WalletError('UNKNOWN', message)
}

function requireConfigured(): void {
  if (!isSupabaseConfigured) throw new WalletError('OFFLINE')
}

export async function claimStudentReward(reward: PendingReward): Promise<WalletClaimResult> {
  requireConfigured()
  const rpcName = {
    focus: 'record_focus_completion',
    chore: 'record_chore_completion',
    outdoor: 'record_outdoor_completion',
  }[reward.rewardType]

  try {
    const { data, error } = await supabase.rpc(rpcName, {
      p_request_id: reward.requestId,
      p_challenge_nonce: reward.sourceId,
    })
    if (error) throw error

    const row = firstRow(data)
    if (
      !row ||
      typeof row.balance !== 'number' ||
      typeof row.ledger_id !== 'string' ||
      typeof row.replayed !== 'boolean'
    ) {
      throw new WalletError('UNKNOWN', 'INVALID_WALLET_RESPONSE')
    }

    return {
      confirmedBalance: row.balance,
      ledgerId: row.ledger_id,
      replayed: row.replayed,
    }
  } catch (error) {
    throw toWalletError(error)
  }
}

export function enqueueReward(reward: PendingReward): Promise<void> {
  return enqueuePendingReward(reward)
}

export async function fetchWallet(): Promise<{
  confirmedBalance: number
  pendingCount: number
}> {
  requireConfigured()
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const studentId = sessionData.session?.user.id
    if (!studentId) throw new WalletError('UNKNOWN', 'NOT_AUTHENTICATED')

    const { data, error } = await supabase.rpc('get_my_wallet')
    if (error) throw error
    const row = firstRow(data)
    if (!row || typeof row.balance !== 'number') {
      throw new WalletError('UNKNOWN', 'INVALID_WALLET_RESPONSE')
    }

    return {
      confirmedBalance: row.balance,
      pendingCount: (await listPendingRewards(studentId)).length,
    }
  } catch (error) {
    throw toWalletError(error)
  }
}

export async function flushPendingRewards(studentId: string): Promise<{
  confirmedBalance: number
  remaining: number
}> {
  requireConfigured()
  const result = await flushPendingRewardQueue(studentId, async (reward) => {
    const claim = await claimStudentReward(reward)
    return { confirmedBalance: claim.confirmedBalance, replayed: claim.replayed }
  })
  if (result.confirmedBalance !== null) {
    return { confirmedBalance: result.confirmedBalance, remaining: result.remaining }
  }

  const wallet = await fetchWallet()
  return { confirmedBalance: wallet.confirmedBalance, remaining: result.remaining }
}

export type { PendingReward } from './pendingRewards'
