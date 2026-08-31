import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedScreen } from '@/components/ThemedScreen'
import { useAppTheme } from '@/hooks/useAppTheme'
import { EmojiIcon } from '@/components/EmojiIcon'
import { ChoreQuestList } from '@/components/quests/ChoreQuestList'
import { usePetStore } from '@/stores/petStore'
import { useIdentityStore } from '@/stores/identityStore'

export default function QuestsScreen() {
  const router = useRouter()
  const coins = usePetStore((s) => s.coins)
  const faceEnrolled = useIdentityStore((s) => s.faceEnrolled)
  const { text, textSecondary } = useAppTheme()

  return (
    <ThemedScreen>
      <View className="flex-1 px-5 pt-2">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text style={{ color: text }} className="text-2xl font-bold">เควสทำงานบ้าน</Text>
            <Text style={{ color: textSecondary }} className="text-sm mt-1">ทำเควสรายวัน รับเหรียญ ⭐</Text>
          </View>
          <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-white/10">
            <EmojiIcon name="star" size={14} />
            <Text className="text-accent font-bold text-xs">{coins}</Text>
          </View>
        </View>

        {!faceEnrolled ? (
          <View className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-4">
            <Text className="text-accent font-semibold text-sm">ลงทะเบียนใบหน้าก่อนส่งเควส</Text>
            <Text style={{ color: textSecondary }} className="text-xs mt-1">
              ใช้ยืนยันตัวตนเมื่อส่งเควส — เก็บเฉพาะข้อมูลตัวเลขบนเครื่อง ไม่เก็บรูป
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/onboarding/face-enroll?returnTo=quests')}
              className="mt-3 bg-accent rounded-xl py-3 items-center"
            >
              <Text className="text-background font-bold text-sm">ลงทะเบียนใบหน้า</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ChoreQuestList />
      </View>
    </ThemedScreen>
  )
}
