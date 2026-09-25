import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const client = vi.hoisted(() => ({
  configured: true,
  rpc: vi.fn(),
  getSession: vi.fn(),
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
  },
}))

import {
  WalletError,
  claimStudentReward,
  enqueueReward,
  fetchWallet,
  flushPendingRewards,
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
})
