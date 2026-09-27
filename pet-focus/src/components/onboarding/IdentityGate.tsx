import React, { useEffect } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { useRouter, useSegments, useRootNavigationState } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Network from 'expo-network'
import { APP_LOADING } from '@/assets/appImages'
import { useIdentityStore } from '@/stores/identityStore'
import { useUserStore } from '@/stores/userStore'
import { usePetStore } from '@/stores/petStore'
import { restoreRegisteredStudent } from '@/services/supabase/register'
import { syncWalletAfterAuthentication } from '@/services/supabase/walletSync'
import { isSupabaseConfigured } from '@/services/supabase/client'

SplashScreen.preventAutoHideAsync().catch(() => {})

export function IdentityGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const navigationState = useRootNavigationState()
  const identityHydrated = useIdentityStore((s) => s._hasHydrated)
  const isRegistered = useUserStore((s) => s.isRegistered)
  const userHydrated = useUserStore((s) => s._hasHydrated)
  const setRegistered = useUserStore((s) => s.setRegistered)

  const navigationReady = navigationState?.key != null
  const hasHydrated = identityHydrated && userHydrated

  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!useIdentityStore.getState()._hasHydrated) {
        useIdentityStore.getState().setHasHydrated(true)
      }
      if (!useUserStore.getState()._hasHydrated) {
        useUserStore.getState().setHasHydrated(true)
      }
    }, 1500)
    return () => clearTimeout(fallback)
  }, [])

  useEffect(() => {
    if (!hasHydrated || !isSupabaseConfigured) return
    if (useUserStore.getState().isRegistered) return

    restoreRegisteredStudent().then((result) => {
      if (!result) return
      usePetStore.getState().hydrateCoins(result.coins)
      setRegistered(result.studentId)
    })
  }, [hasHydrated, setRegistered])

  useEffect(() => {
    if (!hasHydrated || !isRegistered) return
    syncWalletAfterAuthentication().catch(() => {})
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncWalletAfterAuthentication().catch(() => {})
      }
    })
    return () => subscription.remove()
  }, [hasHydrated, isRegistered])

  useEffect(() => {
    if (!hasHydrated || !navigationReady) return

    const onStudentRegister = segments.at(1) === 'student-register'

    if (!isRegistered && !onStudentRegister) {
      router.replace('/onboarding/student-register')
      return
    }

    if (isRegistered && onStudentRegister) {
      router.replace('/(tabs)')
    }
  }, [hasHydrated, navigationReady, isRegistered, segments, router])

  useEffect(() => {
    if (hasHydrated) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [hasHydrated])

  return (
    <>
      {children}
      {!hasHydrated && (
        <View style={StyleSheet.absoluteFill} className="bg-white items-center justify-center px-8">
          <Image source={APP_LOADING} className="w-64 h-64" resizeMode="contain" />
        </View>
      )}
    </>
  )
}
