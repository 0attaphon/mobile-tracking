import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as Network from 'expo-network'
import {
  fetchShopCatalog,
  purchaseItem,
  refreshWalletAndInventory,
  type ShopCatalog,
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
  /** Server prices + active version; null until first successful fetch. */
  catalog: ShopCatalog | null
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
  catalog: null,

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

      const startRequest = async (): Promise<PendingPurchase> => {
        const request = {
          studentKey,
          itemId,
          catalogVersion,
          requestId: Crypto.randomUUID(),
        }
        await AsyncStorage.setItem(storageKey(studentKey), JSON.stringify(request))
        set({ pendingPurchase: request })
        return request
      }

      let pending = get().pendingPurchase
      if (pending && (pending.studentKey !== studentKey || pending.itemId !== itemId)) {
        set({ lastError: 'UNKNOWN' })
        return false
      }
      if (!pending) pending = await startRequest()

      try {
        try {
          // A retained request is replayed at the version it was created with,
          // so a commit that happened before a timeout is still recognised.
          await purchaseItem(itemId, pending.catalogVersion, pending.requestId)
        } catch (error) {
          // The server checks the request id before the catalog, so this error
          // proves the retained request never committed: its version was
          // retired. Start a fresh request at the current version.
          if (
            errorCode(error) !== 'CATALOG_ITEM_UNAVAILABLE' ||
            pending.catalogVersion === catalogVersion
          ) {
            throw error
          }
          pending = await startRequest()
          await purchaseItem(itemId, catalogVersion, pending.requestId)
        }
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

  refreshShop: async () => {
    // Settle both so a catalog failure still refreshes wallet/inventory (and
    // keeps the last known catalog), then surface the first error.
    const results = await Promise.allSettled([
      refreshWalletAndInventory(),
      fetchShopCatalog().then((catalog) => set({ catalog })),
    ])
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) throw failed.reason
  },
}))
