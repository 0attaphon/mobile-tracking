import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const client = vi.hoisted(() => ({
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
  isSupabaseConfigured: true,
  supabase: {
    rpc: client.rpc,
    auth: { getSession: client.getSession },
  },
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: () => ({ isRegistered: true }),
  },
}))

vi.mock('@shared/appLabels', () => ({
  normalizeAppUsage: (apps: unknown[]) => apps,
}))

vi.mock('@/utils/imageTensor', () => ({
  todayKey: () => '2026-09-25',
}))

import { flushSyncQueue, getLegacyCoinQueueStatus } from '../sync'

const LEGACY_QUEUE_KEY = 'supabase-sync-queue'

beforeEach(() => {
  storage.clear()
  client.rpc.mockReset()
  client.getSession.mockReset().mockResolvedValue({
    data: { session: { user: { id: 'student-a' } } },
  })
})

describe('legacy coin delta transition', () => {
  it('reports an unresolved legacy delta separately', async () => {
    storage.set(
      LEGACY_QUEUE_KEY,
      JSON.stringify([{ type: 'coin_delta', payload: { delta: 15 } }])
    )

    await expect(getLegacyCoinQueueStatus()).resolves.toEqual({
      state: 'legacy_pending',
      count: 1,
    })
  })

  it('never replays or deletes an unresolved legacy delta during a normal flush', async () => {
    const legacy = [{ type: 'coin_delta', payload: { delta: 15 } }]
    storage.set(LEGACY_QUEUE_KEY, JSON.stringify(legacy))

    await flushSyncQueue()

    expect(client.rpc).not.toHaveBeenCalled()
    expect(JSON.parse(storage.get(LEGACY_QUEUE_KEY) ?? '[]')).toEqual(legacy)
  })

  it('reports ready when no legacy delta remains', async () => {
    storage.set(LEGACY_QUEUE_KEY, JSON.stringify([]))

    await expect(getLegacyCoinQueueStatus()).resolves.toEqual({
      state: 'ready',
      count: 0,
    })
  })
})
