import React from 'react'
import { View, Text, Dimensions, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedScreen } from '@/components/ThemedScreen'
import { EmojiIcon } from '@/components/EmojiIcon'
import { PetRive } from '@/components/pet/PetRive'
import { OutfitPicker } from '@/components/pet/OutfitPicker'
import { PetNameEditor } from '@/components/pet/PetNameEditor'
import { PetSwitcherSidebar } from '@/components/pet/PetSwitcherSidebar'
import { usePetStatus } from '@/hooks/usePetStatus'
import { useAppTheme } from '@/hooks/useAppTheme'
import { usePetStore } from '@/stores/petStore'
import { useRoomStore } from '@/stores/roomStore'
import { SHOP_ITEMS } from '@/types/shop'
import { getPetMood } from '@/types/pet'

const { height } = Dimensions.get('window')

export default function HomeScreen() {
  const router = useRouter()
  const { name, level, happiness, coins } = usePetStatus()
  const setPetName = usePetStore((s) => s.setPetName)
  const activePetId = usePetStore((s) => s.activePetId)
  const equippedItems = usePetStore((s) => s.equippedItems)
  const pendingRewardCoins = usePetStore((s) => s.pendingRewardCoins)
  const walletMigrationState = usePetStore((s) => s.walletMigrationState)
  const { placedDecorations } = useRoomStore()
  const { isLight, text: textColor, textSecondary } = useAppTheme()
  const mood = getPetMood(happiness)

  const surfaceColor = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)'

  const decorationItems = SHOP_ITEMS.filter(
    (item) => item.category === 'room' && placedDecorations.includes(item.id)
  )

  return (
    <ThemedScreen>

        {/* Top HUD */}
        <View className="flex-row items-center justify-between px-5 pt-1">
          <View style={{ backgroundColor: surfaceColor }} className="px-3 py-1.5 rounded-full">
            <Text style={{ color: textColor }} className="text-xs font-bold">Lv.{level}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/coin-history')}
            style={{ backgroundColor: surfaceColor }}
            className="items-end px-3 py-1.5 rounded-full"
          >
            <View className="flex-row items-center gap-1">
              <EmojiIcon name="star" size={14} />
              <Text style={{ color: '#FFD600' }} className="font-bold text-xs">{coins}</Text>
            </View>
            {pendingRewardCoins > 0 && (
              <Text style={{ color: textSecondary }} className="text-[9px]">
                +{pendingRewardCoins} รอยืนยัน
              </Text>
            )}
            {walletMigrationState === 'legacy_pending' && (
              <Text style={{ color: '#FFB74D' }} className="text-[9px]">กำลังย้ายยอดเดิม</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Decorations in room */}
        {decorationItems.length > 0 && (
          <View className="flex-row flex-wrap px-4 pt-2 gap-2">
            {decorationItems.map((item) => (
              <View key={item.id} style={{ backgroundColor: surfaceColor }} className="px-2 py-1 rounded-xl flex-row items-center gap-1">
                <Text className="text-xl">{item.emoji}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pet */}
        <View className="flex-1 items-center justify-center" pointerEvents="box-none">
          <OutfitPicker surfaceColor={surfaceColor} textColor={textColor} />
          <PetSwitcherSidebar surfaceColor={surfaceColor} textColor={textColor} />
          <PetRive activePetId={activePetId} size={height * 0.42} equippedItems={equippedItems} />
          <PetNameEditor name={name} textColor={textColor} onRename={setPetName} />
          <Text style={{ color: textSecondary }} className="text-xs mt-0.5">
            {mood === 'happy' ? 'มีความสุข 😊' : mood === 'neutral' ? 'ปกติ 😐' : 'เศร้า 😿'}
          </Text>
        </View>

        {/* Stat bars */}
        <View className="mx-6 mb-4 gap-2">
          <StatRow emoji="😊" value={happiness} color="#4CAF50" trackColor={isLight ? '#E0E0E0' : 'rgba(255,255,255,0.15)'} textColor={textColor} />
        </View>


    </ThemedScreen>
  )
}

function StatRow({ emoji, value, color, trackColor, textColor }: {
  emoji: string; value: number; color: string; trackColor: string; textColor: string
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-sm w-5">{emoji}</Text>
      <View style={{ backgroundColor: trackColor }} className="flex-1 h-2 rounded-full overflow-hidden">
        <View style={{ width: `${value}%`, backgroundColor: color }} className="h-full rounded-full" />
      </View>
      <Text style={{ color: textColor }} className="text-xs w-8 text-right">{value}</Text>
    </View>
  )
}
