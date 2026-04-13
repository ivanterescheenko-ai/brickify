import { AlertTriangle, Clock, Wrench, Zap, CheckCircle, Package, Cable, Eye, CircleDot } from 'lucide-react'
import type { BuildResult, GuideStep } from '../api/client'

interface LegoGuideProps {
  guide: BuildResult['guide']
}

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'var(--success)', icon: '●' },
  moderate: { label: 'Moderate', color: 'var(--warning)', icon: '●' },
  hard: { label: 'Hard', color: 'var(--danger)', icon: '●' },
}

function StepCard({ step }: { step: GuideStep }) {
  const diff = step.difficulty ? DIFFICULTY_CONFIG[step.difficulty] : null

  return (
    <div className="guide-step" style={{ animation: `fadeUp 300ms ease ${step.number * 60}ms both` }}>
      <div className="step-number">{step.number}</div>
      <div className="step-content">
        {/* Title + difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div className="step-title" style={{ margin: 0 }}>{step.title}</div>
          {diff && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500,
              color: diff.color, padding: '1px 8px',
              border: `1px solid ${diff.color}`, borderRadius: 'var(--radius-full)',
              whiteSpace: 'nowrap',
            }}>
              {diff.label}
            </span>
          )}
        </div>

        {/* Main instruction */}
        <div className="step-body">{step.what_to_do}</div>

        {/* Wiring diagram */}
        {step.wiring && (
          <div style={{
            padding: 'var(--space-3)', background: 'var(--accent-dim)',
            borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--accent)',
            fontSize: 'var(--text-sm)', color: 'var(--accent)',
            fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
            display: 'flex', gap: 'var(--space-2)',
          }}>
            <Cable size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{step.wiring}</span>
          </div>
        )}

        {/* Tip */}
        {step.tip && (
          <div className="step-tip">
            <Zap size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {step.tip}
          </div>
        )}

        {/* Common mistake */}
        {step.common_mistake && (
          <div style={{
            padding: 'var(--space-3)', background: 'var(--danger-dim)',
            borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--danger)',
            fontSize: 'var(--text-sm)', color: 'var(--danger)',
            marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)',
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Common mistake:</strong> {step.common_mistake}</span>
          </div>
        )}

        {/* Verification checklist */}
        {step.verification && step.verification.length > 0 && (
          <div style={{
            padding: 'var(--space-3)', background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            marginTop: 'var(--space-3)',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--success)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <CheckCircle size={10} /> Before moving on
            </div>
            {step.verification.map((check, i) => (
              <div key={i} style={{
                fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: i > 0 ? 4 : 0,
              }}>
                <CircleDot size={10} style={{ color: 'var(--text-tertiary)', marginTop: 4, flexShrink: 0 }} />
                {check}
              </div>
            ))}
          </div>
        )}

        {/* Components used */}
        {step.components_used && step.components_used.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <Package size={12} style={{ color: 'var(--text-tertiary)', marginTop: 2 }} />
            {step.components_used.map((comp, i) => (
              <span key={i} style={{
                fontSize: 'var(--text-xs)', padding: '2px 8px',
                background: 'var(--accent-dim)', color: 'var(--accent)',
                borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-mono)',
              }}>
                {comp}
              </span>
            ))}
          </div>
        )}

        {/* Tools + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          {step.tools_needed && step.tools_needed.length > 0 && (
            <div className="step-tools" style={{ margin: 0 }}>
              {step.tools_needed.map((tool, i) => (
                <span className="tool-tag" key={i}>{tool}</span>
              ))}
            </div>
          )}
          <div className="step-time" style={{ margin: 0 }}>~{step.time_minutes} min</div>
        </div>

        {/* Photo description */}
        {step.photo_description && (
          <div style={{
            marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)', fontStyle: 'italic',
            display: 'flex', alignItems: 'flex-start', gap: 4,
          }}>
            <Eye size={10} style={{ marginTop: 3, flexShrink: 0 }} />
            {step.photo_description}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LegoGuide({ guide }: LegoGuideProps) {
  const warnings = guide.safety_warnings || guide.warnings || []

  // Support both phase-based and flat step formats
  const phases = guide.phases || (guide.steps ? [{ name: 'Assembly', description: '', steps: guide.steps }] : [])
  const allSteps = phases.flatMap((p) => p.steps)

  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h2 className="text-display" style={{ fontSize: 'var(--text-xl)' }}>
          Assembly Guide
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> ~{guide.total_time_hours}h
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wrench size={14} /> {guide.tools_list?.length || 0} tools
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
            {allSteps.length} steps
          </span>
        </div>
      </div>

      {/* Before you start */}
      {guide.before_you_start && (
        <div style={{
          padding: 'var(--space-4)', background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)', lineHeight: 'var(--leading-loose)',
        }}>
          <div style={{
            fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)',
          }}>
            Before you start
          </div>
          {guide.before_you_start}
        </div>
      )}

      {/* Safety warnings */}
      {warnings.length > 0 && (
        <div style={{
          padding: 'var(--space-4)', background: 'var(--danger-dim)',
          border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)', color: 'var(--danger)',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Safety warnings</div>
            {warnings.map((w, i) => (
              <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>• {w}</div>
            ))}
          </div>
        </div>
      )}

      {/* Materials list */}
      {guide.materials_list && guide.materials_list.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}>
          <span style={{
            fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)', alignSelf: 'center',
          }}>
            Materials:
          </span>
          {guide.materials_list.map((mat, i) => (
            <span className="tool-tag" key={i}>{mat}</span>
          ))}
        </div>
      )}

      {/* Phases and steps */}
      {phases.map((phase, pi) => (
        <div key={pi} style={{ marginBottom: 'var(--space-6)' }}>
          {/* Phase header (only if multiple phases) */}
          {phases.length > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
                fontWeight: 500, color: 'var(--accent)',
                padding: '2px 8px', background: 'var(--accent-dim)',
                borderRadius: 'var(--radius-full)',
              }}>
                Phase {pi + 1}
              </span>
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-primary)' }}>
                {phase.name}
              </span>
              {phase.description && (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                  — {phase.description}
                </span>
              )}
            </div>
          )}

          <div className="guide-steps">
            {phase.steps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </div>
      ))}

      {/* After completion */}
      {guide.after_completion && (
        <div style={{
          padding: 'var(--space-4)', background: 'var(--success-dim)',
          border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-md)',
          marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)',
          color: 'var(--success)', lineHeight: 'var(--leading-loose)',
        }}>
          <div style={{
            fontSize: 'var(--text-xs)', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)',
          }}>
            After completion
          </div>
          {guide.after_completion}
        </div>
      )}
    </div>
  )
}
