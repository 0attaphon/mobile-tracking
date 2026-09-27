import AsyncStorage from '@react-native-async-storage/async-storage'
import { normalizeAppUsage } from '@shared/appLabels'
import { AppUsage } from '@/types/focus'
import { isSupabaseConfigured, supabase } from './client'
import { useUserStore } from '@/stores/userStore'
import { todayKey } from '@/utils/imageTensor'

const PENDING_QUEUE_KEY = 'supabase-sync-queue'

type PendingItem =
  | {
      type: 'focus_session'
      payload: {
        durationMinutes: number
        status: 'completed' | 'failed' | 'cancelled'
        coinsEarned: number
        startedAt?: string
        endedAt: string
      }
    }
  | {
      type: 'daily_usage'
      payload: {
        date: string
        totalScreenMinutes: number
        focusMinutes: number
        topApps: AppUsage[]
      }
    }
  | {
      type: 'chore_completion'
      payload: {
        questId: string
        date: string
        coinsEarned: number
        completedAt: string
      }
    }
  | {
      type: 'coin_delta'
      payload: {
        delta: number
      }
    }

async function loadQueue(): Promise<PendingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingItem[]
  } catch {
    return []
  }
}

async function saveQueue(items: PendingItem[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(items))
}

async function enqueue(item: PendingItem): Promise<void> {
  const queue = await loadQueue()
  queue.push(item)
  await saveQueue(queue)
}

async function getStudentAuthId(): Promise<string | null> {
  if (!useUserStore.getState().isRegistered) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function pushItem(studentId: string, item: PendingItem): Promise<boolean> {
  // An old delta may have succeeded remotely before the client lost its
  // response. Never guess, delete, or replay it through either wallet path.
  if (item.type === 'coin_delta') return false

  if (item.type === 'focus_session') {
    const { error } = await supabase.from('focus_sessions').insert({
      student_id: studentId,
      duration_minutes: item.payload.durationMinutes,
      status: item.payload.status,
      coins_earned: item.payload.coinsEarned,
      started_at: item.payload.startedAt ?? null,
      ended_at: item.payload.endedAt,
    })
    return !error
  }

  if (item.type === 'daily_usage') {
    const { error } = await supabase.from('daily_usage').upsert(
      {
        student_id: studentId,
        date: item.payload.date,
        total_screen_minutes: item.payload.totalScreenMinutes,
        focus_minutes: item.payload.focusMinutes,
        top_apps: item.payload.topApps,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,date' }
    )
    return !error
  }

  if (item.type === 'chore_completion') {
    const { error } = await supabase.from('chore_completions').insert({
      student_id: studentId,
      quest_id: item.payload.questId,
      date: item.payload.date,
      coins_earned: item.payload.coinsEarned,
      completed_at: item.payload.completedAt,
    })
    return !error
  }

  return false
}

export async function getLegacyCoinQueueStatus(): Promise<{
  state: 'ready' | 'legacy_pending'
  count: number
}> {
  const queue = await loadQueue()
  const count = queue.filter((item) => item.type === 'coin_delta').length
  return { state: count > 0 ? 'legacy_pending' : 'ready', count }
}

export async function flushSyncQueue(): Promise<void> {
  if (!isSupabaseConfigured || !useUserStore.getState().isRegistered) return

  const authId = await getStudentAuthId()
  if (!authId) return

  const queue = await loadQueue()
  if (queue.length === 0) return

  const remaining: PendingItem[] = []
  for (const item of queue) {
    const ok = await pushItem(authId, item)
    if (!ok) remaining.push(item)
  }
  await saveQueue(remaining)
}

async function syncOrQueue(item: PendingItem): Promise<void> {
  if (!isSupabaseConfigured || !useUserStore.getState().isRegistered) return

  const authId = await getStudentAuthId()
  if (!authId) {
    await enqueue(item)
    return
  }

  const ok = await pushItem(authId, item)
  if (!ok) await enqueue(item)
}

export async function syncFocusSession(input: {
  durationMinutes: number
  status: 'completed' | 'failed' | 'cancelled'
  coinsEarned: number
  startedAt?: Date | null
}): Promise<void> {
  await syncOrQueue({
    type: 'focus_session',
    payload: {
      durationMinutes: input.durationMinutes,
      status: input.status,
      coinsEarned: input.coinsEarned,
      startedAt: input.startedAt?.toISOString(),
      endedAt: new Date().toISOString(),
    },
  })
}

export async function syncDailyUsage(input: {
  totalScreenMinutes: number
  focusMinutes: number
  topApps: AppUsage[]
}): Promise<void> {
  await syncOrQueue({
    type: 'daily_usage',
    payload: {
      date: todayKey(),
      totalScreenMinutes: input.totalScreenMinutes,
      focusMinutes: input.focusMinutes,
      topApps: normalizeAppUsage(input.topApps).slice(0, 5),
    },
  })
}

export async function syncChoreCompletion(input: {
  questId: string
  coinsEarned: number
}): Promise<void> {
  await syncOrQueue({
    type: 'chore_completion',
    payload: {
      questId: input.questId,
      date: todayKey(),
      coinsEarned: input.coinsEarned,
      completedAt: new Date().toISOString(),
    },
  })
}

export async function syncCoinDelta(delta: number): Promise<void> {
  if (delta !== 0) throw new Error('LEGACY_COIN_DELTA_DISABLED')
}

export async function syncNickname(nickname: string): Promise<void> {
  if (!isSupabaseConfigured || !useUserStore.getState().isRegistered) return
  const authId = await getStudentAuthId()
  if (!authId) return
  try {
    const { error } = await supabase.from('students').update({ nickname }).eq('id', authId)
    if (error && __DEV__) {
      console.warn('[syncNickname] update failed:', error.message)
    }
  } catch (err) {
    if (__DEV__) console.warn('[syncNickname] threw:', err)
    // best-effort — nickname is a cosmetic field, never crash the caller
  }
}

export interface ClassLeaderboardEntry {
  studentId: string | null
  nickname: string
  focusMinutes: number
  rank: number
  isMe: boolean
}

export async function fetchClassLeaderboard(): Promise<ClassLeaderboardEntry[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.rpc('get_class_leaderboard')
  if (error || !data) return []
  return data.map((row: any) => ({
    studentId: row.student_id,
    nickname: row.nickname,
    focusMinutes: row.focus_minutes,
    rank: row.rnk,
    isMe: row.is_me,
  }))
}
