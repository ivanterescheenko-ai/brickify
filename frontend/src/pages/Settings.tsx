import { useState } from 'react'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useSettings } from '../store/settings'
import { checkHealth } from '../api/client'

const PROVIDERS = [
  { id: 'anthropic', name: 'Claude', org: 'Anthropic', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'openai', name: 'GPT-4.1', org: 'OpenAI', placeholder: 'sk-...', defaultModel: 'gpt-4.1' },
  { id: 'google', name: 'Gemini', org: 'Google', placeholder: 'AIzaSy...', defaultModel: 'gemini-2.5-flash' },
  { id: 'xai', name: 'Grok', org: 'xAI', placeholder: 'xai-...', defaultModel: 'grok-3' },
  { id: 'deepseek', name: 'DeepSeek', org: 'DeepSeek', placeholder: 'sk-...', defaultModel: 'deepseek-r1' },
  { id: 'ollama', name: 'Ollama', org: 'Локально', placeholder: '', defaultModel: 'llama4-scout', noKey: true },
  { id: 'lmstudio', name: 'LM Studio', org: 'Локально', placeholder: '', defaultModel: 'local-model', noKey: true },
] as const

type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error'

export default function Settings() {
  const { provider, apiKey, model, baseUrl, tavilyKey, setSettings } = useSettings()
  const [status, setStatus] = useState<ConnectionStatus>('idle')

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)
  const needsKey = selectedProvider ? !('noKey' in selectedProvider && selectedProvider.noKey) : true
  const needsUrl = provider === 'ollama' || provider === 'lmstudio'

  const handleSelectProvider = (id: string) => {
    const p = PROVIDERS.find((pr) => pr.id === id)
    setSettings({
      provider: id,
      model: p?.defaultModel || '',
      baseUrl: id === 'ollama' ? 'http://localhost:11434' : id === 'lmstudio' ? 'http://localhost:1234' : '',
    })
    setStatus('idle')
  }

  const handleCheck = async () => {
    setStatus('checking')
    const ok = await checkHealth()
    setStatus(ok ? 'ok' : 'error')
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="text-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>
        Настройки
      </h1>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-4)' }}>
          Выбери AI-модель
        </div>
        <div className="providers-grid">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className={`provider-card ${provider === p.id ? 'selected' : ''}`}
              onClick={() => handleSelectProvider(p.id)}
            >
              <div className="provider-card-name">{p.name}</div>
              <div className="provider-card-org">{p.org}</div>
            </div>
          ))}
        </div>
      </section>

      {provider && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {needsKey && (
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                API ключ
              </label>
              <input
                className="input"
                type="password"
                placeholder={selectedProvider?.placeholder}
                value={apiKey}
                onChange={(e) => setSettings({ apiKey: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
              Модель
            </label>
            <input
              className="input"
              placeholder={selectedProvider?.defaultModel}
              value={model}
              onChange={(e) => setSettings({ model: e.target.value })}
            />
          </div>

          {needsUrl && (
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Base URL
              </label>
              <input
                className="input"
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setSettings({ baseUrl: e.target.value })}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="btn btn-secondary" onClick={handleCheck} disabled={status === 'checking'}>
              {status === 'checking' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Проверить подключение
            </button>
            {status === 'ok' && (
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <CheckCircle size={14} /> Работает
              </span>
            )}
            {status === 'error' && (
              <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <AlertTriangle size={14} /> Бэкенд недоступен
              </span>
            )}
          </div>
        </section>
      )}

      <section style={{ marginTop: 'var(--space-10)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-6)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-4)' }}>
          Поиск компонентов (опционально)
        </div>
        <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
          Tavily API ключ — для поиска цен
        </label>
        <input
          className="input"
          type="password"
          placeholder="tvly-..."
          value={tavilyKey}
          onChange={(e) => setSettings({ tavilyKey: e.target.value })}
        />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
          Бесплатно 1000 запросов/месяц. Без ключа будут показаны оценочные цены.
        </div>
      </section>
    </div>
  )
}
