import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as Network from 'expo-network'
import {
  purchaseItem,
  refreshWalletAndInventory,
  type WalletErrorCode,
} from '@/services/supabase/wallet'

const storageKey = (studentKey: string) => `wallet-pending-purchase-v1:${studentKey}`

export type PendingPurchase = {
  studentKey: string
  itemId: string
  catalogVersion: number
  requestId: string
}

interface PurchaseState {
  isSubmitting: boolean
  pendingPurchase: PendingPurchase | null
  lastError: WalletErrorCode | null
  restorePendingPurchase: (studentKey: string) => Promise<void>
  submitPurchase: (
    studentKey: string,
    itemId: string,
    catalogVersion: number
  ) => Promise<boolean>
  refreshShop: () => Promise<void>
}

function errorCode(error: unknown): WalletErrorCode {
  if (error && typeof error === 'object' && 'code' in error) {
    return error.code as WalletErrorCode
  }
  return 'UNKNOWN'
}

async function loadPendingPurchase(studentKey: string): Promise<PendingPurchase | null> {
  const raw = await AsyncStorage.getItem(storageKey(studentKey))
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<PendingPurchase>
    if (
      typeof value.studentKey !== 'string' ||
      typeof value.itemId !== 'string' ||
      typeof value.catalogVersion !== 'number' ||
      typeof value.requestId !== 'string'
    ) {
      return null
    }
    return value as PendingPurchase
  } catch {
    return null
  }
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  isSubmitting: false,
  pendingPurchase: null,
  lastError: null,

  restorePendingPurchase: async (studentKey) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    try {
      const pending = await loadPendingPurchase(studentKey)
      set({ pendingPurchase: pending?.studentKey === studentKey ? pending : null })
    } finally {
      set({ isSubmitting: false })
    }
  },

  submitPurchase: async (studentKey, itemId, catalogVersion) => {
    if (get().isSubmitting) return false
    set({ isSubmitting: true, lastError: null })
    try {
      const network = await Network.getNetworkStateAsync()
      if (!network.isConnected || network.isInternetReachable === false) {
        set({ lastError: 'OFFLINE' })
        return false
      }

      let pending = get().pendingPurchase
      if (
        pending &&
        (pending.studentKey !== studentKey ||
          pending.itemId !== itemId ||
          pending.catalogVersion !== catalogVersion)
      ) {
        set({ lastError: 'UNKNOWN' })
        return false
      }
      if (!pending) {
        pending = {
          studentKey,
          itemId,
          catalogVersion,
          requestId: Crypto.randomUUID(),
        }
        await AsyncStorage.setItem(storageKey(studentKey), JSON.stringify(pending))
        set({ pendingPurchase: pending })
      }

      try {
        await purchaseItem(itemId, catalogVersion, pending.requestId)
      } catch (error) {
        const code = errorCode(error)
        if (code === 'ALREADY_OWNED') {
          await refreshWalletAndInventory()
          await AsyncStorage.removeItem(storageKey(studentKey))
          set({ pendingPurchase: null, lastError: null })
          return true
        }
        set({ lastError: code })
        if (code !== 'OFFLINE' && code !== 'UNKNOWN') {
          await AsyncStorage.removeItem(storageKey(studentKey))
          set({ pendingPurchase: null })
        }
        return false
      }

      await AsyncStorage.removeItem(storageKey(studentKey))
      set({ pendingPurchase: null, lastError: null })
      return true
    } finally {
      set({ isSubmitting: false })
    }
  },

  refreshShop: () => refreshWalletAndInventory(),
}))
