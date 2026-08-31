import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { useAppTheme } from '@/hooks/useAppTheme'
import { EmojiIcon } from '@/components/EmojiIcon'

const MAX_NAME_LENGTH = 12

interface PetNameEditorProps {
  name: string
  textColor: string
  onRename: (name: string) => void
}

export function PetNameEditor({ name, textColor, onRename }: PetNameEditorProps) {
  const { surface } = useAppTheme()
  const [visible, setVisible] = useState(false)
  const [draft, setDraft] = useState(name)

  function openEditor() {
    setDraft(name)
    setVisible(true)
  }

  function closeEditor() {
    setVisible(false)
    setDraft(name)
  }

  function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) {
      Alert.alert('ชื่อไม่ถูกต้อง', 'กรุณาใส่ชื่อสัตว์เลี้ยง')
      return
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      Alert.alert('ชื่อไม่ถูกต้อง', `ชื่อต้องไม่เกิน ${MAX_NAME_LENGTH} ตัวอักษร`)
      return
    }
    onRename(trimmed)
    setVisible(false)
  }

  return (
    <>
      <TouchableOpacity
        onPress={openEditor}
        className="flex-row items-center gap-1 mt-1"
        activeOpacity={0.7}
      >
        <Text style={{ color: textColor }} className="text-xl font-bold">
          {name}
        </Text>
        <EmojiIcon name="pencil" size={14} style={{ opacity: 0.6 }} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View style={{ backgroundColor: surface }} className="rounded-t-3xl p-6">
            <Text className="text-white text-lg font-bold mb-1">เปลี่ยนชื่อสัตว์เลี้ยง</Text>
            <Text className="text-text-secondary text-sm mb-4">
              ตั้งชื่อใหม่ให้เพื่อนของคุณ (สูงสุด {MAX_NAME_LENGTH} ตัวอักษร)
            </Text>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="ชื่อสัตว์เลี้ยง"
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              className="bg-white/10 text-white rounded-xl px-4 py-3 mb-4 text-base"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={closeEditor}
                className="flex-1 py-3 rounded-xl border border-white/20 items-center"
              >
                <Text className="text-white/70 font-semibold">ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 py-3 rounded-xl bg-primary-light items-center"
              >
                <Text className="text-white font-bold">บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}
