'use client'

import type React from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  )
}

export type IconName =
  | 'grid'
  | 'devices'
  | 'chart'
  | 'bolt'
  | 'settings'
  | 'chevron'
  | 'bell'
  | 'plus'
  | 'arrow'
  | 'shield'
  | 'wind'
  | 'thermometer'
  | 'drop'
  | 'wifi'
  | 'check'
  | 'clock'
  | 'download'
  | 'close'
  | 'help'
  | 'logout'
  | 'power'
  | 'home'
export function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    devices: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M8 7h8M8 11h5M9 17h.01M15 17h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15l4-5 4 3 5-7" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
    settings: (
      <>
        <path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    bell: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>
    ),
    wind: (
      <>
        <path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3" />
      </>
    ),
    thermometer: (
      <>
        <path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z" />
        <path d="M12 8v10" />
      </>
    ),
    drop: <path d="M12 3s7 8 7 12a7 7 0 0 1-14 0c0-4 7-12 7-12Z" />,
    wifi: (
      <>
        <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0" />
        <circle cx="12" cy="20" r=".7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2M12 17h.01" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" />
      </>
    ),
    power: (
      <>
        <path d="M12 2v10M6 5a9 9 0 1 0 12 0" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v11H3V10Z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export function Fan({
  running,
  small = false,
  speed = 45,
  motionEnabled,
}: {
  running: boolean
  small?: boolean
  speed?: number
  motionEnabled?: boolean
}) {
  const reducedMotion = useReducedMotion()
  const animate = motionEnabled ?? !reducedMotion
  const rotor = useRef<SVGGElement>(null)
  const angle = useRef(0)

  useEffect(() => {
    if (!running || !animate || speed <= 0) return
    let frame: number | null = null
    let previous: number | null = null
    let suspended = false
    const degreesPerSecond = 30 + Math.min(100, Math.max(0, speed)) * 1.2
    const tick = (time: number) => {
      const elapsed = previous === null ? 0 : Math.min(time - previous, 100)
      previous = time
      angle.current = (angle.current + (elapsed * degreesPerSecond) / 1000) % 360
      rotor.current?.setAttribute('transform', `rotate(${angle.current} 50 50)`)
      frame = requestAnimationFrame(tick)
    }
    const pause = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      previous = null
    }
    const start = () => {
      if (!suspended && document.visibilityState === 'visible' && frame === null) {
        frame = requestAnimationFrame(tick)
      }
    }
    const visibility = () => (document.visibilityState === 'visible' ? start() : pause())
    const nativePause = () => {
      suspended = true
      pause()
    }
    const nativeResume = () => {
      suspended = false
      pause()
      start()
    }
    start()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pageshow', nativeResume)
    window.addEventListener('gvent:pause', nativePause)
    window.addEventListener('gvent:resume', nativeResume)
    return () => {
      pause()
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pageshow', nativeResume)
      window.removeEventListener('gvent:pause', nativePause)
      window.removeEventListener('gvent:resume', nativeResume)
    }
  }, [running, animate, speed])

  return (
    <svg
      className={`fan ${small ? 'small' : ''}`}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
    >
      <g ref={rotor} transform="rotate(0 50 50)" data-fan-rotor>
        {[0, 90, 180, 270].map((rotation) => (
          <path
            key={rotation}
            transform={`rotate(${rotation} 50 50)`}
            d="M47 43C25 36 25 12 40 9c15-3 20 6 17 17l-4 17Z"
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="10" />
      <circle cx="50" cy="50" r="3" fill="#17201e" />
    </svg>
  )
}

export function FanIndicator({ running, speed }: { running: boolean; speed: number }) {
  const reducedMotion = useReducedMotion()
  const [override, setOverride] = useState<boolean | null>(null)
  const enabled = override ?? !reducedMotion
  return (
    <button
      type="button"
      className={`fan-orbit ${running ? 'running' : ''}`}
      aria-label="Animación del ventilador"
      aria-pressed={enabled}
      title={enabled ? 'Pausar animación' : 'Activar animación'}
      onClick={() => setOverride(!enabled)}
    >
      <Fan running={running} speed={speed} motionEnabled={enabled} />
    </button>
  )
}
