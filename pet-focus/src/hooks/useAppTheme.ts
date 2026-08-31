import { useRoomStore } from '@/stores/roomStore'

function luminanceOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function isLightColor(hex: string): boolean {
  return luminanceOf(hex) > 0.5
}

export function useAppTheme() {
  const { selectedBgColor, selectedBgGradient, surfaceColor } = useRoomStore()

  const referenceLuminance = selectedBgGradient
    ? (luminanceOf(selectedBgGradient[0]) + luminanceOf(selectedBgGradient[1])) / 2
    : luminanceOf(selectedBgColor)
  const isLight = referenceLuminance > 0.5

  return {
    bg: selectedBgColor,
    gradient: selectedBgGradient,
    surface: surfaceColor,
    isLight,
    text: isLight ? '#1A237E' : '#FFFFFF',
    textSecondary: isLight ? '#5C6BC0' : 'rgba(255,255,255,0.6)',
    border: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
    accent: '#FFC94D',
  }
}
