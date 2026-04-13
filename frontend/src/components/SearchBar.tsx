import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading: boolean
}

const EXAMPLES = ['FPV дрон', 'Arduino термостат', '3D принтер', 'Умная лампа']

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !loading) {
      onSearch(query.trim())
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="text-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        Что собираем?
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 'var(--space-8)' }}>
        Опиши устройство — AI разберёт на части и найдёт где купить
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <div className="search-container">
          <input
            className="search-input"
            placeholder="Например: FPV дрон для гонок 5 дюймов"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
            {loading
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={16} />
            }
            <span>Собрать</span>
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={() => { setQuery(ex); onSearch(ex) }}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
