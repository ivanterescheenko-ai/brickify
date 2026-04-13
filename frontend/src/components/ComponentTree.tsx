import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { BuildResult } from '../api/client'

interface ComponentTreeProps {
  blocks: BuildResult['decomposition']['blocks']
}

export default function ComponentTree({ blocks }: ComponentTreeProps) {
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set([0]))

  const toggleBlock = (i: number) => {
    setOpenBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
        <div className="text-label">Device Structure</div>
      </div>
      <div className="tree-root">
        {blocks.map((block, i) => (
          <div className="tree-block" key={i}>
            <div className="tree-block-header" onClick={() => toggleBlock(i)}>
              <div className="tree-block-icon" />
              <span className="tree-block-name">{block.name}</span>
              <span className="tree-block-count">{block.components.length}</span>
              <ChevronRight
                size={14}
                className={`tree-block-chevron ${openBlocks.has(i) ? 'open' : ''}`}
              />
            </div>
            {openBlocks.has(i) &&
              block.components.map((comp, j) => (
                <div className="tree-item" key={j}>
                  <div className="tree-item-info">
                    <div className="tree-item-name">{comp.name}</div>
                    {comp.spec && <div className="tree-item-spec">{comp.spec}</div>}
                  </div>
                  <div className="tree-item-price">
                    ${comp.sourcing?.found ? comp.sourcing.price_usd?.toFixed(0) : comp.estimated_price_usd}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
