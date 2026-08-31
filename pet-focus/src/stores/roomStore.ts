import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ShopItem } from '@/types/shop'

const DEFAULTS = {
  bgColor: '#FFFFFF',
  surfaceColor: '#1A3D2E',
}

interface RoomState {
  selectedBgId: string | null
  selectedBgColor: string
  selectedBgGradient: [string, string] | null
  surfaceColor: string
  placedDecorations: string[]
  setBackground: (item: ShopItem | null) => void
  toggleDecoration: (itemId: string) => void
  resetBackground: () => void
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      selectedBgId: null,
      selectedBgColor: DEFAULTS.bgColor,
      selectedBgGradient: null,
      surfaceColor: DEFAULTS.surfaceColor,
      placedDecorations: [],

      setBackground: (item) => {
        if (!item) {
          set({
            selectedBgId: null,
            selectedBgColor: DEFAULTS.bgColor,
            selectedBgGradient: null,
            surfaceColor: DEFAULTS.surfaceColor,
          })
          return
        }
        set({
          selectedBgId: item.id,
          selectedBgColor: item.bgColor ?? DEFAULTS.bgColor,
          selectedBgGradient: item.bgGradient ?? null,
          surfaceColor: item.surfaceColor ?? DEFAULTS.surfaceColor,
        })
      },

      toggleDecoration: (itemId) =>
        set((state) => ({
          placedDecorations: state.placedDecorations.includes(itemId)
            ? state.placedDecorations.filter((id) => id !== itemId)
            : [...state.placedDecorations, itemId],
        })),

      resetBackground: () =>
        set({
          selectedBgId: null,
          selectedBgColor: DEFAULTS.bgColor,
          selectedBgGradient: null,
          surfaceColor: DEFAULTS.surfaceColor,
        }),
    }),
    {
      name: 'room-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedBgId: state.selectedBgId,
        selectedBgColor: state.selectedBgColor,
        selectedBgGradient: state.selectedBgGradient,
        surfaceColor: state.surfaceColor,
        placedDecorations: state.placedDecorations,
      }),
    }
  )
)
