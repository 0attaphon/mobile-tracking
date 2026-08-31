import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { ThemedScreen } from '@/components/ThemedScreen'
import { useAppTheme } from '@/hooks/useAppTheme'
import { AppUsageChart } from '@/components/stats/AppUsageChart'
import { AITip } from '@/components/stats/AITip'
import { SettingsPanel } from '@/components/stats/SettingsPanel'
import { ClassLeaderboard } from '@/components/stats/ClassLeaderboard'
import { useScreenTime } from '@/hooks/useScreenTime'
import { useFocusStore, getSummary } from '@/stores/focusStore'
import { MOOD_OPTIONS } from '@/types/focus'
import { generateAITip } from '@/services/firebase/functions'
import { requestUsageStatsPermission } from '@/services/usageStats'
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '@/services/permissions'
import { DayStats } from '@/types/focus'
import { usePetStatus } from '@/hooks/usePetStatus'

type Tab = 'today' | 'week' | 'month'

const TABS: { key: Tab; label: string; days: number; period: string }[] = [
  { key: 'today', label: 'วันนี้', days: 1, period: 'วันนี้' },
  { key: 'week', label: 'สัปดาห์', days: 7, period: 'สัปดาห์นี้' },
  { key: 'month', label: 'เดือน', days: 30, period: 'เดือนนี้' },
]

