import { useState } from 'react'
import { Search, Loader2, Cpu } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading: boolean
}

const EXAMPLES = [
  { label: 'FPV drone' },
  { label: 'Arduino thermostat' },
  { label: '3D printer' },
  { label: 'Smart lamp' },
]

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !loading) {
      onSearch(query.trim())
    }
  }

  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 20px 40px',
      animation: 'fadeUp 500ms ease',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 14px', borderRadius: 'var(--radius-full)',
        background: 'var(--accent-dim)', border: '1px solid var(--border-accent)',
        fontSize: 'var(--text-xs)', color: 'var(--accent)',
        fontFamily: 'var(--font-mono)', fontWeight: 500,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        marginBottom: 'var(--space-6)',
      }}>
        <Cpu size={12} />
        AI Hardware Decomposer
      </div>

      <div className="text-display" style={{
        fontSize: 'clamp(32px, 5vw, 52px)',
        marginBottom: 'var(--space-4)',
        lineHeight: 1.1,
      }}>
        What are we building?
      </div>
      <p style={{
        color: 'var(--text-secondary)', fontSize: 16,
        marginBottom: 'var(--space-10)',
        maxWidth: 480, marginInline: 'auto',
      }}>
        Describe a device — AI breaks it into components, finds where to buy, and writes assembly instructions
      </p>

      <form onSubmit={handleSubmit} style={{
        display: 'flex', justifyContent: 'center',
        marginBottom: 'var(--space-6)',
      }}>
        <div className="search-container">
          <input
            className="search-input"
            placeholder="e.g. FPV racing drone 5 inch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
            {loading
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={16} />
            }
            <span>Build</span>
          </button>
        </div>
      </form>

      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
        animation: 'fadeUp 500ms ease 200ms both',
      }}>
        <span style={{
          fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)', alignSelf: 'center',
          marginRight: 4,
        }}>
          Try:
        </span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex.label}
            className="btn btn-ghost"
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              padding: '0 14px',
              animation: `fadeUp 300ms ease ${300 + i * 80}ms both`,
            }}
            onClick={() => { setQuery(ex.label); onSearch(ex.label) }}
            disabled={loading}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  )
}
