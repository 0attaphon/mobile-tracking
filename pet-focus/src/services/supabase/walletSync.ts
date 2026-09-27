import { isSupabaseConfigured, supabase } from './client'
import { flushSyncQueue, getLegacyCoinQueueStatus } from './sync'
import { usePetStore } from '@/stores/petStore'

export async function syncWalletAfterAuthentication(): Promise<void> {
  if (!isSupabaseConfigured) return

  await flushSyncQueue()
  const legacy = await getLegacyCoinQueueStatus()
  const petStore = usePetStore.getState()
  petStore.setWalletMigrationState(legacy.state)
  if (legacy.state === 'legacy_pending') return

  const { data } = await supabase.auth.getSession()
  const studentId = data.session?.user.id
  if (!studentId) return
  await petStore.flushWalletRewards(studentId)
}
