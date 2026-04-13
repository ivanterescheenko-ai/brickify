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

export type SSEPhase = 'decomposing' | 'researching' | 'writing' | 'done' | 'error'

export interface SSECallbacks {
  onPhase: (phase: SSEPhase, message: string) => void
  onDecomposition: (data: BuildResult['decomposition']) => void
  onGuide: (data: BuildResult['guide']) => void
  onDone: (result: BuildResult) => void
  onError: (error: string) => void
}

export function buildDeviceStream(params: BuildParams, callbacks: SSECallbacks): AbortController {
  const controller = new AbortController()

  fetch(`${API_BASE}/build/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }))
      const detail = typeof err.detail === 'string' ? err.detail : err.detail?.detail || 'Неизвестная ошибка'
      callbacks.onError(detail)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { callbacks.onError('Нет потока данных'); return }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6))
            switch (currentEvent) {
              case 'phase': callbacks.onPhase(data.phase, data.message); break
              case 'decomposition': callbacks.onDecomposition(data); break
              case 'enriched': callbacks.onDecomposition(data); break
              case 'guide': callbacks.onGuide(data); break
              case 'done': callbacks.onDone(data); break
              case 'error': callbacks.onError(data.detail || data.error); break
            }
          } catch { /* skip malformed JSON */ }
          currentEvent = ''
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError(err.message || 'Ошибка соединения')
    }
  })

  return controller
}

/** Non-streaming fallback */
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

export async function testConnection(params: {
  provider: string; api_key: string; model: string; base_url: string
}): Promise<{ ok: boolean; error?: string; model?: string }> {
  try {
    const res = await fetch(`${API_BASE}/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(20000),
    })
    return await res.json()
  } catch {
    return { ok: false, error: 'Бэкенд недоступен' }
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
