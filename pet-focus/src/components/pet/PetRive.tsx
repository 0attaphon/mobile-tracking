import React, { useCallback, useEffect, useRef } from 'react'
import { View, NativeModules } from 'react-native'
import {
  PetId,
  getPetCatalogEntry,
  RIVE_SOURCE_SUPPORTED_OUTFIT_INPUTS,
  VIEW_MODEL_BOUND_OUTFIT_INPUTS,
} from '@/types/pet'
import { getOutfitRiveInputs } from '@/types/shop'
import { PET_CAT_RIV, PET_DOG_AND_CAT_RIV } from '@/assets/riveAssets'

const isRiveAvailable = !!NativeModules.RiveReactNativeModule

let Rive: any = null
let AutoBind: ((value: boolean) => any) | null = null
if (isRiveAvailable) {
  try {
    const riveModule = require('rive-react-native')
    Rive = riveModule.default
    AutoBind = riveModule.AutoBind
  } catch {
    // ignore
  }
}

const STATE_MACHINE = 'State Machine 1'
const DOG_CAT_INPUT = 'cat/dog'

interface PetRiveProps {
  activePetId: PetId
  size?: number
  stateMachineName?: string
  equippedItems?: string[]
}

function applyRiveInputs(
  ref: React.RefObject<any>,
  stateMachineName: string,
  activePetId: PetId,
  equippedItems: string[],
) {
  if (!ref.current) return

  const entry = getPetCatalogEntry(activePetId)

  try {
    if (entry.dogCatInput !== undefined) {
      ref.current.setInputState(stateMachineName, DOG_CAT_INPUT, entry.dogCatInput)
    }

    const outfitInputs = getOutfitRiveInputs(equippedItems)
    const supportedInputs = RIVE_SOURCE_SUPPORTED_OUTFIT_INPUTS[entry.riveSource]
    for (const [inputName, value] of Object.entries(outfitInputs)) {
      if (supportedInputs && !supportedInputs.includes(inputName)) continue
      if (VIEW_MODEL_BOUND_OUTFIT_INPUTS.includes(inputName)) {
        ref.current.setBoolean(inputName, value)
      } else {
        ref.current.setInputState(stateMachineName, inputName, value)
      }
    }
  } catch {
    // Rive native may not be ready yet
  }
}

export function PetRive({
  activePetId,
  size = 200,
  stateMachineName = STATE_MACHINE,
  equippedItems = [],
}: PetRiveProps) {
  const riveRef = useRef<any>(null)
  const entry = getPetCatalogEntry(activePetId)
  const source = entry.riveSource === 'pet_dog_and_cat' ? PET_DOG_AND_CAT_RIV : PET_CAT_RIV

  const applyInputs = useCallback(() => {
    applyRiveInputs(riveRef, stateMachineName, activePetId, equippedItems)
  }, [stateMachineName, activePetId, equippedItems])

  useEffect(() => {
    applyInputs()
  }, [applyInputs])

  if (!Rive || !isRiveAvailable) {
    return <View style={{ width: size, height: size }} />
  }

  return (
    <View style={{ width: size, height: size }}>
      <Rive
        key={activePetId}
        ref={riveRef}
        source={source}
        stateMachineName={stateMachineName}
        style={{ width: size, height: size }}
        autoplay
        dataBinding={AutoBind ? AutoBind(true) : undefined}
        onPlay={applyInputs}
      />
    </View>
  )
}
