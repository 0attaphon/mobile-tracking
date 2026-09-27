import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const dependencies = vi.hoisted(() => ({
  randomUUID: vi.fn(),
  importLegacyInventory: vi.fn(),
  refreshWalletAndInventory: vi.fn(),
  retainOwnedSelections: vi.fn(),
  ownedItems: [] as string[],
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    },
  },
}))

vi.mock('expo-crypto', () => ({ randomUUID: dependencies.randomUUID }))
vi.mock('@/types/shop', () => ({
  SHOP_ITEMS: [{ id: 'hat_straw' }, { id: 'bg_sky' }],
}))
vi.mock('../wallet', () => ({
  importLegacyInventory: dependencies.importLegacyInventory,
  refreshWalletAndInventory: dependencies.refreshWalletAndInventory,
}))
vi.mock('@/stores/userStore', () => ({
  useUserStore: { getState: () => ({ ownedItems: dependencies.ownedItems }) },
}))
vi.mock('@/stores/petStore', () => ({
  usePetStore: {
    getState: () => ({ retainOwnedSelections: dependencies.retainOwnedSelections }),
  },
}))

import { migrateLegacyInventory } from '../legacyInventory'

beforeEach(() => {
  storage.clear()
  dependencies.randomUUID.mockReset().mockReturnValue('migration-request-1')
  dependencies.importLegacyInventory.mockReset().mockResolvedValue(undefined)
  dependencies.refreshWalletAndInventory.mockReset().mockResolvedValue(undefined)
  dependencies.retainOwnedSelections.mockReset()
  dependencies.ownedItems = ['hat_straw']
})

describe('legacy inventory migration', () => {
  it('persists one per-student request id before RPC and reuses it after failure', async () => {
    dependencies.importLegacyInventory
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)

    await expect(
      migrateLegacyInventory('student-a', ['hat_straw'])
    ).rejects.toThrow('offline')
    await migrateLegacyInventory('student-a', ['hat_straw'])

    expect(dependencies.importLegacyInventory).toHaveBeenNthCalledWith(
      1,
      ['hat_straw'],
      'migration-request-1'
    )
    expect(dependencies.importLegacyInventory).toHaveBeenNthCalledWith(
      2,
      ['hat_straw'],
      'migration-request-1'
    )
    expect(dependencies.randomUUID).toHaveBeenCalledOnce()
  })

  it('does not import again after a completed boot migration', async () => {
    await migrateLegacyInventory('student-a', ['hat_straw'])
    await migrateLegacyInventory('student-a', ['hat_straw'])

    expect(dependencies.importLegacyInventory).toHaveBeenCalledOnce()
    expect(dependencies.refreshWalletAndInventory).toHaveBeenCalledOnce()
  })

  it('uses a different stable migration id for a different student', async () => {
    dependencies.randomUUID
      .mockReturnValueOnce('migration-request-a')
      .mockReturnValueOnce('migration-request-b')

    await migrateLegacyInventory('student-a', ['hat_straw'])
    await migrateLegacyInventory('student-b', ['hat_straw'])

    expect(dependencies.importLegacyInventory).toHaveBeenNthCalledWith(
      1,
      ['hat_straw'],
      'migration-request-a'
    )
    expect(dependencies.importLegacyInventory).toHaveBeenNthCalledWith(
      2,
      ['hat_straw'],
      'migration-request-b'
    )
  })

  it('filters unknown local ids before importing', async () => {
    await migrateLegacyInventory('student-a', ['unknown-old-item', 'hat_straw'])

    expect(dependencies.importLegacyInventory).toHaveBeenCalledWith(
      ['hat_straw'],
      'migration-request-1'
    )
  })

  it('retains equipped selections only from authoritative ownership', async () => {
    dependencies.ownedItems = ['bg_sky']

    await migrateLegacyInventory('student-a', ['hat_straw'])

    expect(dependencies.retainOwnedSelections).toHaveBeenCalledWith(['bg_sky'])
  })

  it('keeps local ownership untouched when completed migration refresh is offline', async () => {
    storage.set(
      'wallet-legacy-inventory-v1:student-a',
      JSON.stringify({ requestId: 'migration-request-1', completed: true })
    )
    dependencies.refreshWalletAndInventory.mockRejectedValue(new Error('offline'))

    await expect(migrateLegacyInventory('student-a', ['hat_straw'])).rejects.toThrow('offline')

    expect(dependencies.importLegacyInventory).not.toHaveBeenCalled()
    expect(dependencies.retainOwnedSelections).not.toHaveBeenCalled()
  })
})
