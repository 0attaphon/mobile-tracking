import { useState, useEffect, useCallback, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { AppUsage } from '@/types/focus'
import { getTodayAppUsage, checkUsageStatsPermission } from '@/services/usageStats'
import { syncDailyUsage } from '@/services/supabase/sync'
import { useFocusStore } from '@/stores/focusStore'
import { useUserStore } from '@/stores/userStore'

export function useScreenTime() {
  const [apps, setApps] = useState<AppUsage[]>([])
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [hasPermission, setHasPermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const lastSyncSig = useRef<string>('')

  const refresh = useCallback(async () => {
    const perm = await checkUsageStatsPermission()
    setHasPermission(perm)
    const data = await getTodayAppUsage()
    setApps(data)
    const total = data.reduce((sum, a) => sum + a.minutes, 0)
    setTotalMinutes(total)
    setIsLoading(false)

    if (useUserStore.getState().isRegistered) {
      const focusMinutes = useFocusStore.getState().totalFocusMinutes
      // Skip redundant upserts — foregrounding the app shouldn't re-sync
      // unchanged numbers on every AppState 'active' event.
      const sig = `${total}|${focusMinutes}`
      if (sig !== lastSyncSig.current) {
        lastSyncSig.current = sig
        syncDailyUsage({
          totalScreenMinutes: total,
          focusMinutes,
          topApps: data.slice(0, 5),
        }).catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refresh()
      }
    })
    return () => sub.remove()
  }, [refresh])

  return { apps, totalMinutes, hasPermission, isLoading, refresh }
}
