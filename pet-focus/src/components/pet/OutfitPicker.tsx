import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useAppTheme } from '@/hooks/useAppTheme'
import { EmojiIcon } from '@/components/EmojiIcon'
import { usePetStore } from '@/stores/petStore'
import { useUserStore } from '@/stores/userStore'
import { OUTFIT_ITEMS, ShopItem } from '@/types/shop'

interface OutfitPickerProps {
  surfaceColor: string
  textColor: string
}

export function OutfitPicker({ surfaceColor, textColor }: OutfitPickerProps) {
  const router = useRouter()
  const { surface } = useAppTheme()
  const { equippedItems, equipItem } = usePetStore()
  const ownedItems = useUserStore((s) => s.ownedItems)
  const [visible, setVisible] = useState(false)

  const ownedOutfits = OUTFIT_ITEMS.filter((item) => ownedItems.includes(item.id))

  function handleToggle(item: ShopItem) {
    equipItem(item.id)
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{ backgroundColor: surfaceColor }}
        className="absolute left-5 top-1 px-3 py-2 rounded-full flex-row items-center gap-1"
        activeOpacity={0.7}
      >
        <EmojiIcon name="dress" size={16} />
        <Text style={{ color: textColor }} className="text-xs font-semibold">แต่งตัว</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View style={{ backgroundColor: surface }} className="rounded-t-3xl p-6 max-h-[70%]">
            <Text className="text-white text-lg font-bold mb-1">เครื่องแต่งกาย</Text>
            <Text className="text-text-secondary text-sm mb-4">
              แตะเพื่อสวม/ถอด (ใส่ได้หลายชิ้นพร้อมกัน)
            </Text>

            {ownedOutfits.length === 0 ? (
              <View className="items-center py-8">
                <EmojiIcon name="shopping_bags" size={40} style={{ marginBottom: 8 }} />
                <Text className="text-text-secondary text-sm text-center mb-4">
                  ยังไม่มีเครื่องแต่งกาย{'\n'}ไปซื้อที่ร้านค้าก่อนนะ
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setVisible(false)
                    router.push('/(tabs)/shop')
                  }}
                  className="bg-primary-light px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-bold">ไปร้านค้า</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap gap-3 pb-2">
                  {ownedOutfits.map((item) => {
                    const isEquipped = equippedItems.includes(item.id)
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleToggle(item)}
                        className={`w-[30%] items-center p-3 rounded-2xl border-2 ${
                          isEquipped ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5'
                        }`}
                      >
                        {item.image ? (
                          <Image source={item.image} style={{ width: 40, height: 40 }} resizeMode="contain" />
                        ) : (
                          <EmojiIcon char={item.emoji} size={32} style={{ marginBottom: 4 }} />
                        )}
                        <Text className="text-white text-xs font-semibold text-center mt-1" numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text className={`text-[10px] mt-1 ${isEquipped ? 'text-accent' : 'text-text-secondary'}`}>
                          {isEquipped ? '✓ สวมอยู่' : 'แตะเพื่อสวม'}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setVisible(false)}
              className="mt-4 py-3 rounded-xl border border-white/20 items-center"
            >
              <Text className="text-white/70 font-semibold">ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}
