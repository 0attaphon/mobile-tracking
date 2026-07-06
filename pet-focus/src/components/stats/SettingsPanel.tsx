import React from 'react'
import { View, Text, TouchableOpacity, Alert, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { useAppTheme } from '@/hooks/useAppTheme'
import { useIdentityStore } from '@/stores/identityStore'
import { useCameraSettingsStore } from '@/stores/cameraSettingsStore'

export function SettingsPanel() {
  const router = useRouter()
  const { surface } = useAppTheme()
  const resetEnrollment = useIdentityStore((s) => s.resetEnrollment)
  const mirrorPreview = useCameraSettingsStore((s) => s.mirrorPreview)
  const shutterSound = useCameraSettingsStore((s) => s.shutterSound)
  const setMirrorPreview = useCameraSettingsStore((s) => s.setMirrorPreview)
  const setShutterSound = useCameraSettingsStore((s) => s.setShutterSound)

  function handleReEnroll() {
    Alert.alert(
      'ลงทะเบียนใบหน้าใหม่',
      'ข้อมูลใบหน้าเดิมจะถูกลบจากเครื่อง ต้องถ่ายใหม่ก่อนใช้เควสทำงานบ้าน',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลงทะเบียนใหม่',
          style: 'destructive',
          onPress: async () => {
            await resetEnrollment()
            router.replace('/onboarding/face-enroll')
          },
        },
      ]
    )
  }

  return (
    <View style={{ backgroundColor: surface }} className="mt-3 rounded-2xl p-4">
      <Text className="text-white font-semibold mb-2">ยืนยันตัวตน</Text>
      <Text className="text-text-secondary text-xs mb-3">
        ใช้สำหรับเควสทำงานบ้าน — เก็บเฉพาะข้อมูลตัวเลขบนเครื่อง ไม่เก็บรูป
      </Text>
      <TouchableOpacity
        onPress={handleReEnroll}
        className="rounded-xl py-3 items-center border border-white/20 mb-4"
      >
        <Text className="text-white font-semibold text-sm">ลงทะเบียนใบหน้าใหม่</Text>
      </TouchableOpacity>
      <Text className="text-text-secondary text-xs mb-2">ตั้งค่ากล้อง (ถ่ายรูป / เควส)</Text>
      <View className="flex-row items-center justify-between py-2">
        <Text className="text-white/80 text-sm flex-1 pr-2">กลับด้านภาพ (กล้องหน้า)</Text>
        <Switch
          value={mirrorPreview}
          onValueChange={setMirrorPreview}
          trackColor={{ false: '#3f4f46', true: '#5DB347' }}
          thumbColor="#fff"
        />
      </View>
      <View className="flex-row items-center justify-between py-2">
        <Text className="text-white/80 text-sm flex-1 pr-2">เสียงชัตเตอร์</Text>
        <Switch
          value={shutterSound}
          onValueChange={setShutterSound}
          trackColor={{ false: '#3f4f46', true: '#5DB347' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}
