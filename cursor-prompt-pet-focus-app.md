# Focus Group App — Cursor AI Prompt

## Project Overview

Build a React Native mobile app called **"Focus Group"** — a gamified screen time reduction app for middle school students. The core concept: **the less you use your phone, the happier your virtual pet grows.**

---

## Tech Stack

- **Framework**: React Native + Expo (SDK 51+)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind for RN)
- **State Management**: Zustand
- **Navigation**: React Navigation v6 (Bottom Tab + Stack)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **In-App Purchase**: RevenueCat
- **Face Detection**: Google ML Kit (on-device)
- **Analytics**: Mixpanel
- **Native Modules**: `react-native-device-info`, `@react-native-community/async-storage`

---

## Color Theme

```
Primary Green:   #2D6A2D  (dark)  / #5DB347 (light accent)
Secondary Yellow:#F5C518
Accent Orange:   #F57C00
Background:      #0F1A0F  (dark app bg)
Surface:         #1A2E1A  (cards)
Coin/Gold:       #F5C518
Gem/Orange:      #FF8C00
Danger:          #E24B4A
Text Primary:    #FFFFFF
Text Secondary:  #A0A878
```

---

## App Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home — pet screen
│   │   ├── focus.tsx          # Focus Mode
│   │   ├── stats.tsx          # Statistics
│   │   └── shop.tsx           # Item Shop
│   └── _layout.tsx
├── components/
│   ├── pet/
│   │   ├── PetAvatar.tsx      # Animated pet emoji/sprite
│   │   ├── StatBar.tsx        # HP / Happiness / EXP bars
│   │   └── StreakDots.tsx     # 7-day streak row
│   ├── focus/
│   │   ├── TimerRing.tsx      # Circular countdown timer
│   │   ├── TimeSelector.tsx   # 30m / 1h / 2h / 3h options
│   │   └── BlockedAppsList.tsx
│   ├── stats/
│   │   ├── AppUsageChart.tsx  # Bar chart of top apps
│   │   └── AITip.tsx          # AI recommendation card
│   └── shop/
│       ├── ItemGrid.tsx
│       └── ItemCard.tsx
├── stores/
│   ├── petStore.ts            # Pet state (hp, happiness, exp, level)
│   ├── focusStore.ts          # Active session state
│   ├── userStore.ts           # Auth + profile
│   └── shopStore.ts           # Coins, gems, owned items
├── services/
│   ├── firebase/
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── functions.ts
│   ├── usageStats.ts          # Android UsageStatsManager bridge
│   ├── appBlock.ts            # Accessibility Service bridge
│   ├── focusTimer.ts          # Foreground service timer
│   └── faceDetection.ts       # ML Kit face detection
├── hooks/
│   ├── useFocusSession.ts
│   ├── useScreenTime.ts
│   ├── usePetStatus.ts
│   └── useDailyQuest.ts
└── types/
    ├── pet.ts
    ├── focus.ts
    └── shop.ts
