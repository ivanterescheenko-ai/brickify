import { useState, useRef, useCallback } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useSettings } from '../store/settings'
import { buildDeviceStream, type BuildResult, type SSEPhase } from '../api/client'
import SearchBar from '../components/SearchBar'
import StatCards from '../components/StatCards'
import ComponentTree from '../components/ComponentTree'
import BomTable from '../components/BomTable'
import LegoGuide from '../components/LegoGuide'
import SkeletonLoading from '../components/SkeletonLoading'

export default function Home() {
  const settings = useSettings()
  const [result, setResult] = useState<BuildResult | null>(null)
  const [decomposition, setDecomposition] = useState<BuildResult['decomposition'] | null>(null)
  const [guide, setGuide] = useState<BuildResult['guide'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const handleSearch = useCallback((query: string) => {
    if (!settings.provider) {
      setError('Choose an AI provider in Settings first')
      return
    }

    // Отменяем предыдущий запрос
    abortRef.current?.abort()

    setLoading(true)
    setError(null)
    setResult(null)
    setDecomposition(null)
    setGuide(null)
    setPhase('Connecting...')
    setLastQuery(query)

    abortRef.current = buildDeviceStream(
      {
        description: query,
        provider: settings.provider,
        api_key: settings.apiKey,
        model: settings.model,
        base_url: settings.baseUrl,
      },
      {
        onPhase: (_phase: SSEPhase, message: string) => {
          setPhase(message)
        },
        onDecomposition: (data) => {
          setDecomposition(data)
        },
        onGuide: (data) => {
          setGuide(data)
        },
        onDone: (data) => {
          setResult(data)
          setDecomposition(data.decomposition)
          setGuide(data.guide)
          setLoading(false)
          setPhase('')
          // Сохраняем в историю
          saveToHistory(query, data)
        },
        onError: (err) => {
          setError(err)
          setLoading(false)
          setPhase('')
        },
      },
    )
  }, [settings])

  const handleRetry = () => {
    if (lastQuery) handleSearch(lastQuery)
  }

  const totalComponents = (decomposition || result?.decomposition)
    ? (decomposition || result!.decomposition).blocks.reduce((sum, b) => sum + b.components.length, 0)
    : 0
  const totalBudget = (decomposition || result?.decomposition)?.estimated_budget_usd ?? 0
  const difficulty = (decomposition || result?.decomposition)?.difficulty ?? ''
  const currentBlocks = (decomposition || result?.decomposition)?.blocks
  const currentGuide = guide || result?.guide
  const hasTavily = currentBlocks
    ? currentBlocks.some((b) => b.components.some((c) => c.sourcing?.found))
    : false

  return (
    <div>
      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="error-container" style={{ maxWidth: 720, margin: '0 auto var(--space-6)', animation: 'fadeUp 300ms ease' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Something went wrong</div>
            <div style={{ opacity: 0.8 }}>{error}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}
                onClick={handleRetry}
              >
                <RotateCcw size={12} /> Retry
              </button>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && !currentBlocks && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <SkeletonLoading phase={phase} />
        </div>
      )}

      {currentBlocks && (
        <div style={{ animation: 'fadeUp 400ms ease' }}>
          <StatCards
            totalComponents={totalComponents}
            totalBudget={totalBudget}
            difficulty={difficulty}
            hasTavily={hasTavily}
          />

          <div className="dashboard-grid">
            <ComponentTree blocks={currentBlocks} />
            <BomTable blocks={currentBlocks} hasTavily={hasTavily} />
          </div>

          {loading && !currentGuide && (
            <div style={{ maxWidth: 720, margin: 'var(--space-8) auto 0' }}>
              <SkeletonLoading phase={phase} />
            </div>
          )}

          {currentGuide && <LegoGuide guide={currentGuide} />}
        </div>
      )}
    </div>
  )
}

function saveToHistory(query: string, result: BuildResult) {
  try {
    const history = JSON.parse(localStorage.getItem('brickify-history') || '[]')
    history.unshift({
      query,
      device: result.decomposition.device,
      budget: result.decomposition.estimated_budget_usd,
      components: result.decomposition.blocks.reduce((s, b) => s + b.components.length, 0),
      timestamp: Date.now(),
    })
    // Храним максимум 20
    localStorage.setItem('brickify-history', JSON.stringify(history.slice(0, 20)))
  } catch { /* localStorage недоступен */ }
}
