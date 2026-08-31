# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

ทุกครั้งที่ มีการแก้ อะไร ให้มาอัพเดตไฟล์นี้ด้วยว่ามี feature อะไร logic อะไรบ้าง เพื่อตอนอ่านจะได้รู้ว่าโปรเจคนี้มีโครงสร้างยังไง แต่ละ feature ทำงานยังไง

---

# BUDDY RISE — ภาพรวมโปรเจกต์

แอปช่วยลดเวลาใช้มือถือสำหรับนักเรียน โดยใช้สัตว์เลี้ยงเสมือนเป็นแรงจูงใจ (เสริมแรงเชิงบวก) ทำ Focus session → สัตว์เลี้ยงมีความสุข + ได้เหรียญ/EXP ไปแต่งตัว/ตกแต่งห้อง

- **Stack:** Expo SDK 52 (RN 0.76), expo-router, NativeWind (Tailwind), Zustand, Firebase (AI tip), **Supabase** (register + sync), Rive
- **ต้องใช้ dev client** (`npx expo run:android`) — **ห้ามใช้ Expo Go** เพราะมี native modules: `AppBlockModule`, Rive, ML Kit, TFLite, expo-camera
- **แพลตฟอร์มหลัก:** Android (block แอป / usage stats ทำงานเฉพาะ Android)

## วิธีรัน (สำคัญ)

```bash
cd pet-focus
npm start              # auto: adb reverse + localhost (USB/emulator) หรือ LAN (Wi‑Fi)
npm run start:tunnel   # ถ้า Wi‑Fi ต่อไม่ได้
npm run android        # build dev client ครั้งแรก
```

- **ห้ามใช้** `npx expo start` ตรงๆ — จะได้ LAN IP `192.168.x.x` ที่ emulator/USB มักเข้าไม่ได้
- **Emulator / USB:** ใช้ `npm start` (รัน `adb reverse` ให้อัตโนมัติ)
- **มือถือจริง (Wi‑Fi อย่างเดียว):** `npm start` หรือ `npm run start:tunnel`
- โมเดลใบหน้า: `assets/models/mobile_face_net.tflite` (ต้องเป็นไฟล์ binary จริง ไม่ใช่ HTML)
- ไอคอนแอป: `assets/icon_pet.png` · Splash/loading: `assets/pet_loading.png`
- Rive: แมว (`pet_cat.riv`) · แมวส้ม/หมา (`pet_dog_and_cat.riv`, input `cat/dog`: false=แมวส้ม, true=หมา); outfit inputs ทุกสัตว์: `straw_hat`, `wizard_hat`, `sunglass`, `hat`, `hat2`–`hat10`, `hood`, `suit`, `coat`, `uniform`, `glass2` (ไฟล์ cloud `Pet_cat` มี layer/input ครบแล้ว — export `.riv` ใหม่ทับ `assets/rive/pet_cat.riv` ต้องอัปเกรดแพลนของ Rive ก่อน MCP export ไม่ได้; `pet_dog_and_cat.riv` ยังไม่ยืนยันว่ามี input ชุดใหม่ ต้องเปิดไฟล์นั้นเช็ค/เพิ่ม layer ให้ตรงกันถ้าต้องการให้หมา/แมวส้มใส่ชุดใหม่ได้ด้วย)
- **Outfit ชุดใหม่ (hat11, hat12, suit2–suit6) ผูกผ่าน ViewModel คนละกลไกกับของเดิม 19 ชิ้น:** ตัวเดิมทั้งหมดเป็น legacy SMI boolean input ยิงตรงผ่าน `setInputState(stateMachineName, name, value)`; 7 ชิ้นใหม่นี้ไม่มี transition ผูกกับ SMI input เลย ตัวควบคุมจริงคือ ViewModel `"Hats"` (instance `"Main"`, default view model ของ artboard) — ต้องยิงผ่าน `ref.setBoolean(name, value)` แทน และต้องเปิด `dataBinding={AutoBind(true)}` บน `<Rive>` ให้ ViewModel instance bind เข้ากับ artboard ก่อน ถึงจะมีผล ชื่อ input ทั้ง 7 ตัวอยู่ใน `VIEW_MODEL_BOUND_OUTFIT_INPUTS` (`types/pet.ts`) — `PetRive.tsx` เช็ค list นี้เพื่อเลือกยิง `setBoolean` หรือ `setInputState` ต่อ input แต่ละตัว ถ้าเพิ่ม outfit ใหม่ผ่าน ViewModel อีกต้องเติมชื่อใน list นี้ด้วย (ไม่ทำแล้วเครื่องแต่งกายจะซื้อ/สวมได้ใน UI แต่ตัวสัตว์ไม่เปลี่ยนภาพ — silent no-op)
- `pet_dog_and_cat.riv` มี input ใหม่ครบแล้ว (`hat11`, `hat12`, `suit2`–`suit6`) แต่ยังไม่ export ทับไฟล์จริงใน `assets/rive/` (Rive MCP export ถูก sandbox บล็อกเขียนไฟล์ทุก path — ต้อง export มือผ่านเมนู editor เอง) — `pet_cat.riv` ยังไม่ตรวจ (อยู่คนละ tab ใน Rive editor, MCP เห็นแค่ tab active) ต้องเปิด tab `pet_cat` แล้วเช็ค/export ให้ตรงกันก่อนของใหม่จะโชว์บนแมวธรรมดาได้

