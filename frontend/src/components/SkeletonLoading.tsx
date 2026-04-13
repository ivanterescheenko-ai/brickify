import { Loader2 } from 'lucide-react'

const PHASES = [
  'Анализирую устройство...',
  'Разбиваю на блоки...',
  'Ищу компоненты...',
  'Считаю бюджет...',
  'Пишу инструкцию...',
]

interface SkeletonLoadingProps {
  startTime: number
}

export default function SkeletonLoading({ startTime }: SkeletonLoadingProps) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const phaseIndex = Math.min(Math.floor(elapsed / 8), PHASES.length - 1)

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-6)',
      }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        {PHASES[phaseIndex]}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[100, 85, 90, 75, 80].map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="skeleton" style={{ height: 14, width: `${w}%`, animationDelay: `${i * 80}ms` }} />
            <div className="skeleton" style={{ height: 14, width: 50, flexShrink: 0, animationDelay: `${i * 80 + 40}ms` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
