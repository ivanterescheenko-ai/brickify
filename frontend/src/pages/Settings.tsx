import { useState } from 'react'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useSettings } from '../store/settings'
import { testConnection } from '../api/client'

const PROVIDERS = [
  { id: 'anthropic', name: 'Claude', org: 'Anthropic', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'openai', name: 'GPT-4.1', org: 'OpenAI', placeholder: 'sk-...', defaultModel: 'gpt-4.1' },
  { id: 'google', name: 'Gemini', org: 'Google', placeholder: 'AIzaSy...', defaultModel: 'gemini-2.5-flash' },
  { id: 'xai', name: 'Grok', org: 'xAI', placeholder: 'xai-...', defaultModel: 'grok-3' },
  { id: 'deepseek', name: 'DeepSeek', org: 'DeepSeek', placeholder: 'sk-...', defaultModel: 'deepseek-r1' },
  { id: 'ollama', name: 'Ollama', org: 'Local', placeholder: '', defaultModel: 'llama4-scout', noKey: true },
  { id: 'lmstudio', name: 'LM Studio', org: 'Local', placeholder: '', defaultModel: 'local-model', noKey: true },
] as const

type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error'

export default function Settings() {
  const { provider, apiKey, model, baseUrl, octopartKey, tavilyKey, setSettings } = useSettings()
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')

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
    setStatusDetail('')
  }

  const handleCheck = async () => {
    setStatus('checking')
    setStatusDetail('')
    const result = await testConnection({ provider, api_key: apiKey, model, base_url: baseUrl })
    if (result.ok) {
      setStatus('ok')
      setStatusDetail(result.model ? `Model: ${result.model}` : '')
    } else {
      setStatus('error')
      setStatusDetail(result.error || 'Unknown error')
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="text-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>
        Settings
      </h1>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-4)' }}>
          Choose AI Model
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
                API Key
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
              Model
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={handleCheck} disabled={status === 'checking'}>
                {status === 'checking' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                Test Connection
              </button>
              {status === 'ok' && (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <CheckCircle size={14} /> Connected
                </span>
              )}
              {status === 'error' && (
                <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <AlertTriangle size={14} /> Error
                </span>
              )}
            </div>
            {statusDetail && (
              <div style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: status === 'ok' ? 'var(--text-secondary)' : 'var(--danger)',
                padding: 'var(--space-2) var(--space-3)',
                background: status === 'ok' ? 'var(--success-dim)' : 'var(--danger-dim)',
                borderRadius: 'var(--radius-sm)',
              }}>
                {statusDetail}
              </div>
            )}
          </div>
        </section>
      )}

      <section style={{ marginTop: 'var(--space-10)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-6)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-6)' }}>
          Component Search (optional)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
              Octopart API Key — electronic components (DigiKey, Mouser, Arrow)
            </label>
            <input
              className="input"
              type="password"
              placeholder="octopart-api-key..."
              value={octopartKey}
              onChange={(e) => setSettings({ octopartKey: e.target.value })}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Free 100 requests/hour. Best for ICs, resistors, MCUs.{' '}
              <a href="https://octopart.com/api/register" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get key</a>
            </div>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
              Tavily API Key — general search (frames, motors, batteries)
            </label>
            <input
              className="input"
              type="password"
              placeholder="tvly-..."
              value={tavilyKey}
              onChange={(e) => setSettings({ tavilyKey: e.target.value })}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Free 1,000 searches/month. Covers non-electronic parts.{' '}
              <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get key</a>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 'var(--space-4)', padding: 'var(--space-3)',
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          Search chain: Octopart → Tavily → AI estimate. Without keys, all prices are AI estimates.
        </div>
      </section>
    </div>
  )
}