## โครงสร้างหน้า (app/(tabs)/)
- `index.tsx` — หน้า Home: สัตว์เลี้ยง (Rive + เครื่องแต่งกาย), HUD, stat bar, ของตกแต่ง, **แต่งตัว** (`OutfitPicker`), **แตะชื่อเปลี่ยนชื่อ**, **sidebar สลับสัตว์** (`PetSwitcherSidebar`)
- `focus.tsx` — Focus Mode: เลือกเวลา, timer ring, เริ่ม/ยกเลิก, modal สำเร็จ + **mood check-in**, modal fail (เชิงบวก)
- `quests.tsx` — **เควสทำงานบ้าน**: ถ่ายรูป in-app เท่านั้น (**ตัดปุ่มเลือกจากคลังออกแล้ว** — กันเอารูปเก่า/รูปจากที่อื่นมาส่ง) → ML Kit ตรวจ label + เทียบใบหน้า (local) + เช็ค hash รูปซ้ำ → รับเหรียญ, ไม่เก็บรูป; แบนเนอร์ลงทะเบียนใบหน้าถ้ายังไม่ enroll
- `shop.tsx` — ร้านค้า: ซื้อด้วยเหรียญ ⭐; แท็บแต่งตัว (PNG thumbnail) · แท็บสัตว์ → ซื้อหมา/แมวส้ม และสลับ active pet
- `stats.tsx` — สถิติ: screen time วันนี้, streak (+ freeze token คงเหลือ), สรุปสัปดาห์, AI tip, กราฟแอป, **อันดับห้อง (Class Leaderboard)**, ตั้งชื่อเล่นที่เพื่อนเห็น, **ลงทะเบียนใบหน้าใหม่**

## Onboarding (app/onboarding/)
- `student-register.tsx` — **ครั้งแรก**: ใส่รหัสนักเรียน → Supabase anonymous auth + RPC `register_student` (1 รหัส = 1 เครื่อง) → เข้า tabs ทันที; UI ใช้ `bg-background` + `text-white`/`text-white/60` (เหมือน tabs)
- `face-enroll.tsx` — ลงทะเบียนใบหน้า (**ไม่บังคับ**): เปิดจากหน้าเควสหรือ Stats; ML Kit + MobileFaceNet → SecureStore (ไม่เก็บรูป); มี skip + `returnTo=quests`

