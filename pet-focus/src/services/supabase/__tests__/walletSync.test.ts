import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  flushSyncQueue: vi.fn(),
  getLegacyCoinQueueStatus: vi.fn(),
  getSession: vi.fn(),
  setWalletMigrationState: vi.fn(),
  flushWalletRewards: vi.fn(),
}))

vi.mock('../sync', () => ({
  flushSyncQueue: dependencies.flushSyncQueue,
  getLegacyCoinQueueStatus: dependencies.getLegacyCoinQueueStatus,
}))

vi.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession: dependencies.getSession } },
}))

vi.mock('@/stores/petStore', () => ({
  usePetStore: {
    getState: () => ({
      setWalletMigrationState: dependencies.setWalletMigrationState,
      flushWalletRewards: dependencies.flushWalletRewards,
    }),
  },
}))

import { syncWalletAfterAuthentication } from '../walletSync'

beforeEach(() => {
  Object.values(dependencies).forEach((mock) => mock.mockReset())
  dependencies.flushSyncQueue.mockResolvedValue(undefined)
  dependencies.getSession.mockResolvedValue({
    data: { session: { user: { id: 'student-auth-id' } } },
  })
  dependencies.flushWalletRewards.mockResolvedValue(undefined)
})

describe('authenticated wallet sync', () => {
  it('surfaces an unresolved legacy delta and does not send it through wallet v2', async () => {
    dependencies.getLegacyCoinQueueStatus.mockResolvedValue({
      state: 'legacy_pending',
      count: 1,
    })

    await syncWalletAfterAuthentication()

    expect(dependencies.flushSyncQueue).toHaveBeenCalledOnce()
    expect(dependencies.setWalletMigrationState).toHaveBeenCalledWith('legacy_pending')
    expect(dependencies.flushWalletRewards).not.toHaveBeenCalled()
  })

  it('flushes wallet v2 for the authenticated student when migration is ready', async () => {
    dependencies.getLegacyCoinQueueStatus.mockResolvedValue({ state: 'ready', count: 0 })

    await syncWalletAfterAuthentication()

    expect(dependencies.setWalletMigrationState).toHaveBeenCalledWith('ready')
    expect(dependencies.flushWalletRewards).toHaveBeenCalledWith('student-auth-id')
  })
})
