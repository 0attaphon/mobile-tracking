import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  randomUUID: vi.fn(),
  ensureDailyQuestAssignments: vi.fn(),
  queueReward: vi.fn(),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('expo-crypto', () => ({ randomUUID: dependencies.randomUUID }))

vi.mock('@/utils/imageTensor', () => ({ todayKey: () => '2026-09-25' }))

vi.mock('@/services/supabase/wallet', () => ({
  ensureDailyQuestAssignments: dependencies.ensureDailyQuestAssignments,
}))

vi.mock('@/stores/petStore', () => ({
  usePetStore: {
    getState: () => ({ queueReward: dependencies.queueReward }),
  },
}))

vi.mock('@/services/supabase/sync', () => ({ syncChoreCompletion: vi.fn() }))

import { useChoreQuestStore } from '../choreQuestStore'
import type { PendingReward } from '@/services/supabase/pendingRewards'
import { CHORE_QUESTS } from '@/types/focus'

const todayKey = () => '2026-09-25'

const reward: PendingReward = {
  requestId: 'request-1',
  studentId: 'student-a',
  rewardType: 'chore',
  sourceId: 'challenge-1',
  sourceDate: '2026-09-25',
  createdAt: '2026-09-25T08:00:00.000Z',
}

beforeEach(() => {
  Object.values(dependencies).forEach((mock) => mock.mockReset())
  dependencies.randomUUID.mockReturnValue('attempt-1')
  dependencies.queueReward.mockResolvedValue(undefined)
  useChoreQuestStore.setState({
    progress: [],
    recentHashes: {},
    todayQuestIds: [],
    todayQuestsDate: '',
    assignmentStatus: 'idle',
    verificationAttemptIds: {},
  })
})

describe('server-owned chore rewards', () => {
  it('loads only chore assignments owned by the server', async () => {
    dependencies.ensureDailyQuestAssignments.mockResolvedValue([
      { rewardType: 'chore', questId: 'chore_sweep', sourceDate: todayKey(), position: 1 },
      { rewardType: 'outdoor', questId: 'outdoor_walk', sourceDate: todayKey(), position: 1 },
    ])

    await useChoreQuestStore.getState().refreshTodayAssignments()

    expect(useChoreQuestStore.getState()).toMatchObject({
      todayQuestIds: ['chore_sweep'],
      todayQuestsDate: todayKey(),
      assignmentStatus: 'ready',
    })
  })

  it('reuses one local verification attempt id for a quest retry', () => {
    const first = useChoreQuestStore.getState().getOrCreateVerificationAttemptId('chore_sweep')
    const second = useChoreQuestStore.getState().getOrCreateVerificationAttemptId('chore_sweep')

    expect(first).toBe('attempt-1')
    expect(second).toBe('attempt-1')
    expect(dependencies.randomUUID).toHaveBeenCalledOnce()
  })

  it('marks completion only after the reward request is durably queued', async () => {
    let release!: () => void
    dependencies.queueReward.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve })
    )
    useChoreQuestStore.setState({
      todayQuestIds: ['chore_sweep'],
      todayQuestsDate: todayKey(),
      assignmentStatus: 'ready',
      progress: [{ questId: 'chore_sweep', date: todayKey(), retryCount: 0 }],
    })

    const completing = useChoreQuestStore.getState().completeQuest(CHORE_QUESTS[0], reward)
    await Promise.resolve()
    expect(useChoreQuestStore.getState().getQuestProgress('chore_sweep').completedAt).toBeUndefined()

    release()
    await expect(completing).resolves.toBe(true)
    expect(useChoreQuestStore.getState().getQuestProgress('chore_sweep').completedAt).toEqual(
      expect.any(String)
    )
  })
})
