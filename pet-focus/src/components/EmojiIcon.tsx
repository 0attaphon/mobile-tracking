import React from 'react'
import { Image, Text } from 'react-native'
import { EMOJI_ASSETS, EMOJI_CHAR_TO_ASSET } from '@/assets/emojiAssets'
import { EmojiAssetName } from '@/assets/emojiAssetNames'

const VARIATION_SELECTORS = /[︎️]/g

interface EmojiIconProps {
  /** Direct asset lookup, e.g. name="cat" */
  name?: EmojiAssetName
  /** Look up by the literal emoji character, e.g. char="🐱" */
  char?: string
  size?: number
  style?: object
}

export function EmojiIcon({ name, char, size = 20, style }: EmojiIconProps) {
  const assetName = name ?? (char ? EMOJI_CHAR_TO_ASSET[char.replace(VARIATION_SELECTORS, '')] : undefined)
  const source = assetName ? EMOJI_ASSETS[assetName] : undefined

  if (!source) {
    return <Text style={[{ fontSize: size * 0.85 }, style]}>{char}</Text>
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  )
}