## UI theme (NativeWind)
- `tailwind.config.js` — สีหลัก (ค่าเริ่มต้น/ปุ่ม-badge เท่านั้น ไม่ใช้กับพื้นหลังหน้าจอ): `background`/`bg` `#0F2820`, `surface` `#1A3D2E`, `accent` `#FFC94D`, `text-secondary` `#FAE7CB`
- **ระบบสีพื้นหลัง (runtime, unified)** — ทุกหน้า tabs (รวมหน้าหลัก) ใช้ `ThemedScreen` ตัวเดียวกันวาดพื้นหลังจาก `useAppTheme()`: solid `selectedBgColor` หรือ `LinearGradient(selectedBgGradient)` ถ้าไอเทมตั้ง gradient ไว้; `useAppTheme` คำนวณ `isLight` จาก luminance เฉลี่ยของ gradient (หรือของ `selectedBgColor` ถ้าไม่มี gradient) แล้วสลับ `text`/`textSecondary`/`border` เข้ม-อ่อนให้เอง — ห้าม hardcode `text-white`/`text-white/60` ทับพื้นหลังตรง ๆ อีก (ใช้ได้เฉพาะข้อความบนปุ่ม/การ์ด `surface` ที่มืดคงที่อยู่แล้ว) ไม่งั้นจะอ่านไม่ออกเมื่อผู้ใช้เปลี่ยนพื้นหลังเป็นสีอ่อน
- แถบเมนู (`app/(tabs)/_layout.tsx`) ใช้ `tabBarBackground` วาดพื้นหลังเดียวกันกับหน้า (ไม่ใช่สีทึบ `tabBarColor` แยกอีกต่อไป — ฟิลด์นี้ถูกลบออกจาก `ShopItem`/`roomStore` แล้ว) และสลับสี tint ของแท็บตาม `isLight`
- **ไอคอน (แทน emoji font)** — ไอคอนที่ยืนเดี่ยว (tab bar, ปุ่ม, badge เหรียญ, mood face, ไอเทมร้านค้าที่ไม่มี `image`) render ผ่าน `<EmojiIcon name="..."/>` หรือ `<EmojiIcon char="🐱"/>` (`src/components/EmojiIcon.tsx`) เป็นรูป PNG จาก [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0) เก็บไว้ใน `assets/emoji/*.png` — ไม่ใช่ font emoji ของเครื่อง (แต่ละ Android เรนเดอร์ไม่เหมือนกัน) รายชื่อ asset + map ตัวอักษร→asset อยู่ที่ `src/assets/emojiAssets.ts`/`emojiAssetNames.ts`; emoji ที่ฝังอยู่กลางประโยค/ข้อความ (เช่น "โฟกัสสำเร็จ! 🎉", `Alert.alert`) ยังคงเป็น text เดิม — ไม่แปลง เพิ่มไอคอนใหม่: หา asset ที่ต้องการใน Twemoji แล้วเพิ่มเข้า 2 ไฟล์นั้น

## Navigation / Auth gate
- `app/_layout.tsx` — Root Stack + `IdentityGate`
- `IdentityGate` — flow: `!isRegistered` → student-register → tabs; restore session จาก Supabase; flush sync queue; **ไม่บังคับ** face-enroll

