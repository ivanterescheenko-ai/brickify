import { useState } from 'react'
import { ExternalLink, Package, Cpu, CheckCircle, XCircle, ChevronDown, ChevronUp, Tag, Factory } from 'lucide-react'
import type { BuildResult } from '../api/client'

type Component = BuildResult['decomposition']['blocks'][0]['components'][0]

interface ComponentCardProps {
  component: Component
  blockName: string
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  octopart: { label: 'Octopart', color: 'var(--accent)' },
  tavily: { label: 'Web Search', color: 'var(--text-secondary)' },
  amazon: { label: 'Amazon', color: 'var(--success)' },
  aliexpress: { label: 'AliExpress', color: 'var(--warning)' },
  lcsc: { label: 'LCSC', color: '#ff6600' },
  szlcsc: { label: 'SZLCSC', color: '#ff6600' },
  ai_estimate: { label: 'AI Estimate', color: 'var(--text-tertiary)' },
}

export default function ComponentCard({ component: comp, blockName }: ComponentCardProps) {
  const [expanded, setExpanded] = useState(false)

  const price = comp.sourcing?.found ? comp.sourcing.price_usd : comp.estimated_price_usd
  const source = comp.sourcing?.source || 'ai_estimate'
  const srcCfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.ai_estimate
  const hasAlternatives = comp.sourcing?.alternatives && comp.sourcing.alternatives.length > 0
  const totalPrice = (price ?? 0) * comp.quantity

  return (
    <div className="comp-card" style={{ animation: 'fadeUp 300ms ease both' }}>
      {/* Header row */}
      <div className="comp-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="comp-card-icon">
          <Cpu size={16} />
        </div>
        <div className="comp-card-main">
          <div className="comp-card-name">{comp.name}</div>
          <div className="comp-card-meta">
            {comp.spec && <span className="comp-card-spec">{comp.spec}</span>}
            <span className="comp-card-block">{blockName}</span>
          </div>
        </div>
        <div className="comp-card-pricing">
          <div className="comp-card-price">${price ?? '—'}</div>
          <div className="comp-card-qty">×{comp.quantity}</div>
        </div>
        <div className="comp-card-total">${totalPrice.toFixed(0)}</div>
        <div className="comp-card-expand">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="comp-card-details">
          {/* Info grid */}
          <div className="comp-card-grid">
            {/* Source */}
            <div className="comp-card-field">
              <div className="comp-card-field-label">Source</div>
              <div className="comp-card-field-value">
                <span className="comp-card-source-badge" style={{ color: srcCfg.color, borderColor: srcCfg.color }}>
                  {srcCfg.label}
                </span>
              </div>
            </div>

            {/* Manufacturer */}
            {comp.sourcing?.manufacturer && (
              <div className="comp-card-field">
                <div className="comp-card-field-label">
                  <Factory size={10} /> Manufacturer
                </div>
                <div className="comp-card-field-value">{comp.sourcing.manufacturer}</div>
              </div>
            )}

            {/* MPN */}
            {comp.sourcing?.mpn && (
              <div className="comp-card-field">
                <div className="comp-card-field-label">
                  <Tag size={10} /> Part Number
                </div>
                <div className="comp-card-field-value" style={{ fontFamily: 'var(--font-mono)' }}>
                  {comp.sourcing.mpn}
                </div>
              </div>
            )}

            {/* Stock */}
            {comp.sourcing?.in_stock !== undefined && comp.sourcing?.in_stock !== null && (
              <div className="comp-card-field">
                <div className="comp-card-field-label">
                  <Package size={10} /> In Stock
                </div>
                <div className="comp-card-field-value">
                  {comp.sourcing.in_stock ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> Yes
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={12} /> No
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Why needed */}
            {comp.why && (
              <div className="comp-card-field" style={{ gridColumn: '1 / -1' }}>
                <div className="comp-card-field-label">Why needed</div>
                <div className="comp-card-field-value" style={{ color: 'var(--text-secondary)' }}>
                  {comp.why}
                </div>
              </div>
            )}
          </div>

          {/* Shop link */}
          {comp.sourcing?.found && comp.sourcing.shop_url && (
            <a
              href={comp.sourcing.shop_url}
              target="_blank"
              rel="noopener noreferrer"
              className="comp-card-shop-link"
            >
              Buy at {comp.sourcing.shop_name || 'Shop'} <ExternalLink size={12} />
            </a>
          )}

          {/* Alternatives */}
          {hasAlternatives && (
            <div className="comp-card-alternatives">
              <div className="comp-card-field-label" style={{ marginBottom: 8 }}>
                Alternatives ({comp.sourcing!.alternatives!.length})
              </div>
              {comp.sourcing!.alternatives!.slice(0, 3).map((alt, i) => (
                <div key={i} className="comp-card-alt">
                  <span className="comp-card-alt-name">{alt.name || 'Alternative'}</span>
                  {alt.price_usd && (
                    <span className="comp-card-alt-price">${alt.price_usd}</span>
                  )}
                  {alt.url && (
                    <a href={alt.url} target="_blank" rel="noopener noreferrer" className="comp-card-alt-link">
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
