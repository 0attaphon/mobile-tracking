import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CHORE_QUESTS, ChoreQuest } from '@/types/focus'
import { todayKey } from '@/utils/imageTensor'
import { usePetStore } from '@/stores/petStore'
import { syncChoreCompletion } from '@/services/supabase/sync'

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

      ensureToday: () => {
        const today = todayKey()
        set((state) => ({
          progress: CHORE_QUESTS.map((quest) => {
            const existing = state.progress.find(
              (p) => p.questId === quest.id && p.date === today
            )
            return existing ?? defaultProgress(quest.id)
          }),
        }))
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
