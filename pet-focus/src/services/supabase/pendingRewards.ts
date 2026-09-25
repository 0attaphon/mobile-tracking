import AsyncStorage from '@react-native-async-storage/async-storage'

export const PENDING_REWARDS_STORAGE_KEY = 'supabase-pending-rewards-v2'

export type PendingReward = {
  requestId: string
  studentId: string
  rewardType: 'focus' | 'chore' | 'outdoor'
  sourceId: string
  sourceDate: string
  createdAt: string
}

type PendingRewardStorage = {
  version: 2
  items: PendingReward[]
}

type ClaimResult = {
  confirmedBalance: number
  replayed?: boolean
}

let queueOperation: Promise<void> = Promise.resolve()

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = queueOperation.then(operation, operation)
  queueOperation = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

async function loadQueue(): Promise<PendingReward[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_REWARDS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<PendingRewardStorage>
    if (parsed.version !== 2 || !Array.isArray(parsed.items)) return []
    return parsed.items
  } catch {
    return []
  }
}

async function saveQueue(items: PendingReward[]): Promise<void> {
  const value: PendingRewardStorage = { version: 2, items }
  await AsyncStorage.setItem(PENDING_REWARDS_STORAGE_KEY, JSON.stringify(value))
}

export function enqueuePendingReward(reward: PendingReward): Promise<void> {
  return serialize(async () => {
    const items = await loadQueue()
    if (items.some((item) => item.requestId === reward.requestId)) return
    await saveQueue([...items, reward])
  })
}

export function listPendingRewards(studentId?: string): Promise<PendingReward[]> {
  return serialize(async () => {
    const items = await loadQueue()
    return studentId ? items.filter((item) => item.studentId === studentId) : items
  })
}

export function flushPendingRewardQueue(
  studentId: string,
  claim: (reward: PendingReward) => Promise<ClaimResult>
): Promise<{ confirmedBalance: number | null; remaining: number }> {
  return serialize(async () => {
    const items = await loadQueue()
    const remaining: PendingReward[] = []
    let confirmedBalance: number | null = null

    for (const item of items) {
      if (item.studentId !== studentId) {
        remaining.push(item)
        continue
      }

      try {
        const result = await claim(item)
        confirmedBalance = result.confirmedBalance
      } catch {
        remaining.push(item)
      }
    }

    await saveQueue(remaining)
    return {
      confirmedBalance,
      remaining: remaining.filter((item) => item.studentId === studentId).length,
    }
  })
}