export default function StatsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [aiTip, setAiTip] = useState<string | null>(null)
  const [tipLoading, setTipLoading] = useState(false)
  const { surface, text, textSecondary } = useAppTheme()

  const [notificationGranted, setNotificationGranted] = useState(true)

  const { name: petName } = usePetStatus()
  const { apps, totalMinutes, hasPermission, isLoading } = useScreenTime()
  const { currentStreak, totalFocusMinutes, moodLog, freezeTokens } = useFocusStore()

  const activeRange = TABS.find((t) => t.key === activeTab) ?? TABS[0]
  const summary = getSummary(moodLog, activeRange.days)
  const summaryHours = Math.floor(summary.focusMinutes / 60)
  const summaryMins = summary.focusMinutes % 60
  const moodEmoji =
    summary.avgMood != null
      ? MOOD_OPTIONS[Math.min(4, Math.round(summary.avgMood) - 1)].emoji
      : '—'

  useEffect(() => {
    checkNotificationPermission().then(setNotificationGranted)
  }, [])

  // Regenerate the tip once real usage data has loaded (and whenever it moves),
  // instead of once on mount with zeroed-out stats.
  useEffect(() => {
    if (isLoading) return
    let cancelled = false
    async function loadTip() {
      setTipLoading(true)
      const todaySummary = getSummary(useFocusStore.getState().moodLog, 1)
      const todayStats: DayStats = {
        totalScreenTime: totalMinutes,
        unlockCount: 0,
        focusSessionsCompleted: todaySummary.sessions,
        focusSessionsFailed: 0,
        coinsEarned: 0,
        topApps: apps,
      }
      const tip = await generateAITip(todayStats, todayStats, petName)
      if (!cancelled) {
        setAiTip(tip)
        setTipLoading(false)
      }
    }
    loadTip()
    return () => {
      cancelled = true
    }
  }, [isLoading, totalMinutes, petName])

  async function handleRequestNotification() {
    const granted = await requestNotificationPermission()
    setNotificationGranted(granted)
  }

  async function handleRequestUsageAccess() {
    await requestUsageStatsPermission()
  }

  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60

  return (
    <ThemedScreen>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pt-2 pb-4">
          <Text style={{ color: text }} className="text-2xl font-bold">สถิติ 📊</Text>
        </View>

        {/* Tabs */}
        <View style={{ backgroundColor: surface }} className="flex-row rounded-2xl p-1 mb-4">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl items-center ${
                activeTab === tab.key ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab.key ? 'text-white' : 'text-text-secondary'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary cards */}
        <View className="flex-row gap-3 mb-4">
          <View style={{ backgroundColor: surface }} className="flex-1 rounded-2xl p-4 items-center">
            <Text className="text-2xl font-bold text-white">
              {totalHours > 0 ? `${totalHours}ชม.` : `${totalMins}น.`}
            </Text>
            <Text className="text-text-secondary text-xs mt-1">Screen Time</Text>
          </View>
          <View style={{ backgroundColor: surface }} className="flex-1 rounded-2xl p-4 items-center">
            <Text className="text-2xl font-bold text-primary-light">{currentStreak}</Text>
            <Text className="text-text-secondary text-xs mt-1">วัน Streak</Text>
            {freezeTokens > 0 && (
              <Text className="text-primary-light text-[10px] mt-0.5">🧊 x{freezeTokens}</Text>
            )}
          </View>
          <View style={{ backgroundColor: surface }} className="flex-1 rounded-2xl p-4 items-center">
            <Text className="text-2xl font-bold text-yellow">{Math.floor(totalFocusMinutes / 60)}</Text>
            <Text className="text-text-secondary text-xs mt-1">ชม. โฟกัส</Text>
          </View>
        </View>

        {/* Notification permission */}
        {!notificationGranted && (
          <TouchableOpacity
            onPress={handleRequestNotification}
            className="bg-primary/10 border border-primary-light/30 rounded-2xl p-4 mb-4"
          >
            <Text className="text-primary-light text-sm font-semibold">🔔 ต้องการสิทธิ์แจ้งเตือน</Text>
            <Text style={{ color: textSecondary }} className="text-xs mt-1">
              กดที่นี่เพื่ออนุญาตการแจ้งเตือน (Focus session)
            </Text>
          </TouchableOpacity>
        )}

        {/* Usage permission warning */}
        {!hasPermission && (
          <TouchableOpacity
            onPress={handleRequestUsageAccess}
            className="bg-orange/10 border border-orange/30 rounded-2xl p-4 mb-4"
          >
            <Text className="text-orange text-sm font-semibold">⚠️ ต้องการสิทธิ์ Usage Access</Text>
            <Text style={{ color: textSecondary }} className="text-xs mt-1">
              กดที่นี่ → เปิด "Usage access" ให้ pet-focus → กลับมาดูสถิติ
            </Text>
          </TouchableOpacity>
        )}

        {/* Period summary (research-lite) */}
        <View style={{ backgroundColor: surface }} className="rounded-2xl p-4 mb-4">
          <Text className="text-white font-semibold mb-3">สรุป{activeRange.period} 📅</Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-primary-light text-xl font-bold">{summary.sessions}</Text>
              <Text className="text-text-secondary text-xs mt-1">โฟกัสสำเร็จ</Text>
            </View>
            <View className="items-center">
              <Text className="text-yellow text-xl font-bold">
                {summaryHours > 0 ? `${summaryHours}ชม. ${summaryMins}น.` : `${summaryMins} น.`}
              </Text>
              <Text className="text-text-secondary text-xs mt-1">เวลาโฟกัส</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl">{moodEmoji}</Text>
              <Text className="text-text-secondary text-xs mt-1">อารมณ์เฉลี่ย</Text>
            </View>
          </View>
          {summary.sessions === 0 && (
            <Text className="text-text-secondary text-xs text-center mt-3">
              ทำ Focus session แล้วบันทึกอารมณ์ เพื่อดูแนวโน้มของ{activeRange.period}
            </Text>
          )}
        </View>

        {/* AI Tip */}
        <AITip petName={petName} tip={aiTip} isLoading={tipLoading} />

        {/* App usage chart */}
        <View style={{ backgroundColor: surface }} className="mt-4 rounded-2xl p-4">
          <Text className="text-white font-semibold mb-3">แอปที่ใช้มากที่สุด</Text>
          <AppUsageChart apps={apps} />
        </View>

        {/* Focus stats */}
        <View style={{ backgroundColor: surface }} className="mt-3 rounded-2xl p-4">
          <Text className="text-white font-semibold mb-3">สถิติโฟกัส</Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-primary-light text-xl font-bold">{totalFocusMinutes}</Text>
              <Text className="text-text-secondary text-xs">นาทีรวม</Text>
            </View>
            <View className="items-center">
              <Text className="text-yellow text-xl font-bold">{currentStreak}</Text>
              <Text className="text-text-secondary text-xs">วัน Streak</Text>
            </View>
          </View>
        </View>

        {/* Class leaderboard */}
        <ClassLeaderboard />

        {/* Identity & camera settings */}
        <SettingsPanel />
      </ScrollView>
    </ThemedScreen>
  )
}
