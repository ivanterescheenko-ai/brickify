import { Copy, Download, FileText } from 'lucide-react'
import type { BuildResult } from '../api/client'
import ComponentCard from './ComponentCard'

interface BomTableProps {
  blocks: BuildResult['decomposition']['blocks']
  hasTavily: boolean
  deviceName?: string
  guide?: BuildResult['guide']
}

export default function BomTable({ blocks, hasTavily, deviceName, guide }: BomTableProps) {
  const allComponents = blocks.flatMap((b) => b.components)
  const totalPrice = allComponents.reduce((sum, c) => {
    const price = c.sourcing?.found ? (c.sourcing.price_usd ?? 0) : c.estimated_price_usd
    return sum + price * c.quantity
  }, 0)

  const copyBom = () => {
    const lines = ['| Component | Qty | Price |', '|---|---|---|']
    allComponents.forEach((c) => {
      const price = c.sourcing?.found ? c.sourcing.price_usd : c.estimated_price_usd
      lines.push(`| ${c.name} | ${c.quantity} | $${price} |`)
    })
    lines.push(`| **Total** | | **$${totalPrice.toFixed(0)}** |`)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const downloadCsv = () => {
    const rows = [['Component', 'Spec', 'Qty', 'Price USD', 'Shop', 'URL', 'Source']]
    allComponents.forEach((c) => {
      const price = c.sourcing?.found ? c.sourcing.price_usd : c.estimated_price_usd
      rows.push([
        c.name, c.spec || '', String(c.quantity), String(price),
        c.sourcing?.shop_name || '', c.sourcing?.shop_url || '',
        c.sourcing?.source || 'ai_estimate',
      ])
    })
    rows.push(['TOTAL', '', String(allComponents.reduce((s, c) => s + c.quantity, 0)), String(totalPrice.toFixed(2)), '', '', ''])
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'brickify-bom.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPdf = () => {
    // Generate printable HTML and open print dialog
    const html = generatePdfHtml(deviceName || 'Device', blocks, guide)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setTimeout(() => w.print(), 500)
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: 'var(--space-4)', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="text-label">Bill of Materials</div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
            color: 'var(--success)', fontWeight: 500,
          }}>
            {allComponents.length} parts · ${totalPrice.toFixed(0)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost" onClick={downloadPdf} style={{ gap: 4 }}>
            <FileText size={12} /> PDF
          </button>
          <button className="btn btn-ghost" onClick={downloadCsv} style={{ gap: 4 }}>
            <Download size={12} /> CSV
          </button>
          <button className="btn btn-ghost" onClick={copyBom} style={{ gap: 4 }}>
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>

      {!hasTavily && (
        <div style={{
          padding: 'var(--space-2) var(--space-4)', background: 'var(--warning-dim)',
          fontSize: 'var(--text-xs)', color: 'var(--warning)',
        }}>
          Prices are AI estimates. Add API keys in Settings for real prices.
        </div>
      )}

      <div style={{ padding: 'var(--space-3)' }}>
        <div className="comp-cards-list">
          {blocks.map((block) =>
            block.components.map((comp, j) => (
              <ComponentCard key={`${block.name}-${j}`} component={comp} blockName={block.name} />
            ))
          )}
        </div>

        {/* Total row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-4) var(--space-4) var(--space-2)',
          borderTop: '1px solid var(--border-medium)', marginTop: 'var(--space-3)',
        }}>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Total</span>
          <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {allComponents.reduce((s, c) => s + c.quantity, 0)} items
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 500, color: 'var(--text-primary)' }}>
              ${totalPrice.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


function generatePdfHtml(
  deviceName: string,
  blocks: BomTableProps['blocks'],
  guide?: BuildResult['guide'],
): string {
  const allComponents = blocks.flatMap((b) => b.components)
  const totalPrice = allComponents.reduce((sum, c) => {
    const price = c.sourcing?.found ? (c.sourcing.price_usd ?? 0) : c.estimated_price_usd
    return sum + price * c.quantity
  }, 0)

  const bomRows = allComponents.map((c, i) => {
    const price = c.sourcing?.found ? c.sourcing.price_usd : c.estimated_price_usd
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${c.name}</strong>${c.spec ? `<br><small style="color:#888">${c.spec}</small>` : ''}</td>
      <td style="text-align:center">${c.quantity}</td>
      <td style="text-align:right">$${price}</td>
      <td>${c.sourcing?.shop_name || '—'}</td>
    </tr>`
  }).join('')

  const allSteps = guide?.phases?.flatMap(p => p.steps) || guide?.steps || []
  const guideSteps = allSteps.map((s) => `
    <div style="margin-bottom:24px; page-break-inside:avoid">
      <h3 style="margin:0 0 8px; font-size:16px">
        <span style="display:inline-block; width:28px; height:28px; border-radius:50%; background:#3B82F6; color:white; text-align:center; line-height:28px; font-size:13px; margin-right:8px">${s.number}</span>
        ${s.title}
      </h3>
      <p style="margin:0 0 8px; color:#444; line-height:1.6">${s.what_to_do}</p>
      ${s.wiring ? `<div style="background:#EFF6FF; border-left:3px solid #3B82F6; padding:8px 12px; border-radius:4px; font-size:13px; color:#1E40AF; margin-bottom:8px">🔌 ${s.wiring}</div>` : ''}
      ${s.tip ? `<div style="background:#FEF3C7; border-left:3px solid #F59E0B; padding:8px 12px; border-radius:4px; font-size:13px; color:#92400E; margin-bottom:8px">💡 ${s.tip}</div>` : ''}
      ${s.common_mistake ? `<div style="background:#FEE2E2; border-left:3px solid #EF4444; padding:8px 12px; border-radius:4px; font-size:13px; color:#991B1B; margin-bottom:8px">⚠️ Common mistake: ${s.common_mistake}</div>` : ''}
      ${s.verification?.length ? `<div style="background:#F0FDF4; border-left:3px solid #22C55E; padding:8px 12px; border-radius:4px; font-size:13px; color:#166534; margin-bottom:8px">✅ Before moving on:<br>${s.verification.map(v => `• ${v}`).join('<br>')}</div>` : ''}
      ${s.tools_needed?.length ? `<div style="font-size:12px; color:#888">Tools: ${s.tools_needed.join(', ')}</div>` : ''}
      <div style="font-size:12px; color:#888; margin-top:4px">~${s.time_minutes} min${s.difficulty ? ` · ${s.difficulty}` : ''}</div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Brickify — ${deviceName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 600; margin-bottom: 4px; }
  h2 { font-size: 20px; font-weight: 600; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #3B82F6; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .stats { display: flex; gap: 24px; margin-bottom: 24px; }
  .stat { padding: 12px 16px; background: #f8f9fb; border-radius: 8px; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 4px; }
  .stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
  td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  .total-row td { font-weight: 600; border-top: 2px solid #333; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #aaa; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head><body>
  <h1>🔧 ${deviceName}</h1>
  <div class="subtitle">Generated by Brickify — AI Hardware Decomposer</div>

  <div class="stats">
    <div class="stat"><div class="stat-label">Components</div><div class="stat-value">${allComponents.length}</div></div>
    <div class="stat"><div class="stat-label">Total Budget</div><div class="stat-value">$${totalPrice.toFixed(0)}</div></div>
    ${guide ? `<div class="stat"><div class="stat-label">Build Time</div><div class="stat-value">~${guide.total_time_hours}h</div></div>` : ''}
  </div>

  <h2>Bill of Materials</h2>
  <table>
    <thead><tr><th>#</th><th>Component</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th>Shop</th></tr></thead>
    <tbody>
      ${bomRows}
      <tr class="total-row">
        <td></td><td>Total</td>
        <td style="text-align:center">${allComponents.reduce((s, c) => s + c.quantity, 0)}</td>
        <td style="text-align:right">$${totalPrice.toFixed(0)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  ${guide ? `
  <h2>Assembly Guide</h2>
  ${guide.warnings?.length ? `<div style="background:#FEE2E2; border-left:3px solid #EF4444; padding:12px; border-radius:4px; margin-bottom:20px; font-size:13px; color:#991B1B">⚠️ ${guide.warnings.join('<br>⚠️ ')}</div>` : ''}
  ${guideSteps}
  ` : ''}

  <div class="footer">
    Generated by Brickify · github.com/ivanterescheenko-ai/brickify
  </div>
</body></html>`
}
