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
import { syncCoinDelta } from '@/services/supabase/sync'
interface PetState {
  name: string
  species: 'cat' | 'dog' | 'rabbit' | 'hamster'
  activePetId: PetId
  level: number
  exp: number
  happiness: number
  coins: number
  equippedItems: string[]
  _hasHydrated: boolean
  addExp: (amount: number) => void
  updateHappiness: (delta: number) => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  hydrateCoins: (coins: number) => void
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
        set((state) => ({ coins: state.coins + amount }))
        syncCoinDelta(amount)
      },

      spendCoins: (amount) => {
        if (amount <= 0) return true
        const { coins } = get()
        if (coins < amount) return false
        set({ coins: coins - amount })
        syncCoinDelta(-amount)
        return true
      },

      hydrateCoins: (coins) => set({ coins }),

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
        equippedItems: state.equippedItems,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
