import { isSupabaseConfigured, supabase } from './client'
import {
  enqueuePendingReward,
  flushPendingRewardQueue,
  listPendingRewards,
  type PendingReward,
} from './pendingRewards'
import { usePetStore } from '@/stores/petStore'
import { useUserStore } from '@/stores/userStore'

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

async function runWalletRpc(name: string, parameters: Record<string, unknown>): Promise<unknown> {
  requireConfigured()
  try {
    const { data, error } = await supabase.rpc(name, parameters)
    if (error) throw error
    return data
  } catch (error) {
    throw toWalletError(error)
  }
}

export async function startFocusRewardSession(
  sourceId: string,
  durationMinutes: number
): Promise<void> {
  await runWalletRpc('start_focus_reward_session', {
    p_source_id: sourceId,
    p_duration_minutes: durationMinutes,
  })
}

export async function cancelFocusRewardSession(sourceId: string): Promise<void> {
  await runWalletRpc('cancel_focus_reward_session', { p_source_id: sourceId })
}

export async function recordLocalVerificationAttempt(
  attemptId: string,
  rewardType: 'chore' | 'outdoor',
  questId: string
): Promise<void> {
  await runWalletRpc('record_local_verification_attempt', {
    p_attempt_id: attemptId,
    p_reward_type: rewardType,
    p_quest_id: questId,
  })
}

export type DailyQuestAssignment = {
  rewardType: 'chore' | 'outdoor'
  questId: string
  sourceDate: string
  position: number
}

export async function ensureDailyQuestAssignments(): Promise<DailyQuestAssignment[]> {
  const data = await runWalletRpc('ensure_daily_quest_assignments', {})
  if (!Array.isArray(data)) {
    throw new WalletError('UNKNOWN', 'INVALID_QUEST_ASSIGNMENTS_RESPONSE')
  }

  return data.map((value) => {
    const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
    if (
      !row ||
      (row.reward_type !== 'chore' && row.reward_type !== 'outdoor') ||
      typeof row.quest_id !== 'string' ||
      typeof row.source_date !== 'string' ||
      typeof row.position !== 'number' ||
      !Number.isInteger(row.position)
    ) {
      throw new WalletError('UNKNOWN', 'INVALID_QUEST_ASSIGNMENTS_RESPONSE')
    }

    return {
      rewardType: row.reward_type,
      questId: row.quest_id,
      sourceDate: row.source_date,
      position: row.position,
    }
  })
}

export async function issueRewardChallenge(
  rewardType: PendingReward['rewardType'],
  sourceId: string
): Promise<{ nonce: string; expiresAt: string; replayed: boolean }> {
  const data = await runWalletRpc('issue_reward_challenge', {
    p_reward_type: rewardType,
    p_source_id: sourceId,
  })
  const row = firstRow(data)
  if (
    !row ||
    typeof row.nonce !== 'string' ||
    typeof row.expires_at !== 'string' ||
    typeof row.replayed !== 'boolean'
  ) {
    throw new WalletError('UNKNOWN', 'INVALID_CHALLENGE_RESPONSE')
  }
  return { nonce: row.nonce, expiresAt: row.expires_at, replayed: row.replayed }
}

export async function createPendingReward(input: {
  requestId: string
  rewardType: PendingReward['rewardType']
  challengeNonce: string
  sourceDate: string
  createdAt: string
}): Promise<PendingReward> {
  requireConfigured()
  const { data } = await supabase.auth.getSession()
  const studentId = data.session?.user.id
  if (!studentId) throw new WalletError('UNKNOWN', 'NOT_AUTHENTICATED')
  return {
    requestId: input.requestId,
    studentId,
    rewardType: input.rewardType,
    sourceId: input.challengeNonce,
    sourceDate: input.sourceDate,
    createdAt: input.createdAt,
  }
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

export async function refreshWalletAndInventory(): Promise<void> {
  requireConfigured()
  try {
    const [wallet, inventoryResult] = await Promise.all([
      fetchWallet(),
      supabase.from('student_inventory').select('item_id'),
    ])
    if (inventoryResult.error) throw inventoryResult.error
    if (!Array.isArray(inventoryResult.data)) {
      throw new WalletError('UNKNOWN', 'INVALID_INVENTORY_RESPONSE')
    }
    const ownedItems = inventoryResult.data.map((value) => {
      const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
      if (!row || typeof row.item_id !== 'string') {
        throw new WalletError('UNKNOWN', 'INVALID_INVENTORY_RESPONSE')
      }
      return row.item_id
    })

    usePetStore.getState().hydrateCoins(wallet.confirmedBalance)
    useUserStore.getState().hydrateOwnedItems(ownedItems)
  } catch (error) {
    throw toWalletError(error)
  }
}

export async function purchaseItem(
  itemId: string,
  catalogVersion: number,
  requestId: string
): Promise<void> {
  const data = await runWalletRpc('purchase_shop_item', {
    p_item_id: itemId,
    p_catalog_version: catalogVersion,
    p_request_id: requestId,
  })
  const row = firstRow(data)
  if (
    !row ||
    typeof row.balance !== 'number' ||
    typeof row.ledger_id !== 'string' ||
    typeof row.replayed !== 'boolean'
  ) {
    throw new WalletError('UNKNOWN', 'INVALID_PURCHASE_RESPONSE')
  }
  await refreshWalletAndInventory()
}

export async function importLegacyInventory(
  itemIds: string[],
  requestId: string
): Promise<void> {
  const data = await runWalletRpc('import_legacy_inventory', {
    p_item_ids: itemIds,
    p_request_id: requestId,
  })
  const row = firstRow(data)
  if (
    !row ||
    typeof row.balance !== 'number' ||
    typeof row.ledger_id !== 'string' ||
    typeof row.replayed !== 'boolean'
  ) {
    throw new WalletError('UNKNOWN', 'INVALID_LEGACY_IMPORT_RESPONSE')
  }
  await refreshWalletAndInventory()
}

export type { PendingReward } from './pendingRewards'
