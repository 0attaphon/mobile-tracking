import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const dependencies = vi.hoisted(() => ({
  randomUUID: vi.fn(),
  getNetworkStateAsync: vi.fn(),
  purchaseItem: vi.fn(),
  refreshWalletAndInventory: vi.fn(),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: async (key: string) => {
      storage.delete(key)
    },
  },
}))
vi.mock('expo-crypto', () => ({ randomUUID: dependencies.randomUUID }))
vi.mock('expo-network', () => ({ getNetworkStateAsync: dependencies.getNetworkStateAsync }))
vi.mock('@/services/supabase/wallet', () => ({
  purchaseItem: dependencies.purchaseItem,
  refreshWalletAndInventory: dependencies.refreshWalletAndInventory,
}))

import { usePurchaseStore } from '../purchaseStore'

beforeEach(() => {
  storage.clear()
  Object.values(dependencies).forEach((mock) => mock.mockReset())
  dependencies.randomUUID.mockReturnValue('purchase-request-1')
  dependencies.getNetworkStateAsync.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  })
  dependencies.purchaseItem.mockResolvedValue(undefined)
  dependencies.refreshWalletAndInventory.mockResolvedValue(undefined)
  usePurchaseStore.setState({ isSubmitting: false, pendingPurchase: null, lastError: null })
})

describe('transactional purchase state', () => {
  it('rejects offline before creating or sending a purchase', async () => {
    dependencies.getNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    })

    await expect(
      usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    ).resolves.toBe(false)

    expect(dependencies.purchaseItem).not.toHaveBeenCalled()
    expect(dependencies.randomUUID).not.toHaveBeenCalled()
    expect(usePurchaseStore.getState().lastError).toBe('OFFLINE')
  })

  it('disables duplicate submission while one request is in flight', async () => {
    let release!: () => void
    dependencies.purchaseItem.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve })
    )

    const first = usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    await vi.waitFor(() => expect(usePurchaseStore.getState().isSubmitting).toBe(true))
    const second = await usePurchaseStore
      .getState()
      .submitPurchase('student-a', 'hat_straw', 1)

    expect(second).toBe(false)
    expect(dependencies.purchaseItem).toHaveBeenCalledOnce()
    release()
    await first
  })

  it('clears a definitive insufficient-balance request without changing inventory', async () => {
    dependencies.purchaseItem.mockRejectedValue(
      Object.assign(new Error('INSUFFICIENT_COINS'), { code: 'INSUFFICIENT_COINS' })
    )

    await usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)

    expect(usePurchaseStore.getState()).toMatchObject({
      pendingPurchase: null,
      lastError: 'INSUFFICIENT_COINS',
    })
    expect(storage.size).toBe(0)
  })

  it('retains and reuses the persisted UUID after a timeout', async () => {
    dependencies.purchaseItem
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'OFFLINE' }))
      .mockResolvedValueOnce(undefined)

    await usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    await usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)

    expect(dependencies.purchaseItem).toHaveBeenNthCalledWith(
      1,
      'hat_straw',
      1,
      'purchase-request-1'
    )
    expect(dependencies.purchaseItem).toHaveBeenNthCalledWith(
      2,
      'hat_straw',
      1,
      'purchase-request-1'
    )
    expect(dependencies.randomUUID).toHaveBeenCalledOnce()
  })

  it('refreshes the authoritative shop snapshot on focus', async () => {
    await usePurchaseStore.getState().refreshShop()

    expect(dependencies.refreshWalletAndInventory).toHaveBeenCalledOnce()
  })

  it('reuses the persisted request after a process restart and successful replay', async () => {
    dependencies.purchaseItem.mockRejectedValueOnce(
      Object.assign(new Error('timeout'), { code: 'OFFLINE' })
    )
    await usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)

    // Simulate losing in-memory state after the server may have committed.
    usePurchaseStore.setState({ pendingPurchase: null, lastError: null })
    await usePurchaseStore.getState().restorePendingPurchase('student-a')
    dependencies.purchaseItem.mockResolvedValueOnce(undefined)

    await expect(
      usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    ).resolves.toBe(true)

    expect(dependencies.purchaseItem).toHaveBeenNthCalledWith(
      2, 'hat_straw', 1, 'purchase-request-1'
    )
    expect(dependencies.randomUUID).toHaveBeenCalledOnce()
    expect(storage.size).toBe(0)
    expect(usePurchaseStore.getState()).toMatchObject({
      pendingPurchase: null, isSubmitting: false, lastError: null,
    })
  })
})
