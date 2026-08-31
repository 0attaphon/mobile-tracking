import React from 'react'
import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppTheme } from '@/hooks/useAppTheme'
import { EmojiIcon } from '@/components/EmojiIcon'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.5 }} className="items-center justify-center w-8 h-8">
      <EmojiIcon char={emoji} size={20} />
    </View>
  )
}

function TabBarBackground() {
  const { bg, gradient } = useAppTheme()
  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    )
  }
  return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: bg }]} />
}

export default function TabsLayout() {
  const { isLight } = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#FFC94D',
        tabBarInactiveTintColor: isLight ? 'rgba(26,35,126,0.45)' : '#FAE7CB',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐱" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'โฟกัส',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⏱" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'เควส',
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'สถิติ',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'ร้านค้า',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
