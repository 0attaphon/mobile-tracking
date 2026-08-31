import React from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { EmojiIcon } from '@/components/EmojiIcon'

interface AITipProps {
  petName: string
  tip: string | null
  isLoading?: boolean
}

export function AITip({ petName, tip, isLoading }: AITipProps) {
  return (
    <View className="bg-primary/20 border border-primary-light/30 rounded-2xl p-4 mx-0 mt-2">
      <View className="flex-row items-center gap-2 mb-2">
        <EmojiIcon name="cat" size={18} />
        <Text className="text-primary-light text-sm font-semibold">เคล็ดลับจาก{petName}</Text>
      </View>
      {isLoading ? (
        <View className="items-center py-2">
          <ActivityIndicator color="#5DB347" size="small" />
        </View>
      ) : (
        <Text className="text-white/80 text-sm leading-5">
          {tip ?? 'กำลังโหลดคำแนะนำ...'}
        </Text>
      )}
    </View>
  )
}
