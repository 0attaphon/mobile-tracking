import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FocusSessionStatus, FOCUS_REWARDS, STREAK_BONUSES, MoodValue, MoodEntry } from '@/types/focus'
import { todayKey } from '@/utils/imageTensor'

function dayKeyOffset(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

interface FocusState {
  status: FocusSessionStatus
  isPaused: boolean
  selectedMinutes: number
  remainingSeconds: number
  sessionStartTime: Date | null
  currentStreak: number
  lastFocusDate: string | null
  longestStreak: number
  totalFocusMinutes: number
  moodLog: MoodEntry[]
  catchUpAvailable: boolean
  freezeTokens: number
  streakFrozenPending: boolean
  // Actions
  selectDuration: (minutes: number) => void
  startSession: () => void
  syncRemainingSeconds: (seconds: number) => void
  tickSecond: () => void
  pauseSession: () => void
  resumeSession: () => void
  completeSession: () => { streakBonus: number; catchUpApplied: boolean }
  failSession: () => void
  resetSession: () => void
  logMood: (mood: MoodValue, minutes: number) => void
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      isPaused: false,
      selectedMinutes: 30,
      remainingSeconds: 30 * 60,
      sessionStartTime: null,
      currentStreak: 0,
      lastFocusDate: null,
      longestStreak: 0,
      totalFocusMinutes: 0,
      moodLog: [],
      catchUpAvailable: false,
      freezeTokens: 0,
      streakFrozenPending: false,

      selectDuration: (minutes) =>
        set({ selectedMinutes: minutes, remainingSeconds: minutes * 60 }),

      startSession: () =>
        set((state) => {
          const lapsedFromStreak =
            !!state.lastFocusDate &&
            state.lastFocusDate !== todayKey() &&
            state.lastFocusDate !== dayKeyOffset(-1) &&
            state.currentStreak >= 3

          if (lapsedFromStreak && state.freezeTokens > 0) {
            return {
              status: 'in_progress',
              isPaused: false,
              sessionStartTime: new Date(),
              remainingSeconds: state.selectedMinutes * 60,
              freezeTokens: state.freezeTokens - 1,
              streakFrozenPending: true,
            }
          }

          return {
            status: 'in_progress',
            isPaused: false,
            sessionStartTime: new Date(),
            remainingSeconds: state.selectedMinutes * 60,
            ...(lapsedFromStreak ? { catchUpAvailable: true } : {}),
          }
        }),

      syncRemainingSeconds: (seconds) =>
        set((state) => {
          if (state.status !== 'in_progress' || state.isPaused) return state
          return { remainingSeconds: Math.max(0, seconds) }
        }),

      tickSecond: () =>
        set((state) => {
          if (state.status !== 'in_progress' || state.isPaused) return state
          if (state.remainingSeconds <= 1) {
            return { remainingSeconds: 0, status: 'completed', isPaused: false }
          }
          return { remainingSeconds: state.remainingSeconds - 1 }
        }),

      pauseSession: () =>
        set((state) => {
          if (state.status !== 'in_progress') return state
          return { isPaused: true }
        }),

      resumeSession: () =>
        set((state) => {
          if (state.status !== 'in_progress') return state
          return { isPaused: false }
        }),

      completeSession: () => {
        const state = get()
        if (state.status !== 'in_progress') return { streakBonus: 0, catchUpApplied: false }

        const today = todayKey()
        let currentStreak = state.currentStreak
        let longestStreak = state.longestStreak
        let lastFocusDate = state.lastFocusDate
        let freezeTokens = state.freezeTokens
        if (state.lastFocusDate !== today) {
          const continuous = state.lastFocusDate === dayKeyOffset(-1) || state.streakFrozenPending
          currentStreak = continuous ? state.currentStreak + 1 : 1
          longestStreak = Math.max(state.longestStreak, currentStreak)
          lastFocusDate = today
          if (currentStreak % 7 === 0) {
            freezeTokens = Math.min(3, freezeTokens + 1)
          }
        }

        const catchUpApplied = state.catchUpAvailable
        const streakBonus = STREAK_BONUSES[currentStreak] ?? 0

        set({
          status: 'completed',
          isPaused: false,
          totalFocusMinutes: state.totalFocusMinutes + state.selectedMinutes,
          currentStreak,
          longestStreak,
          lastFocusDate,
          catchUpAvailable: false,
          streakFrozenPending: false,
          freezeTokens,
        })

        return { streakBonus, catchUpApplied }
      },

      failSession: () =>
        set((state) => {
          if (state.status !== 'in_progress') return state
          return { status: 'failed', isPaused: false }
        }),

      resetSession: () =>
        set((state) => ({
          status: 'idle',
          isPaused: false,
          remainingSeconds: state.selectedMinutes * 60,
          sessionStartTime: null,
        })),

      logMood: (mood, minutes) =>
        set((state) => ({
          moodLog: [
            ...state.moodLog,
            { date: new Date().toISOString(), mood, minutes },
          ],
        })),
    }),
    {
      name: 'focus-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        lastFocusDate: state.lastFocusDate,
        longestStreak: state.longestStreak,
        totalFocusMinutes: state.totalFocusMinutes,
        moodLog: state.moodLog,
        catchUpAvailable: state.catchUpAvailable,
        freezeTokens: state.freezeTokens,
        streakFrozenPending: state.streakFrozenPending,
      }),
    }
  )
)

export function getCoinsForDuration(minutes: number): number {
  return FOCUS_REWARDS[minutes]?.coins ?? 10
}

export interface MoodSummary {
  sessions: number
  focusMinutes: number
  avgMood: number | null
}

export function getSummary(moodLog: MoodEntry[], days: number): MoodSummary {
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = moodLog.filter((e) => new Date(e.date).getTime() >= since)
  const sessions = recent.length
  const focusMinutes = recent.reduce((sum, e) => sum + e.minutes, 0)
  const avgMood =
    sessions > 0 ? recent.reduce((sum, e) => sum + e.mood, 0) / sessions : null
  return { sessions, focusMinutes, avgMood }
}
