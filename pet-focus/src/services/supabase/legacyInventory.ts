import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import { SHOP_ITEMS } from '@/types/shop'
import { usePetStore } from '@/stores/petStore'
import { useUserStore } from '@/stores/userStore'
import { importLegacyInventory, refreshWalletAndInventory } from './wallet'

const STORAGE_PREFIX = 'wallet-legacy-inventory-v1:'

type MigrationRecord = {
  requestId: string
  completed: boolean
}

function parseRecord(raw: string | null): MigrationRecord | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<MigrationRecord>
    if (typeof value.requestId !== 'string' || typeof value.completed !== 'boolean') return null
    return { requestId: value.requestId, completed: value.completed }
  } catch {
    return null
  }
}

let migrationChain: Promise<void> = Promise.resolve()

async function runLegacyInventoryMigration(
  studentKey: string,
  localOwnedItems: string[]
): Promise<void> {
  const storageKey = `${STORAGE_PREFIX}${studentKey}`
  let record = parseRecord(await AsyncStorage.getItem(storageKey))
  if (!record) {
    record = { requestId: Crypto.randomUUID(), completed: false }
    // The stable id must reach durable storage before the first RPC attempt.
    await AsyncStorage.setItem(storageKey, JSON.stringify(record))
  }

  if (record.completed) {
    await refreshWalletAndInventory()
  } else {
    const knownItemIds = new Set(SHOP_ITEMS.map((item) => item.id))
    const importableItems = [...new Set(localOwnedItems)].filter((itemId) =>
      knownItemIds.has(itemId)
    )
    if (importableItems.length > 0) {
      await importLegacyInventory(importableItems, record.requestId)
    } else {
      await refreshWalletAndInventory()
    }
    record = { ...record, completed: true }
    await AsyncStorage.setItem(storageKey, JSON.stringify(record))
  }

  usePetStore.getState().retainOwnedSelections(useUserStore.getState().ownedItems)
}

export function migrateLegacyInventory(
  studentKey: string,
  localOwnedItems: string[]
): Promise<void> {
  const job = migrationChain.then(
    () => runLegacyInventoryMigration(studentKey, localOwnedItems),
    () => runLegacyInventoryMigration(studentKey, localOwnedItems)
  )
  migrationChain = job.catch(() => {})
  return job
}
