const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface BuildParams {
  description: string
  budget?: string
  skill_level?: string
  country?: string
  provider: string
  api_key: string
  model: string
  base_url?: string
}

export interface BuildResult {
  decomposition: {
    device: string
    description: string
    estimated_budget_usd: number
    difficulty: string
    blocks: Array<{
      name: string
      purpose: string
      components: Array<{
        name: string
        spec: string
        quantity: number
        estimated_price_usd: number
        why: string
        sourcing?: {
          found: boolean
          price_usd?: number
          shop_name?: string
          shop_url?: string
          alternatives?: Array<{ name: string; price_usd: number; url: string }>
        }
      }>
    }>
  }
  guide: {
    steps: Array<{
      number: number
      title: string
      what_to_do: string
      why: string
      tip: string
      tools_needed: string[]
      time_minutes: number
    }>
    total_time_hours: number
    tools_list: string[]
    warnings: string[]
  }
}

export async function buildDevice(params: BuildParams): Promise<BuildResult> {
  const res = await fetch(`${API_BASE}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }))
    const detail = typeof err.detail === 'string'
      ? err.detail
      : err.detail?.detail || 'Неизвестная ошибка'
    throw new Error(detail)
  }

  return res.json()
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