## Stores (Zustand, src/stores/)
- `petStore` — name/level/exp/happiness/coins, `activePetId`, `species`, equippedItems; `setActivePet/setPetName/...`; **persist** `name`, `activePetId`, `species`, `coins`, `equippedItems` (`pet-storage`). `addCoins`/`spendCoins` push the delta to `students.coins` server-side via `syncCoinDelta` (`sync.ts`, offline-queued, atomic `increment_student_coins` RPC) so a reinstall restores the balance instead of resetting to 0 — `hydrateCoins(coins)` is called with the server value right after `registerStudent`/`restoreRegisteredStudent` succeed (`student-register.tsx`, `IdentityGate.tsx`)
- `userStore` — `studentId`, `isRegistered` (**persist**), `nickname` (**persist**, ชื่อเล่นที่เพื่อนร่วมห้องเห็นบน leaderboard — แยกจากชื่อสัตว์เลี้ยงใน `petStore`), ownedItems; `setRegistered(studentId)`, `setNickname`
- `focusStore` — สถานะ session (`idle`/`in_progress`/`completed`/`failed`), `isPaused`, timer, streak, totalFocusMinutes, **moodLog (persist AsyncStorage)**; helper `getCoinsForDuration`, `getSummary`; **`STREAK_BONUSES`** ให้โบนัสเหรียญเมื่อสตรีคถึง 1/3/7/14/30 วัน; **catch-up**: ขาดสตรีคแล้วกลับมาโฟกัสภายในเงื่อนไข (สตรีคเดิม ≥3, ไม่มี freeze) → เหรียญ 2 เท่าครั้งเดียว (`catchUpAvailable`); **Streak Freeze** (`freezeTokens`, สะสมสูงสุด 3, ได้ +1 ทุกสตรีคครบ 7 วัน) — ถ้ามี freeze ตอนขาดสตรีค จะใช้อัตโนมัติรักษาสตรีคไว้แทนการขาด (ไม่ได้โบนัส catch-up ซ้ำ)
- `choreQuestStore` — สถานะเควสทำงานบ้านรายวัน (completedAt, retryCount), daily reset, ให้ coins ตอน complete; สุ่ม 3-5 เควส/วันจาก pool 26 ข้อ (`todayQuestIds`, seed คงที่ต่อวันด้วย `pickDailyQuestIds`); เก็บ `recentHashes` (hash รูป 5 รูปล่าสุดต่อเควส, local เท่านั้น) กันส่งรูปเดิมซ้ำ
- `identityStore` — `faceEnrolled` flag (AsyncStorage) + sync กับ SecureStore embedding
- `shopStore` — activeCategory
- `roomStore` — พื้นหลัง/สี theme/ของตกแต่งที่วาง

## Hooks (src/hooks/)
- `useFocusSession` — คุม flow โฟกัส: ขอสิทธิ์แจ้งเตือน + Usage Access → start/complete/fail/pause/resume; native events `onFocusTick`, `onFocusPaused`, `onFocusResumed`, `onBlockedAppDetected`, `onFocusComplete`; ให้รางวัลตอนสำเร็จ; **fail ไม่มี penalty**
- `usePetStatus`, `useScreenTime`, `useDailyQuest`, `useAppTheme`

## Services (src/services/)
- `appBlock.ts`, `focusTimer.ts` — เรียก native `AppBlockModule` / `FocusForegroundService` (pause/resume/fail ตาม foreground app); Android ใช้ `FocusForegroundService` (FGS) นับถอยหลัง + แสดง notification ขณะเบื้องหลัง; UI timer sync จาก `onFocusTick.remainingSeconds` (native เป็น source of truth); fallback JS `setInterval` + `tickSecond()` ถ้า native ล้ม
- `permissions.ts` — ขอสิทธิ์แจ้งเตือน (Android 13+) สำหรับ notification นับถอยหลัง; เปิด Settings ได้จาก Stats
- `usageStats.ts` — Usage Access + ดึง screen time ผ่าน `AppBlockModule`
- `faceVerifier.ts` — enroll/verify ใบหน้า (ML Kit + MobileFaceNet TFLite), embedding ใน SecureStore; enroll ต้องใบหน้าใหญ่ (~25% กว้างภาพ), verify เควสยอมเล็กกว่า (~8%) เพื่อเห็นงานบ้านในภาพ
- `choreVerifier.ts` — ตรวจเควสตามลำดับ: verifyFace → เช็ค hash รูปซ้ำ (`isDuplicateHash`, เจอซ้ำ = reject ทันทีไม่ต้องรัน ML Kit) → ML Kit image labeling (log label ใน console/`__DEV__` alert); `expectedLabels` ปรับตาม label จริงที่ ML Kit คืน (เช่น room+chair ไม่ใช่ broom); ผ่านครบถึง `recordHash`
- `../utils/imageHash.ts` — `hashImageFile(uri)`: อ่านไฟล์ผ่าน `expo-file-system` (base64) แล้ว SHA-1 ผ่าน `expo-crypto`; ใช้เทียบรูปซ้ำเท่านั้น ไม่เก็บ/ไม่อัปโหลดรูป
- `firebase/` — config, functions (AI tip เท่านั้น)
- `supabase/` — `client.ts`, `register.ts` (anon auth + RPC, คืน `coins` ปัจจุบันมาด้วยตอน register/restore), `sync.ts` (focus/daily_usage/chore/coin_delta ผ่าน offline queue + `syncNickname`/`fetchClassLeaderboard` แบบ best-effort ไม่ผ่าน queue)

