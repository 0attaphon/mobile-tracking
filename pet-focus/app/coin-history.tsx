import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { ThemedScreen } from '@/components/ThemedScreen'
import { useAppTheme } from '@/hooks/useAppTheme'
import {
  fetchCoinHistory,
  type CoinHistoryEntry,
  type CoinTransactionType,
} from '@/services/supabase/wallet'

const TRANSACTION_LABELS: Record<CoinTransactionType, string> = {
  focus_reward: 'รางวัลโฟกัส',
  chore_reward: 'รางวัลเควสงานบ้าน',
  outdoor_reward: 'รางวัลกิจกรรมนอกบ้าน',
  shop_purchase: 'ซื้อสินค้า',
  admin_deduction: 'ปรับยอดโดยผู้ดูแล',
  legacy_import: 'นำเข้าของที่เคยเป็นเจ้าของ',
}

export default function CoinHistoryScreen() {
  const router = useRouter()
  const { text, textSecondary, surface, border } = useAppTheme()
  const [entries, setEntries] = useState<CoinHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setEntries(await fetchCoinHistory())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  return (
    <ThemedScreen>
      <View className="flex-1 px-5 pt-2">
        <View className="flex-row items-center mb-5">
          <TouchableOpacity onPress={() => router.back()} className="pr-4 py-2">
            <Text style={{ color: text }} className="text-xl">‹</Text>
          </TouchableOpacity>
          <Text style={{ color: text }} className="text-2xl font-bold">ประวัติเหรียญ</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#9FE870" className="mt-10" />
        ) : failed ? (
          <View className="items-center py-10">
            <Text style={{ color: textSecondary }} className="text-center mb-4">
              โหลดประวัติเหรียญไม่ได้ กรุณาเชื่อมต่ออินเทอร์เน็ต
            </Text>
            <TouchableOpacity onPress={load} className="bg-accent px-5 py-3 rounded-xl">
              <Text className="text-background font-bold">ลองใหม่</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(entry) => entry.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={
              <Text style={{ color: textSecondary }} className="text-center mt-10">
                ยังไม่มีรายการเหรียญ
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={{ backgroundColor: surface, borderColor: border }}
                className="border rounded-2xl px-4 py-3 mb-3 flex-row items-center"
              >
                <View className="flex-1 pr-3">
                  <Text style={{ color: text }} className="font-semibold">
                    {TRANSACTION_LABELS[item.transactionType]}
                  </Text>
                  <Text style={{ color: textSecondary }} className="text-xs mt-1">
                    {new Date(item.createdAt).toLocaleString('th-TH')}
                  </Text>
                  <Text style={{ color: textSecondary }} className="text-xs mt-1">
                    ยอดคงเหลือ {item.balanceAfter} ⭐
                  </Text>
                </View>
                <Text
                  className={`font-bold text-base ${item.delta >= 0 ? 'text-green-400' : 'text-red-300'}`}
                >
                  {item.delta > 0 ? '+' : ''}{item.delta} ⭐
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </ThemedScreen>
  )
}
