import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const client = vi.hoisted(() => ({
  configured: true,
  rpc: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
}))
const walletState = vi.hoisted(() => ({
  hydrateCoins: vi.fn(),
  hydrateOwnedItems: vi.fn(),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    },
  },
}))

vi.mock('../client', () => ({
  get isSupabaseConfigured() {
    return client.configured
  },
  supabase: {
    rpc: client.rpc,
    auth: { getSession: client.getSession },
    from: client.from,
  },
}))

vi.mock('@/stores/petStore', () => ({
  usePetStore: { getState: () => ({ hydrateCoins: walletState.hydrateCoins }) },
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: { getState: () => ({ hydrateOwnedItems: walletState.hydrateOwnedItems }) },
}))

import {
  WalletError,
  cancelFocusRewardSession,
  claimStudentReward,
  createPendingReward,
  ensureDailyQuestAssignments,
  enqueueReward,
  fetchWallet,
  flushPendingRewards,
  issueRewardChallenge,
  purchaseItem,
  recordLocalVerificationAttempt,
  refreshWalletAndInventory,
  startFocusRewardSession,
} from '../wallet'
import type { PendingReward } from '../pendingRewards'

const pendingReward = (rewardType: PendingReward['rewardType'] = 'focus'): PendingReward => ({
  requestId: '10000000-0000-0000-0000-000000000001',
  studentId: 'student-a',
  rewardType,
  sourceId: '20000000-0000-0000-0000-000000000001',
  sourceDate: '2026-09-25',
  createdAt: '2026-09-25T08:00:00.000Z',
})

beforeEach(() => {
  storage.clear()
  client.configured = true
  client.rpc.mockReset()
  client.getSession.mockReset()
  client.from.mockReset()
  walletState.hydrateCoins.mockReset()
  walletState.hydrateOwnedItems.mockReset()
  client.getSession.mockResolvedValue({
    data: { session: { user: { id: 'student-a' } } },
  })
})

