# Command Reference — mobile-tracking (BUDDY RISE)

รวม command ทั้งหมดที่ใช้ในโปรเจกต์นี้ แยกตาม subproject

## pet-focus (mobile app) — `cd pet-focus`

| Command | ใช้ทำอะไร |
|---|---|
| `npm start` | รัน `scripts/start-dev.sh` — auto adb reverse + localhost (USB/emulator) หรือ LAN (Wi-Fi) ตามที่ตรวจเจอ |
| `npm run start:lan` | `expo start --dev-client --lan` |
| `npm run start:tunnel` | `expo start --dev-client --tunnel` — fallback เมื่อ Wi-Fi/LAN เข้าไม่ถึง |
| `npm run start:android` | `adb reverse tcp:8081 tcp:8081 && expo start --dev-client --localhost` |
| `npm run android` | `adb reverse tcp:8081 tcp:8081 && expo run:android` — build + install dev client (รันครั้งแรก หรือหลังแก้ native code) |
| `npm run ios` | `expo run:ios` |
| `npm run web` | `expo start --web` |
| `npx tsc --noEmit` | type check (strict) — ไม่มี lint/test runner ในโปรเจกต์นี้ |
| `npx expo prebuild --clean && npx expo run:android` | จำเป็นหลังแก้ native code (Kotlin, plugins, native deps) |

**ข้อควรระวัง:** ต้องใช้ dev client (`expo run:android`) เท่านั้น — **Expo Go ใช้ไม่ได้** (มี native module `AppBlockModule`, Rive, ML Kit, TFLite, expo-camera). อย่ารัน `npx expo start` ตรงๆ เพราะจะได้ LAN IP ที่ emulator/USB เข้าไม่ถึง ให้ใช้ `npm start`. ฟังก์ชันจริง (app blocking, usage stats) ใช้ได้บน **Android เท่านั้น**.

### EAS Build (`pet-focus/eas.json`, project slug `pet-focus`)

| Command | Profile | ใช้ทำอะไร |
|---|---|---|
| `eas build --platform android --profile development` | `development` | dev client build, internal distribution |
| `eas build --platform android --profile preview` | `preview` | internal distribution สำหรับทดสอบ |
| `eas build --platform android --profile production` | `production` | APK, `autoIncrement` version, `environment: production` |
| `eas build --platform android --profile release-apk` | `release-apk` | APK, internal distribution, ไม่ auto-increment version — ใช้ทำลิงก์ APK แจกตรง (ตรงกับ `NEXT_PUBLIC_APK_DOWNLOAD_URL` ที่หน้า `/download` ของ admin-web อ้างถึง) |
| `eas submit --platform android --profile production` | `production` | submit ขึ้น Play Store (profile `submit.production` เป็นค่า default ว่าง — ยังไม่ตั้งค่าเพิ่ม) |
| `eas login` | — | login ครั้งแรกก่อนใช้ eas-cli |
| `npx eas-cli build --platform android --profile <profile>` | — | ใช้แบบ npx ถ้าไม่ได้ลง `eas-cli` แบบ global |

ทุก build ใช้ Android build (`buildType: apk`) — ไม่มี profile ทำ `aab` สำหรับ Play Store เลยตอนนี้ (`production`/`release-apk` ทั้งคู่ apk).

## pet-focus/functions (Firebase Cloud Functions — AI focus tip) — `cd pet-focus/functions`

| Command | ใช้ทำอะไร |
|---|---|
| `npm run build` | `tsc` → `lib/` |
| `npm run serve` | build แล้วรัน `firebase emulators:start --only functions` |
| `npm run deploy` | `firebase deploy --only functions` |

## admin-web (teacher/admin dashboard) — `cd admin-web`

| Command | ใช้ทำอะไร |
|---|---|
| `npm run dev` | `next dev -p 3001` |
| `npm run build` | `next build` |
| `npm run start` | `next start -p 3001` |
| `npm run lint` | `next lint` |

**Deploy:** Vercel, **Root Directory ต้องตั้งเป็น `admin-web`** (สำคัญ — โฟลเดอร์ `shared/` อยู่ระดับ repo root)

```bash
npm i -g vercel
cd admin-web
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_APK_DOWNLOAD_URL production
vercel --prod
```

## supabase (Postgres schema + RPCs) — จาก repo root

```bash
supabase db push   # apply migrations/ (ต้อง link CLI กับ project ก่อน)
```

ขั้นตอน manual ที่ต้องทำเองใน Supabase Dashboard (ดู `supabase/README.md`):
- เปิด **Anonymous sign-ins** (Authentication → Providers) — จำเป็นสำหรับ mobile register
- Seed admin user ด้วย email รูปแบบ `{username}@pet-focus.internal` แล้ว insert แถวใน `admin_users`
- ตั้ง **Site URL** / **Redirect URLs** (Authentication → URL Configuration) หลัง deploy admin-web จริง

## CI — Supabase Keep-Alive (`.github/workflows/supabase-keepalive.yml`)

รันอัตโนมัติทุก 3 วัน (cron `0 3 */3 * *`) เพื่อกัน free-tier auto-pause, หรือรันมือได้ผ่าน GitHub Actions → workflow_dispatch:

```bash
gh workflow run supabase-keepalive.yml
```

## Compliance reminder

การ push migration หรือแก้ config ที่กระทบระบบ Production (โดยเฉพาะตาราง `students`/ข้อมูลลูกค้า) ต้องผ่าน Change Management/ITIL process ก่อนดำเนินการทุกครั้ง