## Admin Web (`admin-web/`)
- Next.js App Router + Supabase SSR · deploy บน **Vercel** (Root Directory = `admin-web`)
- `/login` — admin **username**/password (map ไป auth email ผ่าน RPC `lookup_admin_email`)
- `/` — dashboard สรุปนักเรียน / focus วันนี้ / screen time
- `/students`, `/students/[id]` — รายละเอียด focus, screen time 7 วัน, chore; ปุ่ม **พิมพ์/บันทึกสรุป** (`PrintSummaryButton`, `window.print()`, ซ่อนตัวเองใน `print:hidden`); แก้ **ห้องเรียน** ของนักเรียน (`ClassNameEditor`, Server Action `updateClassName` เช็ค `requireAdmin()` เอง ไม่พึ่ง UI gate)
- ตั้งค่า: ดู [`supabase/README.md`](../supabase/README.md) §7 Vercel; env จาก `.env.local.example`

## Components สำคัญ
- `PetRive` — แสดง Rive ตาม `activePetId` (catalog `riveSource` + `dogCatInput`); ส่ง outfit inputs จาก `equippedItems` ทุกสัตว์ — ชิ้นเดิมยิงผ่าน `setInputState` (SMI boolean), ชิ้นที่อยู่ใน `VIEW_MODEL_BOUND_OUTFIT_INPUTS` ยิงผ่าน `ref.setBoolean` (ViewModel property, ต้องเปิด `dataBinding={AutoBind(true)}`)
- `OutfitPicker` — ปุ่ม 👗 หน้า Home → เลือกสวม/ถอดเครื่องแต่งกายที่ซื้อแล้ว (หลายชิ้นพร้อมกัน, ทุกสัตว์)
- `PetSwitcherSidebar` — ปุ่มลอยขวา Home สลับสัตว์; หมาต้องซื้อก่อน
- `PetNameEditor` — แตะชื่อบน Home → Modal แก้ชื่อ (trim, 1–12 ตัวอักษร) → `setPetName`
- `ChoreQuestList` — UI เควส + ถ่ายรูป in-app (`CameraCaptureModal`) เท่านั้น (ตัดปุ่มเลือกจากคลังออกแล้ว); gate ต้อง enroll ใบหน้าก่อน
- `CameraCaptureModal` — กล้อง in-app + preview; ปุ่ม「ตั้งค่า」: กลับด้านภาพ / เสียงชัตเตอร์ (persist `cameraSettingsStore`); `shutterSound: false` + `animateShutter` ตามการตั้งค่า
- `ClassLeaderboard` (`src/components/stats/`) — อันดับเพื่อนร่วมห้องตามนาทีโฟกัสสัปดาห์นี้ (จ.-อา.), ดึงผ่าน RPC `get_class_leaderboard`; ไม่เห็น `student_id`/uuid ของเพื่อน เห็นแค่ nickname; ว่างถ้ายังไม่ได้ระบุห้องเรียน
- `IdentityGate` — บังคับเฉพาะ student-register ก่อนเข้าแอป

