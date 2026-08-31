import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAppTheme } from '@/hooks/useAppTheme'
import { fetchClassLeaderboard, ClassLeaderboardEntry } from '@/services/supabase/sync'

export function ClassLeaderboard() {
  const { surface } = useAppTheme()
  const [entries, setEntries] = useState<ClassLeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      const data = await fetchClassLeaderboard()
      if (!cancelled) {
        setEntries(data)
        setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View style={{ backgroundColor: surface }} className="mt-3 rounded-2xl p-4">
      <Text className="text-white font-semibold mb-3">อันดับห้อง (สัปดาห์นี้) 🏆</Text>

      {isLoading ? (
        <ActivityIndicator color="#5DB347" />
      ) : entries.length === 0 ? (
        <Text className="text-text-secondary text-xs text-center py-2">
          ยังไม่มีข้อมูลอันดับ หรือยังไม่ได้ระบุห้องเรียน — ติดต่อครูผู้ดูแล
        </Text>
      ) : (
        <View>
          {entries.map((entry, idx) => (
            <View
              key={entry.studentId ?? `${entry.rank}-${entry.nickname}-${idx}`}
              className={`flex-row items-center justify-between py-2 px-2 rounded-xl mb-1 ${
                entry.isMe ? 'bg-primary/20 border border-primary-light/40' : ''
              }`}
            >
              <View className="flex-row items-center flex-1">
                <Text
                  className={`w-8 text-sm ${
                    entry.isMe ? 'text-primary-light font-bold' : 'text-text-secondary'
                  }`}
                >
                  #{entry.rank}
                </Text>
                <Text
                  className={`text-sm flex-1 ${
                    entry.isMe ? 'text-white font-bold' : 'text-white/80'
                  }`}
                  numberOfLines={1}
                >
                  {entry.nickname}
                </Text>
              </View>
              <Text
                className={`text-sm ${
                  entry.isMe ? 'text-primary-light font-bold' : 'text-text-secondary'
                }`}
              >
                {entry.focusMinutes} นาที
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
