# Outdoor Quest Rotation and Photo Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten rotating outdoor photo quests, show four per day, allow three rewards and one replacement per Bangkok day, and verify face, duplicate image, context, and pose locally.

**Architecture:** A pure catalog and deterministic scheduler feed a dedicated outdoor quest store. A verifier pipeline composes the existing face/hash checks with ML Kit labels and a small Android pose bridge for the two pose quests. Reward submission uses the idempotent wallet contract from the wallet plan.

**Tech Stack:** Expo SDK 52 / RN 0.76, Kotlin React Native bridge, Google ML Kit Pose Detection 18.0.0-beta5, ML Kit Image Labeling, Zustand, AsyncStorage, Vitest

**Spec:** `docs/superpowers/specs/2026-09-22-outdoor-quests-rewards-design.md`

## Global Constraints

- Android dev client is required; Expo Go is unsupported.
- Images and face embeddings remain on-device and are not uploaded.
- Use Asia/Bangkok calendar dates for daily selection and quotas.
- The same photo fingerprint is rejected across all home and outdoor quests.
- Outdoor quests show four daily, reward at most three daily, and allow one replacement of an unfinished quest.
- The ten approved quest IDs, titles, evidence, and rewards must match the design spec.
- Pose detection is limited to `outdoor_stretch` and `outdoor_balance`.
- Do not silently fall back to accepting a generic person label when pose landmarks are insufficient.

---

## File Structure

- Create `pet-focus/src/features/outdoorQuests/catalog.ts`: ten typed quest definitions.
- Create `pet-focus/src/features/outdoorQuests/scheduler.ts`: deterministic 4/4/2+2 rotation and replacement selection.
- Create `pet-focus/src/features/outdoorQuests/poseRules.ts`: pure landmark-angle rules.
- Create `pet-focus/src/features/outdoorQuests/__tests__/scheduler.test.ts`: rotation, diversity, replacement, and Bangkok-day tests.
- Create `pet-focus/src/features/outdoorQuests/__tests__/poseRules.test.ts`: pose thresholds and missing-landmark behavior.
- Create `pet-focus/src/stores/outdoorQuestStore.ts`: persisted daily selection, attempts, reward quota, and replacement state.
- Modify `pet-focus/src/stores/choreQuestStore.ts`: shared recent-image fingerprints across quest categories.
- Create `pet-focus/src/services/poseDetector.ts`: typed native bridge.
- Create `pet-focus/plugins/pose/PoseDetectorModule.kt`: static-image ML Kit detector returning 33 landmarks.
- Create `pet-focus/plugins/pose/PoseDetectorPackage.kt`: React package registration.
- Create `pet-focus/plugins/withPoseDetection.js`: dependency, source copy, and package wiring.
- Modify `pet-focus/app.json`: enable the pose config plugin.
- Create `pet-focus/src/services/outdoorQuestVerifier.ts`: face/hash/context/pose pipeline.
- Create `pet-focus/src/components/quests/OutdoorQuestList.tsx`: list, camera, quota, and replacement UI.
- Modify `pet-focus/app/(tabs)/quests.tsx`: household/outdoor tabs and shared coin status.
- Create `docs/quest-verification/outdoor-quest-evaluation.md`: per-quest device evaluation results.
- Modify `pet-focus/AGENTS.md` and `docs/USER_GUIDE.md`: feature and privacy behavior.

### Task 1: Implement the catalog and deterministic daily scheduler

**Files:**
- Create: `pet-focus/src/features/outdoorQuests/catalog.ts`
- Create: `pet-focus/src/features/outdoorQuests/scheduler.ts`
- Create: `pet-focus/src/features/outdoorQuests/__tests__/scheduler.test.ts`

**Interfaces:**
- Produces: `OutdoorQuestId`, `OutdoorQuest`, and `OUTDOOR_QUESTS`
- Produces: `getBangkokDateKey(now: Date): string`
- Produces: `getOutdoorQuestDay(studentId: string, dateKey: string): OutdoorQuestId[]`
- Produces: `getReplacementQuest(studentId: string, dateKey: string, visible: OutdoorQuestId[], completed: OutdoorQuestId[]): OutdoorQuestId | null`

