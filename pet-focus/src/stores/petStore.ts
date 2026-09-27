import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  EXP_PER_LEVEL,
  DEFAULT_PET_NAME,
  DEFAULT_PET_ID,
  PetId,
  getPetCatalogEntry,
} from '@/types/pet'
import {
  enqueueReward,
  fetchWallet,
  flushPendingRewards,
} from '@/services/supabase/wallet'
import { listPendingRewards, PendingReward } from '@/services/supabase/pendingRewards'

type WalletMigrationState = 'checking' | 'ready' | 'legacy_pending'

interface PetState {
  name: string
  species: 'cat' | 'dog' | 'rabbit' | 'hamster'
  activePetId: PetId
  level: number
  exp: number
  happiness: number
  coins: number
  confirmedCoins: number
  pendingRewardCoins: number
  pendingRewardAmounts: Record<string, number>
  walletMigrationState: WalletMigrationState
  walletRequestVersion: number
  equippedItems: string[]
  _hasHydrated: boolean
  addExp: (amount: number) => void
  updateHappiness: (delta: number) => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  hydrateCoins: (coins: number) => void
  queueReward: (reward: PendingReward, amount: number) => Promise<void>
  refreshWallet: () => Promise<void>
  flushWalletRewards: (studentId: string) => Promise<void>
  setWalletMigrationState: (state: WalletMigrationState) => void
  retainOwnedSelections: (ownedItemIds: string[]) => void
  equipItem: (itemId: string) => void
  setPetName: (name: string) => void
  setActivePet: (petId: PetId) => void
  setHasHydrated: (value: boolean) => void
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      name: DEFAULT_PET_NAME,
      species: 'cat',
      activePetId: DEFAULT_PET_ID,
      level: 1,
      exp: 0,
      happiness: 80,
      coins: 0,
      confirmedCoins: 0,
      pendingRewardCoins: 0,
      pendingRewardAmounts: {},
      walletMigrationState: 'checking',
      walletRequestVersion: 0,
      equippedItems: [],
      _hasHydrated: false,

      addExp: (amount) =>
        set((state) => {
          let newExp = state.exp + amount
          let newLevel = state.level
          while (newExp >= EXP_PER_LEVEL && newLevel < 20) {
            newExp -= EXP_PER_LEVEL
            newLevel += 1
          }
          return { exp: newExp, level: newLevel }
        }),

      updateHappiness: (delta) =>
        set((state) => ({
          happiness: Math.max(5, Math.min(100, state.happiness + delta)),
        })),

      addCoins: (amount) => {
        if (__DEV__) {
          console.warn('[petStore.addCoins] ignored: rewards require an issued server challenge')
        }
      },

      spendCoins: (amount) => {
        if (amount <= 0) return true
        const { confirmedCoins, pendingRewardCoins } = get()
        if (confirmedCoins < amount) return false
        const nextConfirmed = confirmedCoins - amount
        set({
          confirmedCoins: nextConfirmed,
          coins: nextConfirmed + pendingRewardCoins,
        })
        return true
      },

      hydrateCoins: (confirmedCoins) =>
        set((state) => ({
          confirmedCoins,
          coins: confirmedCoins + state.pendingRewardCoins,
        })),

      queueReward: async (reward, amount) => {
        if (!Number.isSafeInteger(amount) || amount <= 0) return
        await enqueueReward(reward)
        set((state) => {
          if (state.pendingRewardAmounts[reward.requestId] !== undefined) return state
          const pendingRewardAmounts = {
            ...state.pendingRewardAmounts,
            [reward.requestId]: amount,
          }
          const pendingRewardCoins = Object.values(pendingRewardAmounts).reduce(
            (sum, value) => sum + value,
            0
          )
          return {
            pendingRewardAmounts,
            pendingRewardCoins,
            coins: state.confirmedCoins + pendingRewardCoins,
          }
        })
      },

      refreshWallet: async () => {
        const walletRequestVersion = get().walletRequestVersion + 1
        set({ walletRequestVersion })
        const wallet = await fetchWallet()
        if (get().walletRequestVersion !== walletRequestVersion) return
        set((state) => ({
          confirmedCoins: wallet.confirmedBalance,
          coins: wallet.confirmedBalance + state.pendingRewardCoins,
        }))
      },

      flushWalletRewards: async (studentId) => {
        const walletRequestVersion = get().walletRequestVersion + 1
        set({ walletRequestVersion })
        const result = await flushPendingRewards(studentId)
        const remaining = await listPendingRewards(studentId)
        if (get().walletRequestVersion !== walletRequestVersion) return
        const remainingIds = new Set(remaining.map((reward) => reward.requestId))
        set((state) => {
          const pendingRewardAmounts = Object.fromEntries(
            Object.entries(state.pendingRewardAmounts).filter(([requestId]) =>
              remainingIds.has(requestId)
            )
          )
          const pendingRewardCoins = Object.values(pendingRewardAmounts).reduce(
            (sum, value) => sum + value,
            0
          )
          return {
            confirmedCoins: result.confirmedBalance,
            pendingRewardAmounts,
            pendingRewardCoins,
            coins: result.confirmedBalance + pendingRewardCoins,
          }
        })
      },

      setWalletMigrationState: (walletMigrationState) => set({ walletMigrationState }),

      retainOwnedSelections: (ownedItemIds) =>
        set((state) => {
          const activePetOwned =
            state.activePetId === DEFAULT_PET_ID || ownedItemIds.includes(state.activePetId)
          const activePetId = activePetOwned ? state.activePetId : DEFAULT_PET_ID
          return {
            activePetId,
            species: getPetCatalogEntry(activePetId).species,
            equippedItems: state.equippedItems.filter((itemId) =>
              ownedItemIds.includes(itemId)
            ),
          }
        }),

      equipItem: (itemId) =>
        set((state) => ({
          equippedItems: state.equippedItems.includes(itemId)
            ? state.equippedItems.filter((i) => i !== itemId)
            : [...state.equippedItems, itemId],
        })),

      setPetName: (name) => set({ name }),

      setActivePet: (petId) => {
        const entry = getPetCatalogEntry(petId)
        set({ activePetId: petId, species: entry.species })
      },

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'pet-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        name: state.name,
        activePetId: state.activePetId,
        species: state.species,
        coins: state.coins,
        confirmedCoins: state.confirmedCoins,
        pendingRewardCoins: state.pendingRewardCoins,
        pendingRewardAmounts: state.pendingRewardAmounts,
        walletMigrationState: state.walletMigrationState,
        equippedItems: state.equippedItems,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
