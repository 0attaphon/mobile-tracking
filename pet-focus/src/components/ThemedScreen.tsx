import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppTheme } from '@/hooks/useAppTheme'

interface ThemedScreenProps {
  children: React.ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}

export function ThemedScreen({ children, edges }: ThemedScreenProps) {
  const { bg, gradient } = useAppTheme()
  return (
    <View style={StyleSheet.absoluteFillObject}>
      {gradient ? (
        <LinearGradient
          colors={gradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: bg }]} />
      )}
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  )
}

export function ThemedCard({ children, style, className }: {
  children: React.ReactNode
  style?: object
  className?: string
}) {
  const { surface } = useAppTheme()
  return (
    <View style={[{ backgroundColor: surface, borderRadius: 16 }, style]}>
      {children}
    </View>
  )
}
