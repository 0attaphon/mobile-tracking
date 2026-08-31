import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { TimerRing } from '@/components/focus/TimerRing'
import { TimeSelector } from '@/components/focus/TimeSelector'
import { BlockedAppsList } from '@/components/focus/BlockedAppsList'
import { MoodCheckIn } from '@/components/focus/MoodCheckIn'
import { ThemedScreen } from '@/components/ThemedScreen'
import { EmojiIcon } from '@/components/EmojiIcon'
import { useFocusSession } from '@/hooks/useFocusSession'
import { usePetStatus } from '@/hooks/usePetStatus'
import { useAppTheme } from '@/hooks/useAppTheme'
import { getCoinsForDuration, useFocusStore } from '@/stores/focusStore'
import { MoodValue } from '@/types/focus'

export default function FocusScreen() {
  const { status, isPaused, selectedMinutes, remainingSeconds, begin, cancel, reset, selectDuration, lastReward } =
    useFocusSession()
  const { name } = usePetStatus()
  const { surface, text, textSecondary } = useAppTheme()
  const logMood = useFocusStore((s) => s.logMood)
  const [moodStep, setMoodStep] = useState(false)

  const isActive = status === 'in_progress'
  const isDone = status === 'completed'
  const isFailed = status === 'failed'

  function handleMoodSelect(mood: MoodValue) {
    logMood(mood, selectedMinutes)
    setMoodStep(false)
    reset()
  }

  function handleMoodSkip() {
    setMoodStep(false)
    reset()
  }

  return (
    <ThemedScreen>
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="pt-2 pb-4">
          <Text style={{ color: text }} className="text-2xl font-bold">Focus Mode ⏱</Text>
          <Text style={{ color: textSecondary }} className="text-sm mt-0.5">
            วางโทรศัพท์ → {name}มีความสุข 🐱
          </Text>
        </View>

        {/* Timer */}
        <View className="items-center my-4">
          <TimerRing
            remainingSeconds={remainingSeconds}
            totalSeconds={selectedMinutes * 60}
            size={220}
            isPaused={isPaused}
          />
        </View>

        {/* Duration selector */}
        <TimeSelector
          selectedMinutes={selectedMinutes}
          onSelect={selectDuration}
          disabled={isActive}
        />

        {/* Reward preview */}
        <View className="flex-row justify-center items-center gap-2 my-4 ">
          <Text style={{ color: textSecondary }} className="text-sm">รางวัลที่ได้รับ:</Text>
          <Text className="text-yellow font-bold">+{getCoinsForDuration(selectedMinutes)} ⭐</Text>
          <Text className="text-primary-light font-bold">+{getCoinsForDuration(selectedMinutes) * 2} EXP</Text>
        </View>

        {/* CTA Button */}
        {!isActive ? (
          <TouchableOpacity
            onPress={begin}
            activeOpacity={0.8}
            className="bg-primary-light rounded-2xl py-4 items-center mx-2"
          >
            <Text className="text-white text-lg font-bold">เริ่มโฟกัส 🚀</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={cancel}
            activeOpacity={0.8}
            className="bg-danger/20 border border-danger/50 rounded-2xl py-4 items-center mx-2"
          >
            <Text className="text-danger text-base font-semibold">ยกเลิก Session</Text>
          </TouchableOpacity>
        )}

        {/* Blocked apps list */}
        <BlockedAppsList />
      </View>

      {/* Success Modal */}
      <Modal visible={isDone && !moodStep} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-8">
          <View style={{ backgroundColor: surface }} className="rounded-3xl p-8 items-center w-full">
            <EmojiIcon name="party_popper" size={48} style={{ marginBottom: 12 }} />
            <Text className="text-white text-xl font-bold">โฟกัสสำเร็จ!</Text>
            <Text className="text-text-secondary text-sm mt-2 text-center">
              {name}มีความสุขมากขึ้นเลย
            </Text>
            <View className="flex-row gap-4 mt-4 mb-2">
              <View className="items-center">
                <Text className="text-yellow text-2xl font-bold">
                  +{lastReward?.coins ?? getCoinsForDuration(selectedMinutes)}
                </Text>
                <Text className="text-text-secondary text-xs">เหรียญ ⭐</Text>
              </View>
              <View className="items-center">
                <Text className="text-primary-light text-2xl font-bold">+10</Text>
                <Text className="text-text-secondary text-xs">ความสุข 😊</Text>
              </View>
            </View>
            {lastReward?.usedFreeze ? (
              <Text className="text-primary-light text-xs font-semibold mb-1">
                🧊 ใช้ Streak Freeze รักษาสตรีคไว้ให้
              </Text>
            ) : null}
            {lastReward?.catchUpApplied ? (
              <Text className="text-yellow text-xs font-semibold mb-1">
                🔥 โบนัสกลับมาโฟกัส! เหรียญ 2 เท่า
              </Text>
            ) : null}
            {lastReward && lastReward.streakBonus > 0 ? (
              <Text className="text-primary-light text-xs font-semibold mb-4">
                +{lastReward.streakBonus} โบนัสต่อเนื่อง 🔥
              </Text>
            ) : (
              <View className="mb-4" />
            )}
            <TouchableOpacity
              onPress={() => setMoodStep(true)}
              className="bg-primary-light rounded-xl py-3 px-8"
            >
              <Text className="text-white font-bold">ต่อไป</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mood Check-in Modal */}
      <Modal visible={isDone && moodStep} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-8">
          <View style={{ backgroundColor: surface }} className="rounded-3xl p-8 w-full">
            <MoodCheckIn onSelect={handleMoodSelect} onSkip={handleMoodSkip} />
          </View>
        </View>
      </Modal>

      {/* Failed Modal */}
      <Modal visible={isFailed} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-8">
          <View style={{ backgroundColor: surface }} className="rounded-3xl p-8 items-center w-full">
            <EmojiIcon name="seedling" size={48} style={{ marginBottom: 12 }} />
            <Text className="text-white text-xl font-bold">ไม่เป็นไรนะ ไว้ลองใหม่!</Text>
            <Text className="text-text-secondary text-sm mt-2 text-center">
              {name}ยังรอเล่นกับเราอยู่ — เริ่มใหม่เมื่อพร้อมได้เลย 💚
            </Text>
            <TouchableOpacity
              onPress={reset}
              className="bg-primary-light rounded-xl py-3 px-8 mt-6"
            >
              <Text className="text-white font-bold">ลองใหม่</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  )
}