- [ ] **Step 1: Write failing scheduler tests**

Assert exactly four unique quests per day; all ten IDs appear across three consecutive days; day three contains its two remaining IDs plus two fillers; each day contains one movement quest and one care/nature quest; a fixed student/date returns the same order after restart; two adjacent days avoid duplicate IDs when a valid schedule exists; Bangkok `23:59` and `00:01` produce different keys; replacement excludes visible/completed IDs and is deterministic.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pet-focus && npm test -- src/features/outdoorQuests/__tests__/scheduler.test.ts`

Expected: FAIL because the catalog and scheduler do not exist.

- [ ] **Step 3: Define all ten quests exactly**

Define `outdoor_water_plants` 25, `outdoor_sweep` 25, `outdoor_collect_leaves` 25, `outdoor_nature` 20, `outdoor_read` 20, `outdoor_stretch` 25, `outdoor_tree` 20, `outdoor_walk` 25, `outdoor_balance` 25, and `outdoor_tidy_corner` 25. Each entry declares `verification: 'labels' | 'pose'`, expected label groups, minimum confidence, category `movement | care | nature | calm`, and Thai capture guidance copied from the spec.

- [ ] **Step 4: Implement the three-day seeded schedule**

Seed from student ID plus a stable three-day cycle index. Shuffle ten IDs once per cycle, then produce 4/4/2+2 slices. Use deterministic swaps to satisfy diversity and reduce adjacent repeats without dropping any ID. Replacement uses the same seeded candidate order and returns the first eligible ID.

- [ ] **Step 5: Run tests and commit**

Run: `cd pet-focus && npm test -- src/features/outdoorQuests/__tests__/scheduler.test.ts`

Expected: PASS.

```bash
git add pet-focus/src/features/outdoorQuests
git commit -m "feat: add rotating outdoor quest catalog"
```

### Task 2: Persist daily quota, replacement, and cross-quest image reuse protection

**Files:**
- Create: `pet-focus/src/stores/outdoorQuestStore.ts`
- Modify: `pet-focus/src/stores/choreQuestStore.ts`
- Create: `pet-focus/src/stores/__tests__/outdoorQuestStore.test.ts`

**Interfaces:**
- Consumes: scheduler interfaces from Task 1
- Produces: `ensureOutdoorDay()`, `recordOutdoorAttempt()`, `replaceOutdoorQuest()`, `completeOutdoorQuest()`, and `getOutdoorQuota()`
- Produces: shared `isDuplicateQuestImage(hash: string)` and `recordQuestImage(hash: string)`

- [ ] **Step 1: Write failing store tests**

Use an in-memory storage adapter and fake clock. Assert restart keeps the same four IDs; the fourth completion in one Bangkok day returns `DAILY_QUOTA_REACHED`; a completed quest cannot be replaced; only the first replacement succeeds; opening after Bangkok midnight creates a new day; a hash recorded by a household quest is rejected by an outdoor quest and vice versa.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pet-focus && npm test -- src/stores/__tests__/outdoorQuestStore.test.ts`

Expected: FAIL because the store does not exist.

- [ ] **Step 3: Implement the persisted state machine**

Persist `dateKey`, `visibleQuestIds`, `replacementUsed`, `completedQuestIds`, `attempts`, and `rewardedCount`. Validate state against today's schedule before every mutation. `completeOutdoorQuest` reserves quota locally and produces one stable reward request ID; if server claim fails, the completion remains pending and cannot generate another ID.

- [ ] **Step 4: Move recent fingerprints to a shared quest key**

Store the latest 20 fingerprints globally rather than five per quest ID. Migrate existing per-quest hashes by flattening and deduplicating them during hydration. Keep no image URI or image bytes.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run: `cd pet-focus && npm test -- src/stores/__tests__/outdoorQuestStore.test.ts && npx tsc --noEmit`

Expected: PASS and TypeScript exits 0.

```bash
git add pet-focus/src/stores/outdoorQuestStore.ts pet-focus/src/stores/choreQuestStore.ts pet-focus/src/stores/__tests__/outdoorQuestStore.test.ts
git commit -m "feat: enforce outdoor quest daily limits"
```

