import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CHORE_QUESTS, ChoreQuest } from '@/types/focus'
import { todayKey } from '@/utils/imageTensor'
import { usePetStore } from '@/stores/petStore'
import { useUserStore } from '@/stores/userStore'
import { syncChoreCompletion } from '@/services/supabase/sync'

const MIN_DAILY_QUESTS = 3
const MAX_DAILY_QUESTS = 5

function stringToSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Seeded by studentId+date so the picked quests stay stable across app restarts within the same day.
function pickDailyQuestIds(dateKey: string, studentId: string): string[] {
  const rng = mulberry32(stringToSeed(`${studentId}:${dateKey}`))
  const ids = CHORE_QUESTS.map((q) => q.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  const count = MIN_DAILY_QUESTS + Math.floor(rng() * (MAX_DAILY_QUESTS - MIN_DAILY_QUESTS + 1))
  return ids.slice(0, count)
}

export interface ChoreQuestProgress {
  questId: string
  date: string
  completedAt?: string
  retryCount: number
  lastResult?: { matched: boolean; reason?: string }
}

const MAX_RECENT_HASHES = 5

interface ChoreQuestState {
  progress: ChoreQuestProgress[]
  recentHashes: Record<string, string[]>
  todayQuestIds: string[]
  todayQuestsDate: string
  ensureToday: () => void
  getQuestProgress: (questId: string) => ChoreQuestProgress
  recordAttempt: (questId: string, matched: boolean, reason?: string) => void
  completeQuest: (quest: ChoreQuest) => boolean
  isDuplicateHash: (questId: string, hash: string) => boolean
  recordHash: (questId: string, hash: string) => void
}

function defaultProgress(questId: string): ChoreQuestProgress {
  return { questId, date: todayKey(), retryCount: 0 }
}

export const useChoreQuestStore = create<ChoreQuestState>()(
  persist(
    (set, get) => ({
      progress: [],
      recentHashes: {},
      todayQuestIds: [],
      todayQuestsDate: '',

      ensureToday: () => {
        const today = todayKey()
        set((state) => {
          let questIds = state.todayQuestIds
          let questsDate = state.todayQuestsDate
          if (questsDate !== today) {
            const studentId = useUserStore.getState().studentId ?? 'anon'
            questIds = pickDailyQuestIds(today, studentId)
            questsDate = today
          }
          return {
            todayQuestIds: questIds,
            todayQuestsDate: questsDate,
            progress: questIds.map((questId) => {
              const existing = state.progress.find(
                (p) => p.questId === questId && p.date === today
              )
              return existing ?? defaultProgress(questId)
            }),
          }
        })
      },

      getQuestProgress: (questId) => {
        get().ensureToday()
        const today = todayKey()
        return (
          get().progress.find((p) => p.questId === questId && p.date === today) ??
          defaultProgress(questId)
        )
      },

      recordAttempt: (questId, matched, reason) => {
        get().ensureToday()
        const today = todayKey()
        set((state) => ({
          progress: state.progress.map((p) =>
            p.questId === questId && p.date === today
              ? {
                  ...p,
                  retryCount: matched ? p.retryCount : p.retryCount + 1,
                  lastResult: { matched, reason },
                }
              : p
          ),
        }))
      },

      completeQuest: (quest) => {
        const entry = get().getQuestProgress(quest.id)
        if (entry.completedAt) return false

        get().ensureToday()
        const today = todayKey()
        set((state) => ({
          progress: state.progress.map((p) =>
            p.questId === quest.id && p.date === today
              ? { ...p, completedAt: new Date().toISOString(), lastResult: { matched: true } }
              : p
          ),
        }))

        usePetStore.getState().addCoins(quest.reward.coins)
        syncChoreCompletion({
          questId: quest.id,
          coinsEarned: quest.reward.coins,
        }).catch(() => {})
        return true
      },

      isDuplicateHash: (questId, hash) => {
        const hashes = get().recentHashes[questId] ?? []
        return hashes.includes(hash)
      },

      recordHash: (questId, hash) => {
        set((state) => {
          const existing = state.recentHashes[questId] ?? []
          const next = [hash, ...existing.filter((h) => h !== hash)].slice(
            0,
            MAX_RECENT_HASHES
          )
          return {
            recentHashes: { ...state.recentHashes, [questId]: next },
          }
        })
      },
    }),
    {
      name: 'chore-quest-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
