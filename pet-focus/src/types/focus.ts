export type FocusSessionStatus = 'idle' | 'in_progress' | 'completed' | 'failed'

export interface FocusReward {
  coins: number
  label: string
}

export const FOCUS_REWARDS: Record<number, FocusReward> = {
  30: { coins: 15, label: '30 นาที' },
  60: { coins: 40, label: '1 ชั่วโมง' },
  120: { coins: 100, label: '2 ชั่วโมง' },
  180: { coins: 160, label: '3 ชั่วโมง' },
  240: { coins: 240, label: '4 ชั่วโมง' },
}

export interface FocusSession {
  id?: string
  startTime: Date
  endTime?: Date
  durationMinutes: number
  status: FocusSessionStatus
  coinsEarned: number
}

export interface DayStats {
  totalScreenTime: number
  unlockCount: number
  focusSessionsCompleted: number
  focusSessionsFailed: number
  coinsEarned: number
  topApps: AppUsage[]
}

export interface AppUsage {
  name: string
  packageName: string
  minutes: number
  iconBase64?: string
}

export type DailyQuestType = 'focus' | 'screentime_limit' | 'no_phone_before_sleep'

export interface DailyQuest {
  id: string
  title: string
  target: number
  type: DailyQuestType
  reward: { coins: number }
  completedAt?: Date
}

export type ChoreQuest = {
  id: string
  title: string
  description: string
  expectedLabels: string[]
  minConfidence: number
  minLabelMatches: number
  reward: { coins: number }
}

export const CHORE_QUESTS: ChoreQuest[] = [
  {
    id: 'chore_sweep',
    title: 'กวาดบ้าน',
    description: 'ถ่ายรูปขณะกำลังกวาดหรือหลังกวาดเสร็จ ให้เห็นทั้งใบหน้าและงาน',
    // ML Kit มักไม่ label "broom" — ใช้บริบทในบ้าน (room, chair, curtain, floor tile ฯลฯ)
    expectedLabels: [
      'broom',
      'mop',
      'sweep',
      'cleaning',
      'housekeeping',
      'floor',
      'tile',
      'indoor',
      'room',
      'home',
      'house',
      'living',
      'chair',
      'curtain',
      'pattern',
      'furniture',
    ],
    minConfidence: 0.5,
    minLabelMatches: 2,
    reward: { coins: 25 },
  },
  {
    id: 'chore_dishes',
    title: 'ล้างจาน',
    description: 'ถ่ายรูปขณะล้างจานหรือหลังล้างเสร็จ ให้เห็นทั้งใบหน้าและอ่าง/จาน',
    expectedLabels: [
      'dish',
      'dishes',
      'sink',
      'faucet',
      'kitchen',
      'tableware',
      'plate',
      'bowl',
      'cup',
      'water',
      'indoor',
      'room',
      'home',
    ],
    minConfidence: 0.5,
    minLabelMatches: 2,
    reward: { coins: 25 },
  },
  {
    id: 'chore_desk',
    title: 'จัดโต๊ะเรียน',
    description: 'ถ่ายรูปโต๊ะเรียนที่จัดเรียบร้อยแล้ว ให้เห็นทั้งใบหน้าและโต๊ะ',
    expectedLabels: [
      'desk',
      'table',
      'book',
      'study',
      'office',
      'chair',
      'computer',
      'laptop',
      'indoor',
      'room',
      'pattern',
      'curtain',
      'furniture',
    ],
    minConfidence: 0.5,
    minLabelMatches: 2,
    reward: { coins: 25 },
  },
  {
    id: 'chore_laundry',
    title: 'รีดเสื้อผ้า',
    description: 'ถ่ายรูปขณะรีดเสื้อผ้า ให้เห็นทั้งใบหน้าและเสื้อผ้า/เตารีด',
    expectedLabels: [
      'clothing',
      'clothes',
      'shirt',
      'iron',
      'laundry',
      'fabric',
      'textile',
      'appliance',
      'indoor',
      'room',
      'pattern',
      'curtain',
    ],
    minConfidence: 0.5,
    minLabelMatches: 2,
    reward: { coins: 25 },
  },
  {
    id: 'chore_water_plants',
    title: 'รดน้ำต้นไม้',
    description: 'ถ่ายรูปขณะรดน้ำต้นไม้หรือหลังรดเสร็จ ให้เห็นทั้งใบหน้าและต้นไม้',
    // ยังไม่เคยทดสอบบนอุปกรณ์จริง — เช็ค label จริงที่ ML Kit คืนก่อนใช้งานจริง (ดูแบบ chore_sweep)
    expectedLabels: [
      'plant',
      'houseplant',
      'flowerpot',
      'pot',
      'leaf',
      'flora',
      'watering can',
      'water',
      'green',
      'garden',
      'indoor',
      'room',
      'home',
    ],
    minConfidence: 0.5,
    minLabelMatches: 2,
    reward: { coins: 25 },
  },
  {
    id: 'chore_make_bed',
    title: 'จัดเตียงนอน',
    description: 'ถ่ายรูปเตียงที่จัดเรียบร้อยแล้ว ให้เห็นทั้งใบหน้าและเตียง',
    // ยังไม่เคยทดสอบบนอุปกรณ์จริง — เช็ค label จริงที่ ML Kit คืนก่อนใช้งานจริง (ดูแบบ chore_sweep)
    expectedLabels: [
      'bed',
      'bedroom',
      'bedding',
      'pillow',
      'blanket',
      'linens',
      'furniture',
      'room',
      'indoor',
      'home',
      'pattern',
      'textile',
    ],
    minConfidence: 0.5,
    minLabelMatches: 2,
    reward: { coins: 25 },
  },
]

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'focus_60', title: 'โฟกัส 1 ชั่วโมง', target: 60, type: 'focus', reward: { coins: 20 } },
  { id: 'no_phone_30', title: 'ไม่เล่นก่อนนอน 30 นาที', target: 30, type: 'no_phone_before_sleep', reward: { coins: 15 } },
  { id: 'screentime_120', title: 'Screen time ไม่เกิน 2 ชั่วโมง', target: 120, type: 'screentime_limit', reward: { coins: 20 } },
]

export const DEFAULT_BLOCKED_APPS = [
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok', emoji: '🎵' },
  { packageName: 'com.instagram.android', name: 'Instagram', emoji: '📸' },
  { packageName: 'com.facebook.katana', name: 'Facebook', emoji: '👤' },
  { packageName: 'com.netflix.mediaclient', name: 'Netflix', emoji: '🎥' },
  { packageName: 'com.google.android.youtube', name: 'YouTube', emoji: '🎥' },
]

export const STREAK_BONUSES: Record<number, number> = {
  1: 10,
  3: 30,
  7: 100,
  14: 200,
  30: 500,
}

export const THAI_DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

export type MoodValue = 1 | 2 | 3 | 4 | 5

export interface MoodEntry {
  date: string
  mood: MoodValue
  minutes: number
}

export const MOOD_OPTIONS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 1, emoji: '😣', label: 'แย่' },
  { value: 2, emoji: '😕', label: 'เหนื่อย' },
  { value: 3, emoji: '😐', label: 'เฉยๆ' },
  { value: 4, emoji: '🙂', label: 'ดี' },
  { value: 5, emoji: '😄', label: 'ดีมาก' },
]