### Task 3: Add native static-image pose landmarks and pure pose rules

**Files:**
- Create: `pet-focus/plugins/pose/PoseDetectorModule.kt`
- Create: `pet-focus/plugins/pose/PoseDetectorPackage.kt`
- Create: `pet-focus/plugins/withPoseDetection.js`
- Modify: `pet-focus/app.json`
- Create: `pet-focus/src/services/poseDetector.ts`
- Create: `pet-focus/src/features/outdoorQuests/poseRules.ts`
- Create: `pet-focus/src/features/outdoorQuests/__tests__/poseRules.test.ts`

**Interfaces:**
- Produces: `detectPose(uri: string): Promise<PoseLandmark[]>`
- Produces: `PoseLandmark = { type: string; x: number; y: number; z: number; confidence: number }`
- Produces: `evaluatePose(rule: 'stretch' | 'balance', landmarks: PoseLandmark[]): { matched: boolean; reason?: string }`

- [ ] **Step 1: Write failing pure pose-rule tests**

Create numeric landmark fixtures for arms extended, arms down, left-leg balance, right-leg balance, both feet down, and low-confidence/missing joints. Stretch passes when both shoulder-elbow-wrist chains have confidence at least `0.7`, elbow angles at least `150°`, and wrist distance at least `1.4 × shoulder distance`. Balance passes when visible shoulder/hip/knee/ankle landmarks have confidence at least `0.7` and one ankle is at least `0.18 × torso height` above the other. Missing required landmarks returns the Thai retake message.

- [ ] **Step 2: Run the pose-rule tests to verify they fail**

Run: `cd pet-focus && npm test -- src/features/outdoorQuests/__tests__/poseRules.test.ts`

Expected: FAIL because `evaluatePose` does not exist.

- [ ] **Step 3: Implement pure geometry rules**

Implement distance and angle helpers without React Native dependencies. Mirror left/right input handling and reject non-finite coordinates. Keep thresholds exported so the device evaluation can change them with an explicit test update.

- [ ] **Step 4: Add the Android bridge and config plugin**

Use `com.google.mlkit:pose-detection:18.0.0-beta5` in `SINGLE_IMAGE_MODE`. Decode the local URI as an `InputImage`, return all 33 landmark types with coordinates and `inFrameLikelihood`, and reject with `POSE_NOT_FOUND`, `IMAGE_READ_FAILED`, or `POSE_DETECTION_FAILED`. The plugin copies sources into the app package and registers `PoseDetectorPackage`, following the existing app-block plugin pattern.

- [ ] **Step 5: Rebuild and smoke-test the native module**

Run: `cd pet-focus && npx expo prebuild --clean && npx expo run:android`

Expected: Android build installs successfully; a captured full-body image returns landmarks and a cropped image returns a controlled retake result.

- [ ] **Step 6: Run unit tests and commit**

Run: `cd pet-focus && npm test -- src/features/outdoorQuests/__tests__/poseRules.test.ts && npx tsc --noEmit`

```bash
git add pet-focus/plugins/pose pet-focus/plugins/withPoseDetection.js pet-focus/app.json pet-focus/src/services/poseDetector.ts pet-focus/src/features/outdoorQuests/poseRules.ts pet-focus/src/features/outdoorQuests/__tests__/poseRules.test.ts
git commit -m "feat: verify outdoor quest poses on device"
```

### Task 4: Compose verification and build the outdoor quest UI

**Files:**
- Create: `pet-focus/src/services/outdoorQuestVerifier.ts`
- Create: `pet-focus/src/components/quests/OutdoorQuestList.tsx`
- Modify: `pet-focus/app/(tabs)/quests.tsx`
- Modify: `pet-focus/src/components/quests/ChoreQuestList.tsx`

**Interfaces:**
- Consumes: `verifyFace`, shared fingerprint APIs, image labels, `detectPose`, `evaluatePose`, outdoor store, and wallet reward queue
- Produces: `verifyOutdoorQuestPhoto(quest: OutdoorQuest, uri: string): Promise<QuestVerifyResult>`

- [ ] **Step 1: Write failing verifier orchestration tests**

