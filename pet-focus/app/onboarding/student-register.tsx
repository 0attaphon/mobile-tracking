import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { registerStudent } from '@/services/supabase/register'
import { useUserStore } from '@/stores/userStore'
import { usePetStore } from '@/stores/petStore'

export default function StudentRegisterScreen() {
  const router = useRouter()
  const setRegistered = useUserStore((s) => s.setRegistered)
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const result = await registerStudent(studentId)
      if (!result.ok) {
        setError(result.message)
        return
      }
      usePetStore.getState().hydrateCoins(result.coins)
      setRegistered(result.studentId)
      router.replace('/(tabs)')
    } catch {
      setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center"
      >
        <Text className="text-white text-3xl font-bold mb-2">ลงทะเบียน</Text>
        <Text className="text-white/60 text-base mb-8">
          ใส่รหัสนักเรียนของคุณ (1 รหัสต่อ 1 เครื่อง)
        </Text>

        <Text className="text-white/70 text-sm font-medium mb-2">รหัสนักเรียน</Text>
        <TextInput
          value={studentId}
          onChangeText={setStudentId}
          placeholder="เช่น 12345"
          placeholderTextColor="rgba(255,255,255,0.4)"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-surface text-white rounded-2xl px-4 py-4 text-lg mb-4 border border-white/10"
        />

        {error ? <Text className="text-danger text-sm mb-4">{error}</Text> : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !studentId.trim()}
          activeOpacity={0.8}
          className={`rounded-2xl py-4 items-center ${
            loading || !studentId.trim() ? 'bg-white/10' : 'bg-accent'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#FFC94D" />
          ) : (
            <Text
              className={`text-lg font-bold ${
                !studentId.trim() ? 'text-white/40' : 'text-background'
              }`}
            >
              ถัดไป
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
