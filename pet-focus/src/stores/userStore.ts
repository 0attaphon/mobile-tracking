import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface UserProfile {
  uid: string
  name: string
  age: number
  school: string
  createdAt: Date | null
}

interface UserState {
  profile: UserProfile | null
  studentId: string | null
  nickname: string | null
  isRegistered: boolean
  isLoggedIn: boolean
  isLoading: boolean
  ownedItems: string[]
  earnedAchievements: string[]
  _hasHydrated: boolean
  setProfile: (profile: UserProfile) => void
  setRegistered: (studentId: string) => void
  setNickname: (nickname: string | null) => void
  setLoggedIn: (value: boolean) => void
  setLoading: (value: boolean) => void
  setHasHydrated: (value: boolean) => void
  addOwnedItem: (itemId: string) => void
  hydrateOwnedItems: (itemIds: string[]) => void
  earnAchievement: (achievementId: string) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      studentId: null,
      nickname: null,
      isRegistered: false,
      isLoggedIn: false,
      isLoading: false,
      ownedItems: [],
      earnedAchievements: [],
      _hasHydrated: false,

      setProfile: (profile) => set({ profile }),
      setRegistered: (studentId) =>
        set({ studentId, isRegistered: true, isLoggedIn: true }),
      setNickname: (nickname) => set({ nickname }),
      setLoggedIn: (value) => set({ isLoggedIn: value }),
      setLoading: (value) => set({ isLoading: value }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),

      addOwnedItem: (itemId) =>
        set((state) => ({
          ownedItems: state.ownedItems.includes(itemId)
            ? state.ownedItems
            : [...state.ownedItems, itemId],
        })),

      hydrateOwnedItems: (ownedItems) => set({ ownedItems: [...new Set(ownedItems)] }),

      earnAchievement: (achievementId) =>
        set((state) => ({
          earnedAchievements: state.earnedAchievements.includes(achievementId)
            ? state.earnedAchievements
            : [...state.earnedAchievements, achievementId],
        })),

      logout: () =>
        set({
          profile: null,
          studentId: null,
          isRegistered: false,
          isLoggedIn: false,
          ownedItems: [],
          earnedAchievements: [],
        }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ownedItems: state.ownedItems,
        studentId: state.studentId,
        nickname: state.nickname,
        isRegistered: state.isRegistered,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
