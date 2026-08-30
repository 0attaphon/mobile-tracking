import ImageLabeling from '@react-native-ml-kit/image-labeling'
import { ChoreQuest } from '@/types/focus'
import { verifyFace } from '@/services/faceVerifier'
import { hashImageFile } from '@/utils/imageHash'
import { useChoreQuestStore } from '@/stores/choreQuestStore'

export type DetectedLabel = { text: string; confidence: number }

export interface ChoreVerifyResult {
  passed: boolean
  reason?: string
  faceSimilarity?: number
  matchedLabels?: string[]
  detectedLabels?: DetectedLabel[]
}

export async function verifyChoreLabels(
  uri: string,
  quest: ChoreQuest
): Promise<{
  matched: boolean
  matchedLabels: string[]
  detectedLabels: DetectedLabel[]
  reason?: string
}> {
  const raw = await ImageLabeling.label(uri)
  const detectedLabels: DetectedLabel[] = raw.map((label) => ({
    text: label.text,
    confidence: label.confidence,
  }))

  const matchedLabels = detectedLabels
    .filter(
      (label) =>
        label.confidence >= quest.minConfidence &&
        quest.expectedLabels.some((expected) =>
          label.text.toLowerCase().includes(expected.toLowerCase())
        )
    )
    .map((label) => label.text)

  if (matchedLabels.length >= quest.minLabelMatches) {
    return { matched: true, matchedLabels, detectedLabels }
  }

  const reason = 'ไม่พบหลักฐานงานบ้านที่ตรงเควส'

  return {
    matched: false,
    matchedLabels,
    detectedLabels,
    reason,
  }
}

export async function verifyChorePhoto(
  quest: ChoreQuest,
  uri: string
): Promise<ChoreVerifyResult> {
  const face = await verifyFace(uri)
  if (!face.matched) {
    return {
      passed: false,
      reason: face.reason ?? 'ใบหน้าไม่ตรงกับที่ลงทะเบียน',
      faceSimilarity: face.similarity,
    }
  }

  const hash = await hashImageFile(uri)
  if (useChoreQuestStore.getState().isDuplicateHash(quest.id, hash)) {
    return {
      passed: false,
      reason: 'รูปนี้เคยใช้ส่งแล้ว กรุณาถ่ายรูปใหม่',
      faceSimilarity: face.similarity,
    }
  }

  const chore = await verifyChoreLabels(uri, quest)
  if (!chore.matched) {
    return {
      passed: false,
      reason: chore.reason,
      faceSimilarity: face.similarity,
      matchedLabels: chore.matchedLabels,
      detectedLabels: chore.detectedLabels,
    }
  }

  useChoreQuestStore.getState().recordHash(quest.id, hash)

  return {
    passed: true,
    faceSimilarity: face.similarity,
    matchedLabels: chore.matchedLabels,
    detectedLabels: chore.detectedLabels,
  }
}
