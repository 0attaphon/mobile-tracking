import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { usePetStore } from '@/stores/petStore'
import { useUserStore } from '@/stores/userStore'
import { useShopStore } from '@/stores/shopStore'
import { EmojiIcon } from '@/components/EmojiIcon'
import { PET_CATALOG, PetId, isPetOwned } from '@/types/pet'

interface PetSwitcherSidebarProps {
  surfaceColor: string
  textColor: string
}

export function PetSwitcherSidebar({ surfaceColor, textColor }: PetSwitcherSidebarProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const activePetId = usePetStore((s) => s.activePetId)
  const setActivePet = usePetStore((s) => s.setActivePet)
  const ownedItems = useUserStore((s) => s.ownedItems)
  const setActiveCategory = useShopStore((s) => s.setActiveCategory)

  function handleSelect(petId: PetId) {
    if (petId === activePetId) {
      setExpanded(false)
      return
    }

    if (!isPetOwned(petId, ownedItems)) {
      Alert.alert(
        'ยังไม่มีสัตว์ตัวนี้',
        'ไปซื้อที่ร้านค้าแท็บสัตว์ได้เลย',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ไปร้านค้า',
            onPress: () => {
              setActiveCategory('pet')
              router.push('/(tabs)/shop')
            },
          },
        ]
      )
      return
    }
    setActivePet(petId)
    setExpanded(false)
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {expanded && (
        <View style={[styles.menu, { backgroundColor: surfaceColor }]}>
          {PET_CATALOG.map((pet) => {
            const owned = isPetOwned(pet.id, ownedItems)
            const active = activePetId === pet.id
            return (
              <TouchableOpacity
                key={pet.id}
                onPress={() => handleSelect(pet.id)}
                style={[
                  styles.menuItem,
                  active && styles.menuItemActive,
                ]}
                activeOpacity={0.7}
              >
                {owned ? <EmojiIcon char={pet.emoji} size={22} /> : <EmojiIcon name="lock" size={22} />}
                <Text
                  style={[
                    styles.menuLabel,
                    { color: textColor },
                    !owned && styles.menuLabelLocked,
                  ]}
                  numberOfLines={1}
                >
                  {pet.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={[styles.toggle, { backgroundColor: surfaceColor }]}
        activeOpacity={0.8}
      >
        {expanded ? <Text style={styles.toggleIcon}>›</Text> : <EmojiIcon name="paw_prints" size={18} />}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    top: '38%',
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  menu: {
    borderRadius: 16,
    padding: 6,
    gap: 4,
    minWidth: 72,
  },
  menuItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 201, 77, 0.25)',
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  menuLabelLocked: {
    opacity: 0.5,
  },
  toggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    fontSize: 18,
  },
})