Mock each stage. Assert face failure stops before hash/labels; duplicate failure stops before labels/pose; label quest requires every configured evidence group; pose quest requires both context and pose; success records the fingerprint only after all checks pass; errors map to specific Thai retake messages.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pet-focus && npm test -- src/services/__tests__/outdoorQuestVerifier.test.ts`

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement the verifier pipeline**

Return `{ passed, reason, faceSimilarity, matchedLabels, poseRule }`. Always run face then fingerprint. For label quests evaluate configured evidence groups. For pose quests evaluate outdoor context labels plus the selected geometry rule. Record the fingerprint only on success and discard the image after the caller finishes.

- [ ] **Step 4: Add household/outdoor tabs and cards**

Keep the face-enrollment banner shared. Outdoor cards display reward, capture guidance, completed state, daily rewarded count `x/3`, and a single “เปลี่ยนเควส” action for unfinished quests. Disable capture when quota is full. Confirmation copy states that a photo shows participation and does not measure elapsed time.

- [ ] **Step 5: Submit idempotent rewards**

On successful local verification call `completeOutdoorQuest`, enqueue the stable `outdoor` reward request, and show pending/confirmed status. A retry or remount must not create a second reward request.

- [ ] **Step 6: Run tests, typecheck, and Android smoke test**

Run: `cd pet-focus && npm test && npx tsc --noEmit`

On a dev client, verify tab switching, four cards, one replacement, third reward accepted, fourth blocked, restart persistence, and both pose retake messages.

- [ ] **Step 7: Commit the feature UI**

```bash
git add pet-focus/src/services/outdoorQuestVerifier.ts pet-focus/src/services/__tests__/outdoorQuestVerifier.test.ts pet-focus/src/components/quests/OutdoorQuestList.tsx 'pet-focus/app/(tabs)/quests.tsx' pet-focus/src/components/quests/ChoreQuestList.tsx
git commit -m "feat: add outdoor photo quests"
```

### Task 5: Evaluate all ten quest detectors and document behavior

**Files:**
- Create: `docs/quest-verification/outdoor-quest-evaluation.md`
- Modify: `pet-focus/src/features/outdoorQuests/catalog.ts`
- Modify: `pet-focus/src/features/outdoorQuests/poseRules.ts`
- Modify: `docs/USER_GUIDE.md`
- Modify: `pet-focus/AGENTS.md`

**Interfaces:**
- Consumes: completed verification pipeline
- Produces: measured detector thresholds and a release decision for each quest

- [ ] **Step 1: Build an authorized evaluation set**

For each quest collect at least 20 matching and 20 non-matching Android photos with permission. Keep threshold-tuning photos separate from final evaluation photos. Include wrong activity in similar surroundings, wrong face, cropped joints, and reused-photo cases. Do not commit personal images.

- [ ] **Step 2: Record baseline results**

For each quest record true positives, false negatives, true negatives, false positives, device model, lighting, label evidence, and pose confidence. Calculate acceptance rate for valid photos and false-accept rate for invalid photos.

- [ ] **Step 3: Adjust only explicit catalog/rule thresholds**

Update expected label groups, confidence thresholds, or exported pose thresholds with matching unit-test changes. Never remove activity evidence until only a person/outdoor label remains.

- [ ] **Step 4: Apply the release gate**

Mark a quest enabled only when valid-photo acceptance is at least 85% and invalid-photo acceptance is at most 10%. Keep any failing quest hidden and record its measured reason; the daily scheduler filters disabled quests while preserving four visible quests only when at least four approved quests exist.

- [ ] **Step 5: Run final checks and update documentation**

Run: `cd pet-focus && npm test && npx tsc --noEmit`

Document the ten-quest rotation, one replacement, three-reward quota, local-only image handling, pose limitations, and actual enabled quest list.

- [ ] **Step 6: Commit evaluation evidence and docs**

```bash
git add docs/quest-verification/outdoor-quest-evaluation.md docs/USER_GUIDE.md pet-focus/AGENTS.md pet-focus/src/features/outdoorQuests/catalog.ts pet-focus/src/features/outdoorQuests/poseRules.ts
git commit -m "test: validate outdoor quest photo checks"
```
