import React, { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

interface TimerRingProps {
  remainingSeconds: number
  totalSeconds: number
  size?: number
  isPaused?: boolean
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function TimerRing({ remainingSeconds, totalSeconds, size = 200, isPaused = false }: TimerRingProps) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const progress = remainingSeconds / totalSeconds
  const strokeDashoffset = circumference * (1 - progress)

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (remainingSeconds <= 10 && remainingSeconds > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [remainingSeconds <= 10])

  return (
    <Animated.View
      style={{ transform: [{ scale: pulseAnim }] }}
      className="items-center justify-center"
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
          fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isPaused ? '#F5A623' : '#5DB347'}
          strokeWidth={8}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text
          className="text-white text-4xl font-bold tracking-wider"
          style={{
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
        >
          {timeLabel}
        </Text>
        <Text className="text-text-secondary  text-xs mt-1" style={{
          textShadowColor: 'rgba(0,0,0,0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}>
          {isPaused ? 'หยุดชั่วคราว ⏸' : progress === 1 ? 'พร้อมเริ่ม' : 'กำลังโฟกัส...'}
        </Text>
      </View>
    </Animated.View>
  )
}
