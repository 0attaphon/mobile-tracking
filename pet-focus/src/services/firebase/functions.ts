import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './config'
import { DayStats } from '@/types/focus'
import { DEFAULT_PET_NAME } from '@/types/pet'

const functions = getFunctions(app, 'asia-southeast1')

export async function generateAITip(
  todayStats: DayStats,
  yesterdayStats: DayStats,
  petName: string = DEFAULT_PET_NAME
): Promise<string> {
  const name = petName.trim() || DEFAULT_PET_NAME
  try {
    const fn = httpsCallable<
      { todayStats: DayStats; yesterdayStats: DayStats; petName: string },
      { tip: string }
    >(functions, 'generateAITip')
    const result = await fn({ todayStats, yesterdayStats, petName: name })
    return result.data.tip
  } catch {
    return generateLocalTip(todayStats, yesterdayStats, name)
  }
}

function generateLocalTip(today: DayStats, yesterday: DayStats, petName: string): string {
  if (today.totalScreenTime > yesterday.totalScreenTime + 30) {
    const diff = today.totalScreenTime - yesterday.totalScreenTime
    return `วันนี้ใช้โทรศัพท์มากกว่าเมื่อวาน ${diff} นาที ลองตั้งเป้าลดลงพรุ่งนี้ไหม? ${petName}จะยิ้มแน่เลย! 🐱`
  }
  if (today.focusSessionsCompleted > 0) {
    return `เก่งมากเลย! วันนี้โฟกัสไปแล้ว ${today.focusSessionsCompleted} session 🎯 ${petName}ภูมิใจในตัวนายมากเลย`
  }
  if (today.totalScreenTime > 120) {
    return `วันนี้ใช้โทรศัพท์ไปนานแล้ว ลองพักสักครู่แล้วมาโฟกัสด้วยกันไหม? ${petName}รอนายอยู่! 💪`
  }
  return `วันนี้เป็นวันที่ดี ลองทำ Focus session สั้นๆ สัก 30 นาทีไหม? ${petName}จะมีความสุขมากเลย! 🌟`
}
