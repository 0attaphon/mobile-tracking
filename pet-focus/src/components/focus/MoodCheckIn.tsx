import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { MOOD_OPTIONS, MoodValue } from '@/types/focus'
import { EmojiIcon } from '@/components/EmojiIcon'

interface MoodCheckInProps {
  onSelect: (mood: MoodValue) => void
  onSkip: () => void
}

export function MoodCheckIn({ onSelect, onSkip }: MoodCheckInProps) {
  return (
    <View className="items-center">
      <Text className="text-white text-xl font-bold">ตอนนี้รู้สึกยังไงบ้าง?</Text>
      <Text className="text-text-secondary text-sm mt-1 text-center">
        บันทึกอารมณ์หลังโฟกัส เพื่อดูแนวโน้มของตัวเอง
      </Text>

      <View className="flex-row justify-between gap-1 mt-5 mb-6 w-full">
        {MOOD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            className="flex-1 items-center py-3 rounded-2xl bg-white/5 border border-white/10"
          >
            <EmojiIcon char={opt.emoji} size={32} />
            <Text className="text-text-secondary text-[10px] mt-1">{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={onSkip} className="py-2">
        <Text className="text-text-secondary text-sm">ข้ามไปก่อน</Text>
      </TouchableOpacity>
    </View>
  )
}
