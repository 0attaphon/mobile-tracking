import { useEffect, useRef, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useFocusStore, getCoinsForDuration } from '@/stores/focusStore'
import { usePetStore } from '@/stores/petStore'
import { startFocusTimer, stopFocusTimer } from '@/services/focusTimer'
import { requestUsageStatsPermission, checkUsageStatsPermission } from '@/services/usageStats'
import { requestNotificationPermission } from '@/services/permissions'
import { syncFocusSession } from '@/services/supabase/sync'

import { DEFAULT_BLOCKED_APPS } from '@/types/focus'

async function checkAndPromptUsageAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  try {
    const enabled = await checkUsageStatsPermission()
    if (!enabled) {
      return new Promise((resolve) => {
        Alert.alert(
          'ต้องการ Usage Access',
          'เพื่อตรวจจับแอปที่ห้ามใช้ระหว่างโฟกัส (TikTok, IG ฯลฯ) กรุณาเปิด "Usage access" ให้ pet-focus',
          [
            { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'ไปที่ Settings',
              onPress: async () => {
                await requestUsageStatsPermission()
                resolve(false)
              },
            },
          ]
        )
      })
    }
    return true
  } catch {
    return false
  }
}

export function useFocusSession() {
  const {
    status,
    isPaused,
    selectedMinutes,
    remainingSeconds,
    sessionStartTime,
    startSession,
    tickSecond,
    pauseSession,
    resumeSession,
    completeSession,
    failSession,
    resetSession,
    selectDuration,
  } = useFocusStore()

  const { addCoins, addExp, updateHappiness } = usePetStore()

  // Guards the session outcome so it fires exactly once, regardless of which
  // path (native complete event, native tick, or JS-fallback tick) reaches 0.
  const settledRef = useRef(false)

  const [lastReward, setLastReward] = useState<{
    coins: number
    streakBonus: number
    catchUpApplied: boolean
    usedFreeze: boolean
  } | null>(null)

  useEffect(() => {
    if (status !== 'in_progress') return
    settledRef.current = false

    const packages = DEFAULT_BLOCKED_APPS.map((a) => a.packageName)
    const totalSeconds = selectedMinutes * 60

    startFocusTimer(
      (remaining) => {
        if (remaining !== undefined) {
          useFocusStore.getState().syncRemainingSeconds(remaining)
          if (remaining <= 0) handleComplete()
        } else {
          useFocusStore.getState().tickSecond()
          const { status: s, remainingSeconds: r } = useFocusStore.getState()
          if (s === 'completed' || r === 0) handleComplete()
        }
      },
      handleFail,
      handleComplete,
      packages,
      totalSeconds,
      () => useFocusStore.getState().pauseSession(),
      () => useFocusStore.getState().resumeSession()
    )

    return () => {
      stopFocusTimer().catch(() => { })
    }
  }, [status])

  function handleComplete() {
    if (settledRef.current) return
    const s = useFocusStore.getState().status
    if (s !== 'in_progress' && s !== 'completed') return
    settledRef.current = true
    stopFocusTimer().catch(() => { })
    const usedFreeze = useFocusStore.getState().streakFrozenPending
    const { streakBonus, catchUpApplied } = completeSession()
    const baseCoins = getCoinsForDuration(selectedMinutes)
    const coins = baseCoins * (catchUpApplied ? 2 : 1) + streakBonus
    addCoins(coins)
    addExp(coins * 2)
    updateHappiness(10)
    setLastReward({ coins, streakBonus, catchUpApplied, usedFreeze })
    syncFocusSession({
      durationMinutes: selectedMinutes,
      status: 'completed',
      coinsEarned: coins,
      startedAt: sessionStartTime,
    }).catch(() => { })
  }

  function handleFail() {
    if (settledRef.current) return
    if (useFocusStore.getState().status !== 'in_progress') return
    settledRef.current = true
    stopFocusTimer().catch(() => { })
    failSession()
    syncFocusSession({
      durationMinutes: selectedMinutes,
      status: 'failed',
      coinsEarned: 0,
      startedAt: sessionStartTime,
    }).catch(() => { })
  }

  async function begin() {
    const granted = await requestNotificationPermission()
    if (Platform.OS === 'android' && Platform.Version >= 33 && !granted) {
      Alert.alert(
        'ต้องการการแจ้งเตือน',
        'เพื่อแสดงเวลานับถอยหลังขณะโฟกัสเบื้องหลัง กรุณาอนุญาตการแจ้งเตือน',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ลองอีกครั้ง', onPress: () => begin() },
        ]
      )
      return
    }
    const usageOk = await checkAndPromptUsageAccess()
    if (!usageOk) return
    startSession()
  }

  function cancel() {
    stopFocusTimer().catch(() => { })
    syncFocusSession({
      durationMinutes: selectedMinutes,
      status: 'cancelled',
      coinsEarned: 0,
      startedAt: sessionStartTime,
    }).catch(() => { })
    resetSession()
  }

  return {
    status,
    isPaused,
    selectedMinutes,
    remainingSeconds,
    begin,
    cancel,
    reset: resetSession,
    selectDuration,
    lastReward,
  }
}
