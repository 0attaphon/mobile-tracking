import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import { CHORE_QUESTS, ChoreQuest } from '@/types/focus'
import { todayKey } from '@/utils/imageTensor'
import { usePetStore } from '@/stores/petStore'
import { ensureDailyQuestAssignments } from '@/services/supabase/wallet'
import type { PendingReward } from '@/services/supabase/pendingRewards'

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
  assignmentStatus: 'idle' | 'loading' | 'ready' | 'error'
  verificationAttemptIds: Record<string, string>
  ensureToday: () => void
  refreshTodayAssignments: () => Promise<void>
  getQuestProgress: (questId: string) => ChoreQuestProgress
  getOrCreateVerificationAttemptId: (questId: string) => string
  recordAttempt: (questId: string, matched: boolean, reason?: string) => void
  completeQuest: (quest: ChoreQuest, reward: PendingReward) => Promise<boolean>
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
      assignmentStatus: 'idle',
      verificationAttemptIds: {},

      ensureToday: () => {
        const today = todayKey()
        if (get().todayQuestsDate === today) return
        set({
          todayQuestIds: [],
          todayQuestsDate: today,
          assignmentStatus: 'idle',
        })
      },

      refreshTodayAssignments: async () => {
        get().ensureToday()
        const today = todayKey()
        set({ assignmentStatus: 'loading' })
        try {
          const assignments = await ensureDailyQuestAssignments()
          const knownQuestIds = new Set(CHORE_QUESTS.map((quest) => quest.id))
          const questIds = assignments
            .filter(
              (assignment) =>
                assignment.rewardType === 'chore' &&
                assignment.sourceDate === today &&
                knownQuestIds.has(assignment.questId)
            )
            .map((assignment) => assignment.questId)
          set((state) => ({
            todayQuestIds: questIds,
            todayQuestsDate: today,
            assignmentStatus: 'ready',
            progress: questIds.map((questId) => {
              const existing = state.progress.find(
                (entry) => entry.questId === questId && entry.date === today
              )
              return existing ?? defaultProgress(questId)
            }),
          }))
        } catch (error) {
          set({ assignmentStatus: 'error' })
          throw error
        }
      },

      getQuestProgress: (questId) => {
        const today = todayKey()
        return (
          get().progress.find((p) => p.questId === questId && p.date === today) ??
          defaultProgress(questId)
        )
      },

      getOrCreateVerificationAttemptId: (questId) => {
        const key = `${todayKey()}:${questId}`
        const existing = get().verificationAttemptIds[key]
        if (existing) return existing
        const attemptId = Crypto.randomUUID()
        set((state) => ({
          verificationAttemptIds: {
            ...state.verificationAttemptIds,
            [key]: attemptId,
          },
        }))
        return attemptId
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

      completeQuest: async (quest, reward) => {
        const entry = get().getQuestProgress(quest.id)
        if (entry.completedAt) return false

        get().ensureToday()
        const today = todayKey()
        if (
          get().assignmentStatus !== 'ready' ||
          !get().todayQuestIds.includes(quest.id) ||
          reward.rewardType !== 'chore' ||
          reward.sourceDate !== today
        ) {
          return false
        }

        await usePetStore.getState().queueReward(reward, quest.reward.coins)
        set((state) => ({
          progress: state.progress.map((p) =>
            p.questId === quest.id && p.date === today
              ? { ...p, completedAt: new Date().toISOString(), lastResult: { matched: true } }
              : p
          ),
          verificationAttemptIds: Object.fromEntries(
            Object.entries(state.verificationAttemptIds).filter(
              ([key]) => key !== `${today}:${quest.id}`
            )
          ),
        }))
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
