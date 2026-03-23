interface ProgressRingProps {
  percent: number   // 0-100
  size?: number
  stroke?: number
  label?: string   // center top text
  value?: string   // center large text
  sub?: string     // center bottom text
}

function ringColor(percent: number): string {
  if (percent >= 100) return '#a78bfa'  // violet-complete
  if (percent >= 80)  return '#ef4444'  // red
  if (percent >= 50)  return '#f59e0b'  // amber
  return '#22c55e'                       // green
}

export function ProgressRing({ percent, size = 120, stroke = 10, label, value, sub }: ProgressRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - Math.min(percent, 100) / 100)
  const color = ringColor(percent)
  const center = size / 2

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="ring-progress"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 1,
      }}>
        {label && (
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </span>
        )}
        {value && (
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color: color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </span>
        )}
        {sub && (
          <span style={{ fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