## Features สำคัญ + logic
1. **Focus session** — เลือก 30/60/120/180 นาที; native `FocusForegroundService` นับถอยหลัง + ตรวจ foreground app (UsageStatsManager):
   - **RUNNING:** นับต่อปกติ (รวมเปิดแอปอื่นที่ไม่อยู่ใน block list, หน้า Home, ปิดหน้าจอ)
   - **FAILED:** เปิดแอปใน `DEFAULT_BLOCKED_APPS` → หยุด session + แจ้งเตือน "ล้มเหลวในการทำ focus"
   - ต้องเปิด Usage Access เพื่อตรวจจับแอปที่ห้าม; สำเร็จ → coin + EXP + happiness+10
2. **Mood check-in** — หลังโฟกัสสำเร็จ บันทึกอารมณ์ลง moodLog
3. **Weekly summary** — สรุป 7 วันใน Stats
4. **ร้านค้า** — ซื้อด้วยเหรียญ, owned → สวม/วาง/ตั้ง theme
5. **เสริมแรงเชิงบวก** — fail ไม่ลงโทษ
6. **ลงทะเบียนใบหน้า** — **ไม่บังคับ** ตอนเปิดแอป; เปิดจากหน้าเควสหรือ Stats; เก็บ embedding ใน SecureStore ไม่เก็บรูป; re-enroll ได้จาก Stats
7. **เควสทำงานบ้าน** — pool 26 เควส (`CHORE_QUESTS` ใน `focus.ts`, รางวัล 15/25/40 ⭐ ตามความยาก); ทุกวันสุ่มมาแสดง **3-5 ข้อ** ต่อวัน (`pickDailyQuestIds` ใน `choreQuestStore.ts`, seed = `studentId:วันที่` ผ่าน mulberry32 → สุ่มคงที่ทั้งวัน รีสตาร์ทแอปไม่เปลี่ยน, เปลี่ยนตอนข้ามวันเท่านั้น); ถ่าย in-app เท่านั้น (ตัดเลือกจากคลังออกแล้วเพื่อกันโกง) → ต้อง enroll ใบหน้าก่อน + ผ่านทั้งใบหน้า + ไม่ใช่รูปซ้ำ (hash เทียบ 5 รูปล่าสุดต่อเควส) + label งานบ้าน; ลองใหม่ได้ไม่จำกัดจนกว่าจะสำเร็จ; รางวัล coins → `petStore.addCoins`. *20 เควสใหม่ (พับผ้า/เช็ดกระจก/ดูดฝุ่น/ล้างห้องน้ำ ฯลฯ) ยังไม่ทดสอบ label จริงบนอุปกรณ์ — ต้องเช็คก่อนใช้งานจริง เหมือนที่เคยเตือนไว้กับรดน้ำต้นไม้/จัดเตียง*
8. **เปลี่ยนชื่อสัตว์เลี้ยง** — แตะชื่อบน Home → modal; บันทึกลง `petStore.name` (persist AsyncStorage)
9. **สัตว์เลี้ยงหลายตัว** — แมว default (`pet_cat`); แมวส้ม (`pet_orange_cat`, 150 ⭐) · หมา (`pet_dog`, 120 ⭐); สลับผ่าน sidebar หรือร้านค้า → `setActivePet` sync `species` + Rive file
10. **ลงทะเบียนนักเรียน** — 1 รหัส = 1 เครื่อง; ลบแอปแล้วติดตั้งใหม่ + รหัสเดิม + device เดิม → `register_student` restore session (ไม่ error ซ้ำ)
11. **Supabase sync** — focus session (complete/fail/cancel), daily screen time, chore completion, nickname → Postgres; face embedding **ไม่ sync**
12. **รางวัลโฟกัส + สตรีค** — `FOCUS_REWARDS` (30/60/120/180/240 นาที = 15/40/100/160/240 ⭐); `STREAK_BONUSES` ให้โบนัสเพิ่มที่สตรีค 1/3/7/14/30 วัน; ขาดสตรีคแล้วกลับมา (สตรีคเดิม ≥3) → เหรียญ 2 เท่าครั้งเดียว ถ้าไม่มี Streak Freeze; มี Freeze token (สูงสุด 3, +1 ทุก 7 วันสตรีค) ใช้อัตโนมัติกันสตรีคขาดถ้ามี
13. **อันดับห้อง (Class Leaderboard)** — ต้องมีทั้ง `students.class_name` (แอดมินตั้งจาก admin-web) และนักเรียนตั้ง nickname เอง; อันดับตามนาทีโฟกัสสำเร็จของสัปดาห์นี้ (จ.-อา., รีเซตทุกสัปดาห์) ผ่าน RPC `get_class_leaderboard` (SECURITY DEFINER) — ส่ง `student_id` จริงกลับให้เฉพาะแถวตัวเอง ไม่เผยให้เพื่อนเห็น
14. **ร้านค้า** — ปรับราคาสัตว์เลี้ยง/พื้นหลังลงเพื่อให้เข้าถึงง่ายขึ้น (ดูจุดที่ 9 + `SHOP_ITEMS` ใน `shop.ts`)

