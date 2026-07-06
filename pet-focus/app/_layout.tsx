import '../global.css'
import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Buffer } from 'buffer'
import { IdentityGate } from '@/components/onboarding/IdentityGate'
import { requestNotificationPermission } from '@/services/permissions'
import { usePetStore } from '@/stores/petStore'

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

export default function RootLayout() {
  const petHydrated = usePetStore((s) => s._hasHydrated)

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    // Dev convenience: seed coins only when the wallet is empty, so it never
    // wipes a balance you're actively testing spending/earning against.
    if (__DEV__ && petHydrated && usePetStore.getState().coins === 0) {
      usePetStore.setState({ coins: 10000 })
    }
  }, [petHydrated])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0F2820" />
        <IdentityGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/student-register" />
            <Stack.Screen name="onboarding/face-enroll" />
          </Stack>
        </IdentityGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
