import { Loader2 } from 'lucide-react'

interface SkeletonLoadingProps {
  phase: string
}

export default function SkeletonLoading({ phase }: SkeletonLoadingProps) {
  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: 'var(--accent)', fontSize: 14, marginBottom: 'var(--space-6)',
        fontFamily: 'var(--font-mono)',
      }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        {phase || 'Обработка...'}
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
