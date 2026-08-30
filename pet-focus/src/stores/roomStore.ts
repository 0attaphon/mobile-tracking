import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ShopItem } from '@/types/shop'

const DEFAULTS = {
  bgColor: '#FFFFFF',
  tabBarColor: '#1A3D2E',
  surfaceColor: '#1A3D2E',
}

interface RoomState {
  selectedBgId: string | null
  selectedBgColor: string
  selectedBgGradient: [string, string] | null
  tabBarColor: string
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
      tabBarColor: DEFAULTS.tabBarColor,
      surfaceColor: DEFAULTS.surfaceColor,
      placedDecorations: [],

      setBackground: (item) => {
        if (!item) {
          set({
            selectedBgId: null,
            selectedBgColor: DEFAULTS.bgColor,
            selectedBgGradient: null,
            tabBarColor: DEFAULTS.tabBarColor,
            surfaceColor: DEFAULTS.surfaceColor,
          })
          return
        }
        set({
          selectedBgId: item.id,
          selectedBgColor: item.bgColor ?? DEFAULTS.bgColor,
          selectedBgGradient: item.bgGradient ?? null,
          tabBarColor: item.tabBarColor ?? DEFAULTS.tabBarColor,
          surfaceColor: item.surfaceColor ?? item.tabBarColor ?? DEFAULTS.surfaceColor,
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
          tabBarColor: DEFAULTS.tabBarColor,
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
        tabBarColor: state.tabBarColor,
        surfaceColor: state.surfaceColor,
        placedDecorations: state.placedDecorations,
      }),
    }
  )
)
