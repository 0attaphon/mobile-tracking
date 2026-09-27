import '../global.css'
import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Buffer } from 'buffer'
import { IdentityGate } from '@/components/onboarding/IdentityGate'
import { requestNotificationPermission } from '@/services/permissions'

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermission()
  }, [])

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
