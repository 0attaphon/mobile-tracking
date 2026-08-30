# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a multi-project repo for **Focus Group** — an Android app that reduces student phone use via a virtual-pet reward loop (focus sessions → coins/EXP → pet cosmetics). Four independently-deployed pieces share one Supabase backend:

| Path | What | Stack |
|------|------|-------|
| `pet-focus/` | The mobile app (primary work happens here) | Expo SDK 52 / RN 0.76, expo-router, NativeWind, Zustand |
| `admin-web/` | Teacher/admin dashboard | Next.js 15 (App Router), React 19, Supabase SSR, Tailwind v4 |
| `pet-focus/functions/` | Firebase Cloud Functions — **AI focus tip only** | firebase-functions v5, Node 20 |
| `supabase/` | Postgres schema + RPCs (source of truth for the DB) | SQL migrations |
| `shared/` | TS constants imported by both app and admin (`appLabels.ts`, `choreQuestLabels.ts`) | — |

`pet-focus/AGENTS.md` is the detailed, continuously-updated design doc (in Thai) for the mobile app — feature-by-feature logic, Rive inputs, store fields, native events, and a troubleshooting table. **Read it before touching app internals, and update it when you change app features/logic** (its header instruction).

## Commands

### Mobile app (`cd pet-focus`)
```bash
npm start              # start-dev.sh: auto adb reverse + localhost (USB/emulator) or LAN (Wi-Fi)
npm run start:tunnel   # fallback when Wi-Fi/LAN unreachable
npm run android        # first-time / after-native-change: builds & installs dev client
```
- **Requires a dev client** (`expo run:android`). **Expo Go will not work** — the app depends on native modules (`AppBlockModule`, Rive, ML Kit, TFLite, expo-camera).
- **Do not run `npx expo start` directly** — it picks a LAN IP (`192.168.x.x`) the emulator/USB device usually can't reach. Use `npm start`.
- After any native change (Kotlin, plugins, native deps): `npx expo prebuild --clean && npx expo run:android`.
- **Android-only** for real functionality — app blocking and usage stats only work on Android.
- There is no test runner and no lint script configured for the mobile app; `tsc` (strict) via the editor/`npx tsc --noEmit` is the type check.

### Admin web (`cd admin-web`)
```bash
npm run dev     # next dev on port 3001
npm run build
npm run lint    # next lint
```
Deploys on **Vercel with Root Directory = `admin-web`** (must be set so the sibling `shared/` folder resolves).

### Firebase functions (`cd pet-focus/functions`)
```bash
npm run build   # tsc → lib/
npm run deploy  # firebase deploy --only functions
```

### Supabase
```bash
supabase db push   # apply migrations/ (CLI must be linked to the project)
```
See `supabase/README.md` for required manual steps: enable **Anonymous sign-ins**, seed the admin user (`{username}@pet-focus.internal`), and Vercel/Auth URL config.

## Architecture — the parts that span files

**Native timer is the source of truth.** Focus sessions are driven by a native Android foreground service, not JS. `AppBlockModule.kt` + `FocusForegroundService.kt` count down and watch the foreground app via `UsageStatsManager`, emitting events across the RN bridge: `onFocusTick` (carries `remainingSeconds` — UI syncs to this, does *not* count independently), `onFocusComplete`, `onFocusPaused`, `onFocusResumed`, `onBlockedAppDetected`. `useFocusSession` (`src/hooks/`) subscribes to these; `src/services/focusTimer.ts` / `appBlock.ts` call the module. A JS `setInterval` + `tickSecond()` only runs as a fallback if native fails. Opening an app in `DEFAULT_BLOCKED_APPS` → session **fails** (no penalty — positive reinforcement is a product rule). Requires the user to grant **Usage Access** + notification permission.

**State lives in Zustand stores** (`src/stores/`), several persisted to AsyncStorage: `petStore` (persists name/activePetId/species), `userStore` (persists studentId/isRegistered), `focusStore` (session state + moodLog + streak), `choreQuestStore` (daily chore state), `identityStore` (faceEnrolled flag), `shopStore`, `roomStore` (theme/decor, drives runtime `ThemedScreen`).

**Auth/entry gate.** `app/_layout.tsx` wraps everything in `IdentityGate`: only `student-register` is mandatory before entering tabs; face enrollment is optional. Registration uses **Supabase anonymous auth + RPC `register_student`** (1 student ID = 1 device; reinstalling with same ID + device restores history). On boot it restores the Supabase session and flushes the offline sync queue.

**Face + chore verification is fully local — no images stored, no cloud.** `faceVerifier.ts` enrolls/verifies with ML Kit face detection + a MobileFaceNet TFLite model (`assets/models/mobile_face_net.tflite`), storing only an embedding in **SecureStore** (never synced). `choreVerifier.ts` combines face verify + ML Kit image labeling; `expectedLabels` must match the *actual* labels ML Kit returns (not intuitive words — e.g. `room`/`chair`, not `broom`).

**Sync is offline-first.** `src/services/supabase/sync.ts` pushes focus sessions, daily screen time, and chore completions to Postgres with an offline queue flushed on reconnect/boot. Face embeddings are deliberately **not** synced. `src/services/firebase/functions.ts` is used *only* for the AI focus tip.

**Path aliases** (mobile `tsconfig.json`): `@/*` → `pet-focus/src/*`, `@shared/*` → repo-root `shared/*`.

**Rive avatars.** `PetRive` maps `activePetId` → a `.riv` file via a catalog. Riv files must be loaded with `require('../../../assets/rive/pet_cat.riv')` (not by resource name, or you get "File resource not found"). Outfit boolean inputs (`straw_hat`, `wizard_hat`, `sunglass`) and the dog/cat toggle input come from `equippedItems`.

## Gotchas

- `.cursor` note links Expo v56 docs, but this project is pinned to **SDK 52 / RN 0.76** (see `pet-focus/package.json`) — trust package.json.
- The mobile app's native Kotlin lives under `pet-focus/android/app/src/main/java/com/oattaphon/petfocus/appblock/` and is wired via config plugins in `app.json` (`./plugins/withAppBlockModule`, `./plugins/withAndroidBuildFix`).
- `admin-web` and `functions` have their own `node_modules`/`package.json` — install and run commands per-directory.
- Never commit the Supabase DB password or `service_role` key (see `supabase/README.md`).
