import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const dependencies = vi.hoisted(() => ({
  randomUUID: vi.fn(),
  getNetworkStateAsync: vi.fn(),
  purchaseItem: vi.fn(),
  refreshWalletAndInventory: vi.fn(),
  fetchShopCatalog: vi.fn(),
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
  fetchShopCatalog: dependencies.fetchShopCatalog,
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
  dependencies.fetchShopCatalog.mockResolvedValue({ version: 2, prices: { hat_straw: 75 } })
  usePurchaseStore.setState({
    isSubmitting: false, pendingPurchase: null, lastError: null, catalog: null,
  })
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
    await vi.waitFor(() => expect(dependencies.purchaseItem).toHaveBeenCalledOnce())
    expect(usePurchaseStore.getState().isSubmitting).toBe(true)
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

  it('replays a retained request at its own version, then retries fresh when that version is retired', async () => {
    const unavailable = () =>
      Object.assign(new Error('CATALOG_ITEM_UNAVAILABLE'), { code: 'CATALOG_ITEM_UNAVAILABLE' })
    dependencies.randomUUID
      .mockReturnValueOnce('purchase-request-1')
      .mockReturnValueOnce('purchase-request-2')
    dependencies.purchaseItem
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'OFFLINE' }))
      .mockRejectedValueOnce(unavailable())
      .mockResolvedValueOnce(undefined)

    await usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    await expect(
      usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 2)
    ).resolves.toBe(true)

    expect(dependencies.purchaseItem).toHaveBeenNthCalledWith(2, 'hat_straw', 1, 'purchase-request-1')
    expect(dependencies.purchaseItem).toHaveBeenNthCalledWith(3, 'hat_straw', 2, 'purchase-request-2')
    expect(storage.size).toBe(0)
    expect(usePurchaseStore.getState()).toMatchObject({ pendingPurchase: null, lastError: null })
  })

  it('completes a retained request that committed under an older version', async () => {
    dependencies.purchaseItem
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'OFFLINE' }))
      .mockResolvedValueOnce(undefined)

    await usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    await expect(
      usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 2)
    ).resolves.toBe(true)

    expect(dependencies.purchaseItem).toHaveBeenCalledTimes(2)
    expect(dependencies.purchaseItem).toHaveBeenNthCalledWith(2, 'hat_straw', 1, 'purchase-request-1')
    expect(storage.size).toBe(0)
  })

  it('clears a request for an item the active catalog no longer sells', async () => {
    dependencies.purchaseItem.mockRejectedValue(
      Object.assign(new Error('CATALOG_ITEM_UNAVAILABLE'), { code: 'CATALOG_ITEM_UNAVAILABLE' })
    )

    await expect(
      usePurchaseStore.getState().submitPurchase('student-a', 'hat_straw', 1)
    ).resolves.toBe(false)

    expect(dependencies.purchaseItem).toHaveBeenCalledOnce()
    expect(storage.size).toBe(0)
    expect(usePurchaseStore.getState()).toMatchObject({
      pendingPurchase: null, lastError: 'CATALOG_ITEM_UNAVAILABLE',
    })
  })

  it('refreshes the authoritative shop snapshot on focus', async () => {
    await usePurchaseStore.getState().refreshShop()

    expect(dependencies.refreshWalletAndInventory).toHaveBeenCalledOnce()
    expect(usePurchaseStore.getState().catalog).toEqual({
      version: 2, prices: { hat_straw: 75 },
    })
  })

  it('keeps the last catalog when a catalog refresh fails', async () => {
    usePurchaseStore.setState({ catalog: { version: 1, prices: { hat_straw: 60 } } })
    dependencies.fetchShopCatalog.mockRejectedValueOnce(new Error('Failed to fetch'))

    await expect(usePurchaseStore.getState().refreshShop()).rejects.toThrow()

    expect(dependencies.refreshWalletAndInventory).toHaveBeenCalledOnce()
    expect(usePurchaseStore.getState().catalog).toEqual({
      version: 1, prices: { hat_straw: 60 },
    })
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
