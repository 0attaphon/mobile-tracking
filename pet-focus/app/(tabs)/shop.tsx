import React, { useCallback, useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, Alert, Image } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ThemedScreen } from '@/components/ThemedScreen'
import { useAppTheme } from '@/hooks/useAppTheme'
import { EmojiIcon } from '@/components/EmojiIcon'
import { ItemGrid } from '@/components/shop/ItemGrid'
import { useShopStore } from '@/stores/shopStore'
import { usePetStore } from '@/stores/petStore'
import { useUserStore } from '@/stores/userStore'
import { useRoomStore } from '@/stores/roomStore'
import { SHOP_ITEMS, ShopItem, ItemCategory } from '@/types/shop'
import { isPetOwned } from '@/types/pet'
import { usePurchaseStore } from '@/stores/purchaseStore'

const CATEGORY_TABS: { key: ItemCategory; label: string; emoji: string }[] = [
  { key: 'outfit', label: 'แต่งตัว', emoji: '👗' },
  { key: 'background', label: 'พื้นหลัง', emoji: '🎨' },
  // { key: 'room', label: 'ของตกแต่ง', emoji: '🏠' },
  { key: 'pet', label: 'สัตว์', emoji: '🐾' },
]

export default function ShopScreen() {
  const { activeCategory, setActiveCategory } = useShopStore()
  const {
    coins,
    pendingRewardCoins,
    walletMigrationState,
    equipItem,
    equippedItems,
    setActivePet,
    activePetId,
  } = usePetStore()
  const { ownedItems, _hasHydrated: userHydrated } = useUserStore()
  const studentId = useUserStore((s) => s.studentId)
  const inventoryMigrationState = useUserStore((s) => s.inventoryMigrationState)
  const isSubmitting = usePurchaseStore((s) => s.isSubmitting)
  const pendingPurchase = usePurchaseStore((s) => s.pendingPurchase)
  const submitPurchase = usePurchaseStore((s) => s.submitPurchase)
  const restorePendingPurchase = usePurchaseStore((s) => s.restorePendingPurchase)
  const refreshShop = usePurchaseStore((s) => s.refreshShop)
  const catalog = usePurchaseStore((s) => s.catalog)
  const petHydrated = usePetStore((s) => s._hasHydrated)
  const storageReady = userHydrated && petHydrated
  const { setBackground, toggleDecoration, selectedBgId, placedDecorations } = useRoomStore()
  const { surface, text } = useAppTheme()
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)

  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!usePetStore.getState()._hasHydrated) {
        usePetStore.getState().setHasHydrated(true)
      }
      if (!useUserStore.getState()._hasHydrated) {
        useUserStore.getState().setHasHydrated(true)
      }
    }, 1500)
    return () => clearTimeout(fallback)
  }, [])

  useEffect(() => {
    if (studentId) restorePendingPurchase(studentId).catch(() => {})
  }, [restorePendingPurchase, studentId])

  useFocusEffect(
    useCallback(() => {
      if (studentId && inventoryMigrationState === 'ready') refreshShop().catch(() => {})
    }, [inventoryMigrationState, refreshShop, studentId])
  )

  // Server catalog is the price purchase_shop_item charges; SHOP_ITEMS.price is
  // only an offline fallback until the first catalog fetch succeeds.
  const priceOf = (item: ShopItem) => catalog?.prices[item.id] ?? item.price
  const filteredItems = SHOP_ITEMS.filter((i) => i.category === activeCategory).map((i) => ({
    ...i,
    price: priceOf(i),
  }))

  function handleItemPress(item: ShopItem) {
    if (item.category === 'pet' && item.petId) {
      if (!isPetOwned(item.petId, ownedItems)) {
        setSelectedItem(item)
        return
      }
      setActivePet(item.petId)
      return
    }

    if (!ownedItems.includes(item.id)) {
      setSelectedItem(item)
      return
    }
    // Already owned — apply/toggle
    if (item.category === 'background') {
      setBackground(selectedBgId === item.id ? null : item)
    } else if (item.category === 'room') {
      toggleDecoration(item.id)
    } else {
      equipItem(item.id)
    }
  }

  async function handleBuy() {
    if (!selectedItem || !storageReady || !studentId || isSubmitting) return

    const { id } = selectedItem

    if (selectedItem.category === 'pet' && selectedItem.petId) {
      if (isPetOwned(selectedItem.petId, ownedItems)) {
        setActivePet(selectedItem.petId)
        setSelectedItem(null)
        return
      }
    } else if (ownedItems.includes(id)) {
      setSelectedItem(null)
      return
    }

    if (walletMigrationState !== 'ready') {
      Alert.alert('กำลังเตรียมกระเป๋าเหรียญ', 'รอให้ตรวจสอบยอดเดิมเสร็จก่อนซื้อสินค้า')
      return
    }
    if (!usePurchaseStore.getState().catalog) await refreshShop().catch(() => {})
    const catalogVersion = usePurchaseStore.getState().catalog?.version
    if (catalogVersion === undefined) {
      Alert.alert('โหลดราคาสินค้าไม่สำเร็จ', 'ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง')
      return
    }
    const purchased = await submitPurchase(studentId, id, catalogVersion)
    if (!purchased) {
      const error = usePurchaseStore.getState().lastError
      if (error === 'INSUFFICIENT_COINS') {
        Alert.alert('⭐ เหรียญไม่พอ', `ยอดเหรียญที่ยืนยันแล้วไม่พอซื้อ ${selectedItem.name}`)
      } else if (error === 'CATALOG_ITEM_UNAVAILABLE') {
        refreshShop().catch(() => {})
        Alert.alert('ราคาสินค้ามีการเปลี่ยนแปลง', 'ระบบโหลดรายการสินค้าล่าสุดแล้ว ลองตรวจสอบแล้วซื้ออีกครั้ง')
      } else if (error === 'OFFLINE') {
        const retained = usePurchaseStore.getState().pendingPurchase?.itemId === id
        Alert.alert(
          'การเชื่อมต่อขาดหาย',
          retained
            ? 'คำขอเดิมถูกเก็บไว้แล้ว กดซื้ออีกครั้งเมื่อออนไลน์เพื่อเช็กผลด้วย UUID เดิม'
            : 'การซื้อต้องเชื่อมต่ออินเทอร์เน็ต'
        )
      } else {
        Alert.alert('ซื้อไม่สำเร็จ', 'ลองใหม่อีกครั้งโดยระบบจะตรวจสอบคำขอเดิมให้')
      }
      return
    }

    if (selectedItem.category === 'pet' && selectedItem.petId) {
      setActivePet(selectedItem.petId)
      Alert.alert('สำเร็จ!', `ได้ ${selectedItem.name} แล้ว 🎉`)
    } else if (selectedItem.category === 'background') {
      setBackground(selectedItem)
    } else if (selectedItem.category === 'room') {
      toggleDecoration(id)
    } else if (selectedItem.category === 'outfit') {
      equipItem(id)
    }
    setSelectedItem(null)
  }

  return (
    <ThemedScreen>
      <View className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2 pb-3">
          <Text style={{ color: text }} className="text-2xl font-bold">ร้านค้า 🛍️</Text>
          <View style={{ backgroundColor: surface }} className="items-end px-3 py-1.5 rounded-full">
            <View className="flex-row items-center gap-1">
              <EmojiIcon name="star" size={16} />
              <Text className="text-yellow font-bold text-sm">{coins}</Text>
            </View>
            {pendingRewardCoins > 0 && (
              <Text className="text-text-secondary text-[9px]">+{pendingRewardCoins} รอยืนยัน</Text>
            )}
            {walletMigrationState === 'legacy_pending' && (
              <Text className="text-orange-300 text-[9px]">กำลังย้ายยอดเดิม</Text>
            )}
          </View>
        </View>

        {/* Category tabs */}
        <View style={{ backgroundColor: surface }} className="flex-row rounded-2xl p-1 mb-3">
          {CATEGORY_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveCategory(tab.key)}
              className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1 ${activeCategory === tab.key ? 'bg-primary' : ''
                }`}
            >
              <EmojiIcon char={tab.emoji} size={14} />
              <Text
                className={`text-xs font-semibold ${activeCategory === tab.key ? 'text-white' : 'text-text-secondary'
                  }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Item Grid */}
        <ItemGrid
          items={filteredItems}
          ownedItems={ownedItems}
          equippedItems={equippedItems}
          activePetId={activePetId}
          onItemPress={handleItemPress}
        />
      </View>

      {/* Purchase Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View style={{ backgroundColor: surface }} className="rounded-t-3xl p-6">
            {selectedItem && (
              <>
                <View className="items-center mb-4">
                  {selectedItem.bgColor ? (
                    <View style={{ backgroundColor: selectedItem.bgColor, width: 80, height: 80, borderRadius: 16, marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <EmojiIcon char={selectedItem.emoji} size={40} />
                    </View>
                  ) : selectedItem.image ? (
                    <Image
                      source={selectedItem.image}
                      style={{ width: 80, height: 80, marginBottom: 8 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <EmojiIcon char={selectedItem.emoji} size={64} style={{ marginBottom: 8 }} />
                  )}
                  <Text className="text-white text-lg font-bold">{selectedItem.name}</Text>
                  <Text className="text-text-secondary text-sm mt-2 text-center">
                    {selectedItem.description}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setSelectedItem(null)}
                    className="flex-1 py-3 rounded-xl border border-white/20 items-center"
                  >
                    <Text className="text-white/70 font-semibold">ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleBuy}
                    disabled={!storageReady || isSubmitting || walletMigrationState !== 'ready' || inventoryMigrationState !== 'ready'}
                    className={`flex-1 py-3 rounded-xl items-center ${!storageReady || isSubmitting || walletMigrationState !== 'ready' || inventoryMigrationState !== 'ready'
                        ? 'bg-primary/40'
                        : 'bg-primary-light'
                      }`}
                  >
                    <Text className="text-white font-bold">
                      {!storageReady
                        ? 'กำลังโหลด...'
                        : walletMigrationState !== 'ready' || inventoryMigrationState !== 'ready'
                          ? 'กำลังตรวจสอบยอดเดิม...'
                          : isSubmitting
                            ? 'กำลังซื้อ...'
                            : pendingPurchase?.itemId === selectedItem.id
                              ? 'ลองคำขอเดิมอีกครั้ง'
                              : `ซื้อ ${priceOf(selectedItem)} ⭐`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ThemedScreen>
  )
}
