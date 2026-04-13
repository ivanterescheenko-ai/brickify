import { AlertTriangle, Clock, Wrench } from 'lucide-react'
import type { BuildResult } from '../api/client'

interface LegoGuideProps {
  guide: BuildResult['guide']
}

export default function LegoGuide({ guide }: LegoGuideProps) {
  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h2 className="text-display" style={{ fontSize: 'var(--text-xl)' }}>
          Assembly Guide
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> ~{guide.total_time_hours}ч
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wrench size={14} /> {guide.tools_list?.length || 0} tools
          </span>
        </div>
      </div>

      {guide.warnings && guide.warnings.length > 0 && (
        <div style={{
          padding: 'var(--space-4)', background: 'var(--danger-dim)',
          border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)', color: 'var(--danger)',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            {guide.warnings.map((w, i) => (
              <div key={i} style={{ marginBottom: i < guide.warnings.length - 1 ? 4 : 0 }}>{w}</div>
            ))}
          </div>
        </div>
      )}

      <div className="guide-steps">
        {guide.steps.map((step) => (
          <div className="guide-step" key={step.number} style={{ animation: `fadeUp 300ms ease ${step.number * 60}ms both` }}>
            <div className="step-number">{step.number}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-body">{step.what_to_do}</div>

              {step.tip && (
                <div className="step-tip">
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {step.tip}
                </div>
              )}

              {step.tools_needed && step.tools_needed.length > 0 && (
                <div className="step-tools">
                  {step.tools_needed.map((tool, i) => (
                    <span className="tool-tag" key={i}>{tool}</span>
                  ))}
                </div>
              )}

              <div className="step-time">~{step.time_minutes} min</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