## Troubleshooting
| อาการ | สาเหตุ | แก้ |
|--------|--------|-----|
| `Cannot find native module` / `Tflite could not be found` | ใช้ Expo Go หรือ dev client เก่า | `npx expo prebuild --clean && npx expo run:android` |
| `File resource not found` (Rive) | ใช้ `resourceName` แทน `require(.riv)` | ใช้ `require('../../../assets/rive/pet_cat.riv')` ใน `PetRive` |
| `Failed to connect to 192.168.x.x:8081` | Emulator เข้า LAN IP ไม่ได้ / Metro ไม่รัน | `adb reverse tcp:8081 tcp:8081` แล้ว `npm run start:android` |
| Timer ไม่เดินตอนปิดแอป | dev client เก่า / ไม่มี FGS | `npx expo prebuild --clean && npx expo run:android` + อนุญาต Notifications |

| ค้างหน้า loading | AsyncStorage hydrate ช้า/ล้ม | รอ fallback 1.5s หรือ clear app data |
| แอพเด้ง (SIGABRT) ตอนเปิดหมา/แมวส้ม | `pet_dog_and_cat.riv` ไม่มี input `coat`/`glass2`/`uniform` บน State Machine 1 แต่ `PetRive` ยิง `setInputState` ทุก outfit input แบบไม่กรอง — native throw `StateMachineInputException` ข้าม JNI boundary จับด้วย JS try/catch ไม่ได้ | กรองด้วย `RIVE_SOURCE_SUPPORTED_OUTFIT_INPUTS` (`types/pet.ts`) ก่อน `setInputState` ใน `PetRive.tsx`; ของถาวรคือเพิ่ม layer+input ที่ขาดใน `pet_dog_and_cat.riv` แล้วเอาออกจาก allowlist |

