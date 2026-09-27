import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const wallet = vi.hoisted(() => ({
  enqueueReward: vi.fn(),
  fetchWallet: vi.fn(),
  flushPendingRewards: vi.fn(),
  listPendingRewards: vi.fn(),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    },
  },
}))

vi.mock('@/services/supabase/wallet', () => ({
  enqueueReward: wallet.enqueueReward,
  fetchWallet: wallet.fetchWallet,
  flushPendingRewards: wallet.flushPendingRewards,
}))

vi.mock('@/services/supabase/pendingRewards', () => ({
  listPendingRewards: wallet.listPendingRewards,
}))

vi.mock('@/services/supabase/sync', () => ({
  syncCoinDelta: vi.fn(),
}))

import { usePetStore } from '../petStore'
import type { PendingReward } from '@/services/supabase/pendingRewards'

const pendingReward: PendingReward = {
  requestId: '10000000-0000-0000-0000-000000000001',
  studentId: 'student-a',
  rewardType: 'focus',
  sourceId: '20000000-0000-0000-0000-000000000001',
  sourceDate: '2026-09-25',
  createdAt: '2026-09-25T08:00:00.000Z',
}

beforeEach(() => {
  storage.clear()
  wallet.enqueueReward.mockReset().mockResolvedValue(undefined)
  wallet.fetchWallet.mockReset()
  wallet.flushPendingRewards.mockReset()
  wallet.listPendingRewards.mockReset().mockResolvedValue([])
  usePetStore.setState({
    coins: 0,
    confirmedCoins: 0,
    pendingRewardCoins: 0,
    pendingRewardAmounts: {},
    walletMigrationState: 'ready',
    walletRequestVersion: 0,
  })
})

describe('pet wallet state', () => {
  it('keeps confirmed, pending, and display coin balances distinct', async () => {
    usePetStore.getState().hydrateCoins(20)
    await usePetStore.getState().queueReward(pendingReward, 15)

    expect(usePetStore.getState()).toMatchObject({
      confirmedCoins: 20,
      pendingRewardCoins: 15,
      coins: 35,
    })
  })

  it('does not display an optimistic reward until its stable request is queued', async () => {
    let release!: () => void
    wallet.enqueueReward.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve })
    )

    const queuing = usePetStore.getState().queueReward(pendingReward, 15)
    await Promise.resolve()
    expect(usePetStore.getState().pendingRewardCoins).toBe(0)

    release()
    await queuing
    expect(usePetStore.getState().pendingRewardCoins).toBe(15)
  })

  it('uses only confirmed coins when checking a local spend', async () => {
    usePetStore.getState().hydrateCoins(5)
    await usePetStore.getState().queueReward(pendingReward, 100)

    expect(usePetStore.getState().spendCoins(10)).toBe(false)
    expect(usePetStore.getState().confirmedCoins).toBe(5)
    expect(usePetStore.getState().coins).toBe(105)
  })

  it('ignores a wallet refresh that resolves after a newer refresh', async () => {
    let resolveOlder!: (value: { confirmedBalance: number; pendingCount: number }) => void
    wallet.fetchWallet
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveOlder = resolve })
      )
      .mockResolvedValueOnce({ confirmedBalance: 40, pendingCount: 0 })

    const older = usePetStore.getState().refreshWallet()
    const newer = usePetStore.getState().refreshWallet()
    await newer
    resolveOlder({ confirmedBalance: 10, pendingCount: 0 })
    await older

    expect(usePetStore.getState().confirmedCoins).toBe(40)
  })

  it('prunes settled optimistic rewards after a flush', async () => {
    await usePetStore.getState().queueReward(pendingReward, 15)
    wallet.flushPendingRewards.mockResolvedValue({ confirmedBalance: 15, remaining: 0 })
    wallet.listPendingRewards.mockResolvedValue([])

    await usePetStore.getState().flushWalletRewards('student-a')

    expect(usePetStore.getState()).toMatchObject({
      confirmedCoins: 15,
      pendingRewardCoins: 0,
      coins: 15,
    })
  })

  it('removes equipped items and a paid pet that are not server-owned', () => {
    usePetStore.setState({
      activePetId: 'pet_dog',
      species: 'dog',
      equippedItems: ['hat_straw', 'unknown-old-item'],
    })

    usePetStore.getState().retainOwnedSelections(['hat_straw'])

    expect(usePetStore.getState()).toMatchObject({
      activePetId: 'pet_cat',
      species: 'cat',
      equippedItems: ['hat_straw'],
    })
  })
})
