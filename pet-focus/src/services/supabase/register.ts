import * as Application from 'expo-application'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { isSupabaseConfigured, supabase } from './client'

const DEVICE_ID_KEY = 'pet_focus_device_id'

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId()
    if (androidId) return androidId
  }

  if (Platform.OS === 'ios') {
    const iosId = await Application.getIosIdForVendorAsync()
    if (iosId) return iosId
  }

  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (stored) return stored

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated)
  return generated
}

export type RegisterStudentResult =
  | { ok: true; studentId: string; coins: number }
  | { ok: false; code: string; message: string }

function mapRegisterError(message: string): RegisterStudentResult {
  const lower = message.toLowerCase()

  if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('over_email_send')
  ) {
    return {
      ok: false,
      code: 'RATE_LIMIT',
      message: 'โดน rate limit จาก Supabase — รอ 15–60 นาที แล้วลองใหม่',
    }
  }
  if (lower.includes('anonymous') && (lower.includes('disabled') || lower.includes('provider'))) {
    return {
      ok: false,
      code: 'ANON_DISABLED',
      message: 'เปิด Anonymous sign-ins ใน Supabase (Authentication → Providers)',
    }
  }
  if (message.includes('STUDENT_ALREADY_REGISTERED')) {
    return {
      ok: false,
      code: 'STUDENT_ALREADY_REGISTERED',
      message: 'รหัสนักเรียนนี้ลงทะเบียนแล้ว',
    }
  }
  if (message.includes('DEVICE_ALREADY_REGISTERED')) {
    return {
      ok: false,
      code: 'DEVICE_ALREADY_REGISTERED',
      message: 'เครื่องนี้ลงทะเบียนแล้ว',
    }
  }
  if (message.includes('ALREADY_REGISTERED')) {
    return {
      ok: false,
      code: 'ALREADY_REGISTERED',
      message: 'บัญชีนี้ลงทะเบียนแล้ว — ลองปิดแอปแล้วเปิดใหม่',
    }
  }
  if (lower.includes('foreign key') || lower.includes('violates foreign key constraint')) {
    return {
      ok: false,
      code: 'RESTORE_FAILED',
      message: 'กู้คืนบัญชีไม่สำเร็จ — ลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
    }
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return {
      ok: false,
      code: 'NETWORK',
      message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต',
    }
  }

  if (__DEV__) {
    return { ok: false, code: 'UNKNOWN', message: `ลงทะเบียนไม่สำเร็จ: ${message}` }
  }
  return { ok: false, code: 'UNKNOWN', message: 'ลงทะเบียนไม่สำเร็จ ลองใหม่อีกครั้ง' }
}

export async function ensureStudentSession(): Promise<void> {
  if (!isSupabaseConfigured) return

  const { data } = await supabase.auth.getSession()
  if (data.session) return

  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function registerStudent(studentId: string): Promise<RegisterStudentResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า Supabase ใน .env' }
  }

  const normalized = studentId.trim()
  if (!normalized) {
    return { ok: false, code: 'INVALID', message: 'กรุณาใส่รหัสนักเรียน' }
  }

  try {
    await ensureStudentSession()
    const deviceId = await getDeviceId()

    const { data, error } = await supabase.rpc('register_student', {
      p_student_id: normalized,
      p_device_id: deviceId,
    })

    if (error) {
      return mapRegisterError(error.message)
    }

    const row = Array.isArray(data) ? data[0] : data
    const registeredId = row?.student_id ?? normalized
    const coins = typeof row?.coins === 'number' ? row.coins : 0
    return { ok: true, studentId: registeredId, coins }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UNKNOWN'
    return mapRegisterError(message)
  }
}

export async function restoreRegisteredStudent(): Promise<{ studentId: string; coins: number } | null> {
  if (!isSupabaseConfigured) return null

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      await ensureStudentSession()
    }
  } catch {
    return null
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) return null

  const { data, error } = await supabase
    .from('students')
    .select('student_id, coins')
    .eq('id', sessionData.session.user.id)
    .maybeSingle()

  if (error || !data) return null
  return { studentId: data.student_id, coins: typeof data.coins === 'number' ? data.coins : 0 }
}
