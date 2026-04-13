import { useState, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useSettings } from '../store/settings'
import { buildDevice, type BuildResult } from '../api/client'
import SearchBar from '../components/SearchBar'
import StatCards from '../components/StatCards'
import ComponentTree from '../components/ComponentTree'
import BomTable from '../components/BomTable'
import LegoGuide from '../components/LegoGuide'
import SkeletonLoading from '../components/SkeletonLoading'

export default function Home() {
  const settings = useSettings()
  const [result, setResult] = useState<BuildResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef(0)

  const handleSearch = async (query: string) => {
    if (!settings.provider) {
      setError('Сначала выбери AI-провайдер в настройках')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    startTimeRef.current = Date.now()

    try {
      const data = await buildDevice({
        description: query,
        provider: settings.provider,
        api_key: settings.apiKey,
        model: settings.model,
        base_url: settings.baseUrl,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const totalComponents = result
    ? result.decomposition.blocks.reduce((sum, b) => sum + b.components.length, 0)
    : 0
  const totalBudget = result?.decomposition.estimated_budget_usd ?? 0
  const difficulty = result?.decomposition.difficulty ?? ''
  const hasTavily = result
    ? result.decomposition.blocks.some((b) =>
        b.components.some((c) => c.sourcing?.found)
      )
    : false

  return (
    <div>
      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="error-container" style={{ maxWidth: 720, margin: '0 auto var(--space-6)' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Что-то пошло не так</div>
            <div style={{ opacity: 0.8 }}>{error}</div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8, color: 'var(--danger)' }}
              onClick={() => setError(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <SkeletonLoading startTime={startTimeRef.current} />
        </div>
      )}

      {result && (
        <div style={{ animation: 'fadeUp 400ms ease' }}>
          <StatCards
            totalComponents={totalComponents}
            totalBudget={totalBudget}
            difficulty={difficulty}
            hasTavily={hasTavily}
          />

          <div className="dashboard-grid">
            <ComponentTree blocks={result.decomposition.blocks} />
            <BomTable blocks={result.decomposition.blocks} hasTavily={hasTavily} />
          </div>

          <LegoGuide guide={result.guide} />
        </div>
      )}
    </div>
  )
}
