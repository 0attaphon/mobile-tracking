import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    },
  },
}))

import {
  enqueuePendingReward,
  flushPendingRewardQueue,
  listPendingRewards,
  type PendingReward,
} from '../pendingRewards'

const reward = (requestId: string, studentId = 'student-a'): PendingReward => ({
  requestId,
  studentId,
  rewardType: 'focus',
  sourceId: `source-${requestId}`,
  sourceDate: '2026-09-25',
  createdAt: '2026-09-25T08:00:00.000Z',
})

beforeEach(() => {
  storage.clear()
})

describe('pending reward queue', () => {
  it('keeps every reward when concurrent enqueues overlap', async () => {
    await Promise.all([
      enqueuePendingReward(reward('request-1')),
      enqueuePendingReward(reward('request-2')),
    ])

    expect(await listPendingRewards('student-a')).toEqual([
      reward('request-1'),
      reward('request-2'),
    ])
  })

  it('collapses duplicate request IDs without replacing the original reward', async () => {
    await enqueuePendingReward(reward('request-1'))
    await enqueuePendingReward({
      ...reward('request-1'),
      sourceId: 'different-source',
    })

    expect(await listPendingRewards('student-a')).toEqual([reward('request-1')])
  })

  it('preserves a failed reward with its stable request ID for retry', async () => {
    await enqueuePendingReward(reward('request-1'))

    const first = await flushPendingRewardQueue('student-a', async () => {
      throw new Error('offline')
    })
    const attemptedIds: string[] = []
    const second = await flushPendingRewardQueue('student-a', async (item) => {
      attemptedIds.push(item.requestId)
      return { confirmedBalance: 25 }
    })

    expect(first).toEqual({ confirmedBalance: null, remaining: 1 })
    expect(second).toEqual({ confirmedBalance: 25, remaining: 0 })
    expect(attemptedIds).toEqual(['request-1'])
  })

  it('removes a successful replay from the queue', async () => {
    await enqueuePendingReward(reward('request-1'))

    const result = await flushPendingRewardQueue('student-a', async () => ({
      confirmedBalance: 40,
      replayed: true,
    }))

    expect(result).toEqual({ confirmedBalance: 40, remaining: 0 })
    expect(await listPendingRewards('student-a')).toEqual([])
  })

  it('flushes only the selected student queue', async () => {
    await enqueuePendingReward(reward('request-a', 'student-a'))
    await enqueuePendingReward(reward('request-b', 'student-b'))

    await flushPendingRewardQueue('student-a', async () => ({ confirmedBalance: 15 }))

    expect(await listPendingRewards('student-a')).toEqual([])
    expect(await listPendingRewards('student-b')).toEqual([
      reward('request-b', 'student-b'),
    ])
  })

  it('keeps a reward enqueued while a flush is awaiting the network', async () => {
    await enqueuePendingReward(reward('request-1'))
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>((resolve) => {
      started = resolve
    })
    const network = new Promise<void>((resolve) => {
      release = resolve
    })

    const flushing = flushPendingRewardQueue('student-a', async () => {
      started()
      await network
      return { confirmedBalance: 15 }
    })
    await didStart
    const enqueueing = enqueuePendingReward(reward('request-2'))
    release()
    await Promise.all([flushing, enqueueing])

    expect(await listPendingRewards('student-a')).toEqual([reward('request-2')])
  })
})
