import { ExternalLink, Copy } from 'lucide-react'
import type { BuildResult } from '../api/client'

interface BomTableProps {
  blocks: BuildResult['decomposition']['blocks']
  hasTavily: boolean
}

export default function BomTable({ blocks, hasTavily }: BomTableProps) {
  const allComponents = blocks.flatMap((b) => b.components)
  const totalPrice = allComponents.reduce((sum, c) => {
    const price = c.sourcing?.found ? (c.sourcing.price_usd ?? 0) : c.estimated_price_usd
    return sum + price * c.quantity
  }, 0)

  const copyBom = () => {
    const lines = ['| Компонент | Кол-во | Цена |', '|---|---|---|']
    allComponents.forEach((c) => {
      const price = c.sourcing?.found ? c.sourcing.price_usd : c.estimated_price_usd
      lines.push(`| ${c.name} | ${c.quantity} | $${price} |`)
    })
    lines.push(`| **Итого** | | **$${totalPrice.toFixed(0)}** |`)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: 'var(--space-4)', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div className="text-label">Bill of Materials</div>
        <button className="btn btn-ghost" onClick={copyBom} style={{ gap: 4 }}>
          <Copy size={12} /> Скопировать
        </button>
      </div>

      {!hasTavily && (
        <div style={{
          padding: 'var(--space-2) var(--space-4)', background: 'var(--warning-dim)',
          fontSize: 'var(--text-xs)', color: 'var(--warning)',
        }}>
          Цены — оценка AI. Подключи Tavily API для актуальных цен.
        </div>
      )}

      <table className="bom-table">
        <thead>
          <tr>
            <th>Компонент</th>
            <th style={{ textAlign: 'center' }}>Кол-во</th>
            <th style={{ textAlign: 'right' }}>Цена</th>
            <th>Где купить</th>
          </tr>
        </thead>
        <tbody>
          {allComponents.map((comp, i) => {
            const price = comp.sourcing?.found ? comp.sourcing.price_usd : comp.estimated_price_usd
            return (
              <tr key={i} style={{ animationDelay: `${i * 40}ms` }}>
                <td>
                  <div className="bom-name">{comp.name}</div>
                  {comp.spec && <div className="bom-spec">{comp.spec}</div>}
                </td>
                <td className="bom-qty">{comp.quantity}</td>
                <td className="bom-price">${price}</td>
                <td>
                  {comp.sourcing?.found && comp.sourcing.shop_url ? (
                    <a href={comp.sourcing.shop_url} target="_blank" rel="noopener noreferrer" className="bom-shop">
                      {comp.sourcing.shop_name} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
          <tr className="bom-total">
            <td>Итого</td>
            <td className="bom-qty">{allComponents.reduce((s, c) => s + c.quantity, 0)}</td>
            <td className="bom-price">${totalPrice.toFixed(0)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