describe('wallet client', () => {
  it.each([
    ['focus', 'record_focus_completion'],
    ['chore', 'record_chore_completion'],
    ['outdoor', 'record_outdoor_completion'],
  ] as const)('claims a %s reward through its server challenge RPC', async (rewardType, rpcName) => {
    client.rpc.mockResolvedValue({
      data: [{ balance: 50, ledger_id: 'ledger-1', replayed: false }],
      error: null,
    })

    const result = await claimStudentReward(pendingReward(rewardType))

    expect(result).toEqual({ confirmedBalance: 50, ledgerId: 'ledger-1', replayed: false })
    expect(client.rpc).toHaveBeenCalledWith(rpcName, {
      p_request_id: '10000000-0000-0000-0000-000000000001',
      p_challenge_nonce: '20000000-0000-0000-0000-000000000001',
    })
  })

  it('returns a replay without creating a second local outcome', async () => {
    client.rpc.mockResolvedValue({
      data: { balance: 50, ledger_id: 'ledger-1', replayed: true },
      error: null,
    })

    await expect(claimStudentReward(pendingReward())).resolves.toEqual({
      confirmedBalance: 50,
      ledgerId: 'ledger-1',
      replayed: true,
    })
  })

  it('reports OFFLINE before attempting an RPC when Supabase is unavailable', async () => {
    client.configured = false

    await expect(claimStudentReward(pendingReward())).rejects.toMatchObject({
      code: 'OFFLINE',
    })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['INSUFFICIENT_COINS', 'INSUFFICIENT_COINS'],
    ['BALANCE_CHANGED', 'BALANCE_CHANGED'],
    ['ALREADY_OWNED', 'ALREADY_OWNED'],
    ['IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_CONFLICT'],
    ['FOCUS_SESSION_ACTIVE', 'FOCUS_SESSION_ACTIVE'],
    ['Failed to fetch', 'OFFLINE'],
    ['unexpected database error', 'UNKNOWN'],
  ] as const)('maps %s to the stable %s code', async (message, code) => {
    client.rpc.mockResolvedValue({ data: null, error: { message } })

    const error = await claimStudentReward(pendingReward()).catch((caught) => caught)

    expect(error).toBeInstanceOf(WalletError)
    expect(error).toMatchObject({ code })
  })

  it('fetches the confirmed balance and counts only this student pending rewards', async () => {
    await enqueueReward(pendingReward())
    await enqueueReward({ ...pendingReward('chore'), requestId: 'request-b', studentId: 'student-b' })
    client.rpc.mockResolvedValue({ data: [{ balance: 30 }], error: null })

    await expect(fetchWallet()).resolves.toEqual({ confirmedBalance: 30, pendingCount: 1 })
  })

  it('flushes a queued challenge and returns the server-confirmed balance', async () => {
    await enqueueReward(pendingReward())
    client.rpc.mockResolvedValue({
      data: [{ balance: 50, ledger_id: 'ledger-1', replayed: false }],
      error: null,
    })

    await expect(flushPendingRewards('student-a')).resolves.toEqual({
      confirmedBalance: 50,
      remaining: 0,
    })
  })

  it('starts and cancels an idempotent focus reward source', async () => {
    client.rpc
      .mockResolvedValueOnce({ data: 'focus-source', error: null })
      .mockResolvedValueOnce({ data: 'focus-source', error: null })

    await expect(startFocusRewardSession('focus-source', 30)).resolves.toBeUndefined()
    await expect(cancelFocusRewardSession('focus-source')).resolves.toBeUndefined()

    expect(client.rpc).toHaveBeenNthCalledWith(1, 'start_focus_reward_session', {
      p_source_id: 'focus-source',
      p_duration_minutes: 30,
    })
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'cancel_focus_reward_session', {
      p_source_id: 'focus-source',
    })
  })

  it('records local verification before issuing a challenge', async () => {
    client.rpc
      .mockResolvedValueOnce({ data: 'attempt-1', error: null })
      .mockResolvedValueOnce({
        data: [{ nonce: 'challenge-1', expires_at: '2026-09-25T08:10:00.000Z', replayed: false }],
        error: null,
      })

    await recordLocalVerificationAttempt('attempt-1', 'chore', 'chore_sweep')
    await expect(issueRewardChallenge('chore', 'attempt-1')).resolves.toEqual({
      nonce: 'challenge-1',
      expiresAt: '2026-09-25T08:10:00.000Z',
      replayed: false,
    })
  })

  it('creates a stable queued shape for the authenticated challenge owner', async () => {
    await expect(
      createPendingReward({
        requestId: 'request-1',
        rewardType: 'focus',
        challengeNonce: 'challenge-1',
        sourceDate: '2026-09-25',
        createdAt: '2026-09-25T08:00:00.000Z',
      })
    ).resolves.toEqual({
      requestId: 'request-1',
      studentId: 'student-a',
      rewardType: 'focus',
      sourceId: 'challenge-1',
      sourceDate: '2026-09-25',
      createdAt: '2026-09-25T08:00:00.000Z',
    })
  })

  it('loads server-owned daily quest assignments', async () => {
    client.rpc.mockResolvedValue({
      data: [
        { reward_type: 'chore', quest_id: 'chore_sweep', source_date: '2026-09-25', position: 1 },
        { reward_type: 'outdoor', quest_id: 'outdoor_walk', source_date: '2026-09-25', position: 1 },
      ],
      error: null,
    })

    await expect(ensureDailyQuestAssignments()).resolves.toEqual([
      { rewardType: 'chore', questId: 'chore_sweep', sourceDate: '2026-09-25', position: 1 },
      { rewardType: 'outdoor', questId: 'outdoor_walk', sourceDate: '2026-09-25', position: 1 },
    ])
  })

  it('refreshes confirmed balance and authoritative inventory together', async () => {
    client.rpc.mockResolvedValue({ data: [{ balance: 70 }], error: null })
    client.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ item_id: 'hat_straw' }, { item_id: 'bg_sky' }],
        error: null,
      }),
    })

    await refreshWalletAndInventory()

    expect(walletState.hydrateCoins).toHaveBeenCalledWith(70)
    expect(walletState.hydrateOwnedItems).toHaveBeenCalledWith(['hat_straw', 'bg_sky'])
  })

  it('hydrates wallet and inventory after a successful purchase', async () => {
    client.rpc
      .mockResolvedValueOnce({
        data: [{ balance: 40, ledger_id: 'ledger-1', replayed: false }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ balance: 40 }], error: null })
    client.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ item_id: 'hat_straw' }], error: null }),
    })

    await purchaseItem('hat_straw', 1, 'request-1')

    expect(client.rpc).toHaveBeenNthCalledWith(1, 'purchase_shop_item', {
      p_item_id: 'hat_straw',
      p_catalog_version: 1,
      p_request_id: 'request-1',
    })
    expect(walletState.hydrateCoins).toHaveBeenCalledWith(40)
    expect(walletState.hydrateOwnedItems).toHaveBeenCalledWith(['hat_straw'])
  })

  it('preserves local ownership when the server rejects insufficient coins', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'INSUFFICIENT_COINS' } })

    await expect(purchaseItem('hat_straw', 1, 'request-1')).rejects.toMatchObject({
      code: 'INSUFFICIENT_COINS',
    })
    expect(walletState.hydrateCoins).not.toHaveBeenCalled()
    expect(walletState.hydrateOwnedItems).not.toHaveBeenCalled()
  })

  it('hydrates one authoritative item when a purchase request is replayed', async () => {
    client.rpc
      .mockResolvedValueOnce({
        data: [{ balance: 40, ledger_id: 'ledger-1', replayed: true }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ balance: 40 }], error: null })
    client.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ item_id: 'hat_straw' }], error: null }),
    })

    await purchaseItem('hat_straw', 1, 'request-1')

    expect(walletState.hydrateOwnedItems).toHaveBeenCalledWith(['hat_straw'])
  })

  it('uses the caller request id unchanged when retrying a timeout', async () => {
    client.rpc.mockRejectedValue(new Error('Failed to fetch'))

    await expect(purchaseItem('hat_straw', 1, 'request-stable')).rejects.toMatchObject({
      code: 'OFFLINE',
    })
    await expect(purchaseItem('hat_straw', 1, 'request-stable')).rejects.toMatchObject({
      code: 'OFFLINE',
    })
    expect(client.rpc).toHaveBeenNthCalledWith(1, 'purchase_shop_item', {
      p_item_id: 'hat_straw',
      p_catalog_version: 1,
      p_request_id: 'request-stable',
    })
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'purchase_shop_item', {
      p_item_id: 'hat_straw',
      p_catalog_version: 1,
      p_request_id: 'request-stable',
    })
  })
})