```

---

## Screen 1: Home (Pet Screen)

**File**: `src/app/(tabs)/index.tsx`

```
Layout (dark bg #0F0F1A):
┌─────────────────────────────┐
│ "สวัสดี [name]"   ⭐ [coins] │  ← header
├─────────────────────────────┤
│                             │
│     [PET EMOJI 72px]        │  ← animated, changes by mood
│   "วิ่งเล่น — มีความสุขมาก"  │
│      โปโป้  · Level 3       │
│                             │
│  Happiness ████████░░  82%  │  ← green bar
│  HP        ███████░░░  70%  │  ← teal bar
│  EXP       █████░░░░░  550/1000 │  ← amber bar
│                             │
│  Streak: จ อ พ [พฤ] ศ ส อา  │  ← 7 dots, today = amber
│                             │
│  [⏱ Focus Mode] [📊 Stats]  │  ← quick action cards
└─────────────────────────────┘
```

**Pet mood logic**:
- If `happiness > 70` → emoji = 🐱 (happy), mood text = "วิ่งเล่น"
- If `happiness` 40–70 → emoji = 😐 (neutral), mood text = "เฉยๆ"
- If `happiness < 40` → emoji = 😴 (sad), mood text = "ง่วงและเศร้า"

**Pet Zustand store** (`petStore.ts`):
```typescript
interface PetState {
  name: string
  species: 'cat' | 'dog' | 'rabbit' | 'hamster'
  level: number        // 1–20
  exp: number          // 0–1000 per level
  hp: number           // 0–100
  happiness: number    // 0–100
  coins: number
  gems: number
  equippedItems: string[]
  // Actions
  addExp: (amount: number) => void
  updateHappiness: (delta: number) => void
  addCoins: (amount: number) => void
}
```

---

## Screen 2: Focus Mode

**File**: `src/app/(tabs)/focus.tsx`

```
Layout:
┌─────────────────────────────┐
│  Focus Mode                 │
│  "วางโทรศัพท์ → โปโป้มีความสุข" │
│                             │
│      ╭───────────╮          │
│      │  25:00    │          │  ← TimerRing (SVG circle)
│      ╰───────────╯          │
│                             │
│  [30m +10⭐] [1h  +25⭐]    │
│  [2h  +60⭐] [3h +100⭐]    │
│                             │
│  [  เริ่มโฟกัส  ]            │  ← primary CTA button
│                             │
│  บล็อกระหว่าง session:       │
│  [TikTok❌][Insta❌][FB❌]   │
└─────────────────────────────┘
```

**Focus session flow**:
1. User selects duration → taps "เริ่มโฟกัส"
2. Start `ForegroundService` (Android) — shows persistent notification "กำลังโฟกัส..."
3. Every minute: check if user left app
4. On success: `addCoins(reward)`, `addExp(reward * 2)`, `updateHappiness(+10)`
5. On failure (left app): show fail screen, `updateHappiness(-5)`, no coins

**Coin rewards**:
```typescript
const FOCUS_REWARDS = {
  30: { coins: 10, label: '30 นาที' },
  60: { coins: 25, label: '1 ชั่วโมง' },
  120: { coins: 60, label: '2 ชั่วโมง' },
  180: { coins: 100, label: '3 ชั่วโมง' },
  240: { coins: 150, label: '4 ชั่วโมง' },
}
```

**App blocking** (Android only):
```typescript
// Requires BIND_ACCESSIBILITY_SERVICE permission
// Block list stored in Firestore per user, configurable by parent
const DEFAULT_BLOCKED_APPS = [
  'com.zhiliaoapp.musically',  // TikTok
  'com.instagram.android',
  'com.facebook.katana',
]
```

---

## Screen 3: Statistics

**File**: `src/app/(tabs)/stats.tsx`

Tabs: วันนี้ / สัปดาห์ / เดือน

**Data to display**:
```typescript
interface DayStats {
  totalScreenTime: number      // minutes
  unlockCount: number          // times phone unlocked
  focusSessionsCompleted: number
  focusSessionsFailed: number
  coinsEarned: number
  topApps: { name: string; packageName: string; minutes: number }[]
}
```

**AI Tip card** — call Firestore Cloud Function `generateAITip`:
```typescript
// Cloud Function input
{ userId, todayStats, yesterdayStats }

// Returns string like:
// "วันนี้ใช้ TikTok มากกว่าเมื่อวาน 30 นาที 
//  ลองตั้งเป้าลดลงอีก 20 นาทีพรุ่งนี้ไหม? โปโป้จะยิ้มแน่เลย!"
```

**App Usage — Android bridge** (`usageStats.ts`):
```typescript
// Native module wrapper for UsageStatsManager
// Requires PACKAGE_USAGE_STATS permission (user must grant in Settings)
export async function getTodayAppUsage(): Promise<AppUsage[]> {
  // Returns sorted list of apps by usage time today
}
```

---

## Screen 4: Shop

**File**: `src/app/(tabs)/shop.tsx`

Three sub-tabs: แต่งตัว / ห้อง / สัตว์

```typescript
interface ShopItem {
  id: string
  name: string           // Thai name
  emoji: string          // Display emoji
  category: 'outfit' | 'room' | 'pet'
  rarity: 'common' | 'rare' | 'legendary'
  price: number
  currency: 'coin' | 'gem'
  description: string
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat_school', name: 'หมวกนักเรียน', emoji: '🎓', category: 'outfit', rarity: 'common', price: 100, currency: 'coin' },
  { id: 'glasses_sun', name: 'แว่นกันแดด', emoji: '🕶️', category: 'outfit', rarity: 'common', price: 150, currency: 'coin' },
  { id: 'wings_butterfly', name: 'ปีกผีเสื้อ', emoji: '🦋', category: 'outfit', rarity: 'rare', price: 50, currency: 'gem' },
  { id: 'crown_gold', name: 'มงกุฎทอง', emoji: '👑', category: 'outfit', rarity: 'legendary', price: 100, currency: 'gem' },
  // room items
  { id: 'room_bed', name: 'เตียงนอน', emoji: '🛏️', category: 'room', rarity: 'common', price: 200, currency: 'coin' },
  { id: 'room_plant', name: 'ต้นไม้', emoji: '🌱', category: 'room', rarity: 'common', price: 80, currency: 'coin' },
]
```

**Gacha system** (no real money):
```typescript
// Costs 10 Gem per pull — Gems earned only via achievements/streaks
async function pullGacha(): Promise<ShopItem> {
  const roll = Math.random()
  if (roll < 0.60) return getRandomByRarity('common')
  if (roll < 0.90) return getRandomByRarity('rare')
  return getRandomByRarity('legendary')
}
```

---

## Firestore Data Structure

```
users/{userId}/
  ├── profile: { name, age, school, createdAt }
  ├── pet: { name, species, level, exp, hp, happiness, equippedItems[] }
  ├── wallet: { coins, gems }
  ├── streak: { currentStreak, lastFocusDate, longestStreak }
  └── ownedItems: string[]  // item IDs

users/{userId}/focusSessions/{sessionId}/
  ├── startTime, endTime, durationMinutes
  ├── status: 'completed' | 'failed' | 'in_progress'
  └── coinsEarned

users/{userId}/dailyStats/{date}/   // date = 'YYYY-MM-DD'
  ├── totalScreenTime, unlockCount
  ├── topApps: [{ packageName, minutes }]
  └── focusStats: { completed, failed, totalMinutes }

achievements/{userId}/
  └── earned: string[]  // achievement IDs
```

---

## Firebase Cloud Functions

```typescript
// functions/src/index.ts

// 1. Called when focus session completes
export const onFocusComplete = functions.firestore
  .document('users/{userId}/focusSessions/{sessionId}')
  .onUpdate(async (change, context) => {
    // Award coins, update pet EXP/happiness, check achievements
  })

// 2. Daily pet happiness decay (runs at midnight Thailand time)
export const dailyPetUpdate = functions.pubsub
  .schedule('0 0 * * *').timeZone('Asia/Bangkok')
  .onRun(async () => {
    // Reduce happiness by 10 if no focus session today
    // Reduce hp by 5 if happiness < 30
  })

// 3. Generate AI tip (called from app)
export const generateAITip = functions.https.onCall(async (data, context) => {
  const { todayStats, yesterdayStats } = data
  // Simple rule-based tips (no external AI needed for MVP)
  // Compare today vs yesterday, return Thai language tip string
})

// 4. Streak update (called after successful focus session)
export const updateStreak = functions.https.onCall(async (data, context) => {
  // Check if last focus was yesterday → increment streak
  // Check streak milestones → award bonus coins
})
```

---

## Streak Bonus System

```typescript
const STREAK_BONUSES: Record<number, number> = {
  1: 10,
  3: 30,
  7: 100,
  14: 200,
  30: 500,
}
```

---

## Daily Quest System

```typescript
interface DailyQuest {
  id: string
  title: string      // Thai
  target: number     // minutes or count
  type: 'focus' | 'screentime_limit' | 'no_phone_before_sleep'
  reward: { coins: number }
  completedAt?: Date
}

const DAILY_QUESTS: DailyQuest[] = [
  { id: 'focus_60', title: 'โฟกัส 1 ชั่วโมง', target: 60, type: 'focus', reward: { coins: 20 } },
  { id: 'no_phone_30', title: 'ไม่เล่นก่อนนอน 30 นาที', target: 30, type: 'no_phone_before_sleep', reward: { coins: 15 } },
  { id: 'screentime_120', title: 'Screen time ไม่เกิน 2 ชั่วโมง', target: 120, type: 'screentime_limit', reward: { coins: 20 } },
]
```

---

## Permissions Required (Android)

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
    tools:ignore="ProtectedPermissions"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE"/>
```

---

## Pet Evolution System

```typescript
const PET_EVOLUTION = {
  1:  { name: 'ลูกสัตว์',    emoji: '🐣', expRequired: 0 },
  5:  { name: 'วัยซน',       emoji: '🐱', expRequired: 4000 },
  10: { name: 'โตเต็มวัย',   emoji: '😸', expRequired: 9000 },
  20: { name: 'ร่างพิเศษ',   emoji: '✨🐱✨', expRequired: 19000 },
}

function getLevelTitle(level: number): string {
  if (level >= 20) return 'ร่างพิเศษ'
  if (level >= 10) return 'โตเต็มวัย'
  if (level >= 5) return 'วัยซน'
  return 'ลูกสัตว์'
}
```

---

## Achievement System

```typescript
const ACHIEVEMENTS = [
  { id: 'first_focus', title: 'โฟกัสครั้งแรก', desc: 'ทำ Focus session ครั้งแรก', icon: '🎯' },
  { id: 'streak_7', title: '7 วันต่อเนื่อง', desc: 'Streak 7 วัน', icon: '🔥', bonus: 100 },
  { id: 'streak_30', title: 'หนึ่งเดือนเต็ม', desc: 'Streak 30 วัน', icon: '💎', bonus: 500 },
  { id: 'level_10', title: 'สัตว์โตแล้ว!', desc: 'สัตว์เลี้ยงถึง Level 10', icon: '⭐' },
  { id: 'coins_1000', title: 'เศรษฐีน้อย', desc: 'มีเหรียญ 1,000', icon: '🪙' },
  { id: 'focus_master', title: 'Focus Master', desc: 'โฟกัสครบ 100 ชั่วโมงรวม', icon: '🏆' },
]
```

---

## Getting Started Commands

```bash
# 1. Create project
npx create-expo-app@latest pet-focus --template blank-typescript

# 2. Install dependencies
cd pet-focus
npx expo install expo-router react-native-safe-area-context react-native-screens

npm install zustand
npm install nativewind tailwindcss
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install firebase
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
npm install react-native-purchases   # RevenueCat
npm install @react-native-ml-kit/face-detection

# 3. Setup NativeWind
npx tailwindcss init

# 4. Run
npx expo start
```

---

## Important Notes for Cursor

1. **App blocking** requires `Accessibility Service` on Android — wrap in try/catch and show user instructions to enable it in Settings
2. **UsageStatsManager** needs user to manually grant permission in `Settings > Digital Wellbeing` — always check before calling
3. **iOS limitation** — full app blocking is NOT possible on iOS; use `Screen Time API` guidance only (no programmatic blocking)
4. **Foreground Service** MUST show a persistent notification while focus timer is running (Android requirement)
5. **All Thai text** — UI labels, error messages, AI tips should be in Thai language
6. **Dark theme only** for this app — use the color tokens defined above consistently
7. **Pet happiness never hits 0** — clamp at minimum 5 to avoid discouraging kids from continuing