## ประวัติการเปลี่ยนแปลงล่าสุด
- เพิ่มเควสทำงานบ้าน 20 อัน (รวมเป็น pool 26 อัน) + เปลี่ยนจากแสดงครบทุกวันเป็นสุ่ม 3-5 ข้อ/วัน (seed คงที่ต่อวันด้วย `studentId+วันที่`, `pickDailyQuestIds` ใน `choreQuestStore.ts`); แบ่งรางวัลตามความยาก 15/25/40 ⭐; sync `shared/choreQuestLabels.ts` ให้ครบทุก id (เดิมขาด 2 อันจากรอบก่อน). *เควสใหม่ 20 อันยังไม่ทดสอบ label จริงจาก ML Kit บนอุปกรณ์จริง — ต้อง verify ก่อนใช้งานจริง*
- Fix แอพเด้งตอนเปิด `pet_dog_and_cat.riv`: เพิ่ม allowlist `RIVE_SOURCE_SUPPORTED_OUTFIT_INPUTS` กรอง outfit input ที่ยังไม่มีในไฟล์ (`coat`/`glass2`/`uniform`) ก่อนยิง `setInputState` — ไฟล์นี้ยังขาด layer/input พวกนี้ ต้องเพิ่มใน Rive editor แล้วลบออกจาก allowlist ทีหลัง
- เพิ่มเครื่องแต่งกายใหม่ 15 ชิ้นในร้านค้า (หมวกทรงสูง, เบเร่ต์ 4 สี/ลาย, บักเก็ต, ไหมพรม, มงกุฎดอกไม้, แก๊ปโบว์, หูแมว, แก๊ปปลา, เสื้อกันฝน, ทักซิโด้, เสื้อโค้ท, แว่นทรงกลม, ชุดนักเรียน) — map เข้า Rive input `hat`/`hat2`–`hat10`/`hood`/`suit`/`coat`/`uniform`/`glass2` ที่มี layer พร้อมแล้วใน `pet_cat.riv` (ต้อง export `.riv` ทับไฟล์จริงเอง เพราะ MCP export ถูก gate ด้วยแพลน Rive); ยังไม่เช็ค/ทำ `pet_dog_and_cat.riv` ให้ตรงกัน
- เพิ่มโบนัสเหรียญ Focus/Streak (`STREAK_BONUSES`), catch-up 2 เท่าเมื่อขาดสตรีคแล้วกลับมา, Streak Freeze กันสตรีคขาดล่วงหน้า; ปรับราคาร้านค้าลง; เพิ่มเควสทำงานบ้าน 2 อัน (รดน้ำต้นไม้/จัดเตียง) + บวกรางวัลเควสเดิมเป็น 25 ⭐; ตัดปุ่มเลือกรูปจากคลังในเควส (บังคับกล้อง in-app) + เพิ่มเช็ค hash รูปซ้ำ (anti-cheat, on-device only); เพิ่มปุ่มพิมพ์สรุปนักเรียนใน admin-web; เพิ่มอันดับห้อง (Class Leaderboard) — migration `supabase/migrations/20260827000000_class_leaderboard.sql` (เพิ่ม `class_name`/`nickname` + RPC `get_class_leaderboard`) apply ขึ้น production แล้ว (ยืนยันด้วย `supabase migration list`)
- ลบ field `hp` ที่ไม่ได้ใช้งาน (ค้างที่ 100 ตลอด ไม่มี action แก้ไข) ออกจาก `petStore`/`Pet` type/`usePetStatus`/แถบสถานะหน้า Home
- แก้ nickname ไม่ sync ขึ้น DB: `public.students` มี RLS select/insert แต่ไม่มี update policy ทำให้ `syncNickname()` ถูกบล็อกแบบ silent (0 rows affected, ไม่ throw) — เพิ่ม migration `20260831000000_students_update_policy.sql` (apply ขึ้น production แล้ว) และแก้ `syncNickname()` (`sync.ts`) ให้เช็ค `{ error }` ที่ query คืนมาจริง (เดิมเช็คแต่ throw ซึ่ง supabase-js `.update()` ไม่ throw) พร้อม log ผ่าน `__DEV__` เพื่อ debug ได้
- Supabase: ลงทะเบียนรหัสนักเรียน + sync usage + admin-web dashboard
- เพิ่ม Focus Foreground Service: ขอสิทธิ์แจ้งเตือน + notification นับถอยหลังขณะโฟกัสเบื้องหลัง (`FocusForegroundService.kt`)
- เพิ่มสุนัข (`pet_dog_and_cat.riv`) + sidebar สลับสัตว์ + ซื้อหมาในร้าน (persist ownedItems/activePetId)
- เพิ่มระบบเควสทำงานบ้าน + ลงทะเบียนใบหน้า (local-first, ML Kit + MobileFaceNet, ไม่ใช้ Firebase Storage/Firestore)
- อัปเดต Rive outfit inputs (`straw_hat`/`wizard_hat`/`sunglass`), หมวกฟางในร้าน, แมวส้ม, สวม outfit หลายชิ้นได้ทุกสัตว์
- Focus timer UI sync จาก native `remainingSeconds` (ไม่นับแยกใน JS)
