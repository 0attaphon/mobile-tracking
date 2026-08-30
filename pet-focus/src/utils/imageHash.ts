import * as FileSystem from 'expo-file-system'
import * as Crypto from 'expo-crypto'

/**
 * Reads the photo at `uri` and returns a SHA-1 hex digest of its bytes.
 * Used for cheap anti-cheat dedupe (reject resubmitting the exact same photo file)
 * — never uploaded anywhere, computed and compared fully on-device.
 */
export async function hashImageFile(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, base64)
}
