import { useState } from 'react'
import { CheckCircle, AlertTriangle, Loader2, ExternalLink, Save } from 'lucide-react'
import { useSettings } from '../store/settings'
import { testConnection } from '../api/client'

const PROVIDERS = [
  { id: 'anthropic', name: 'Claude', org: 'Anthropic', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514', keyUrl: 'https://console.anthropic.com/settings/keys', pricing: 'From $3/M tokens' },
  { id: 'openai', name: 'GPT-4.1', org: 'OpenAI', placeholder: 'sk-...', defaultModel: 'gpt-4.1', keyUrl: 'https://platform.openai.com/api-keys', pricing: 'From $2/M tokens' },
  { id: 'google', name: 'Gemini', org: 'Google', placeholder: 'AIzaSy...', defaultModel: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey', pricing: 'Free tier available' },
  { id: 'xai', name: 'Grok', org: 'xAI', placeholder: 'xai-...', defaultModel: 'grok-3', keyUrl: 'https://console.x.ai/', pricing: '$5 free credit' },
  { id: 'deepseek', name: 'DeepSeek', org: 'DeepSeek', placeholder: 'sk-...', defaultModel: 'deepseek-r1', keyUrl: 'https://platform.deepseek.com/api_keys', pricing: 'Very cheap' },
  { id: 'ollama', name: 'Ollama', org: 'Local', placeholder: '', defaultModel: 'llama4-scout', noKey: true, keyUrl: 'https://ollama.com/download', pricing: 'Free, local' },
  { id: 'lmstudio', name: 'LM Studio', org: 'Local', placeholder: '', defaultModel: 'local-model', noKey: true, keyUrl: 'https://lmstudio.ai/', pricing: 'Free, local' },
] as const

type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error'

export default function Settings() {
  const { provider, apiKey, model, baseUrl, nexarClientId, nexarClientSecret, mouserKey, tavilyKey, setSettings } = useSettings()
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
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {p.pricing}
              </div>
            </div>
          ))}
        </div>
      </section>

      {provider && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {needsKey && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <label className="text-label">API Key</label>
                {selectedProvider && 'keyUrl' in selectedProvider && (
                  <a
                    href={selectedProvider.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    Get API key <ExternalLink size={10} />
                  </a>
                )}
              </div>
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

          {/* Auto-saved indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
          }}>
            <Save size={10} />
            Settings auto-saved to browser
          </div>
        </section>
      )}

      <section style={{ marginTop: 'var(--space-10)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-6)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-6)' }}>
          Component Search (optional — JLCPCB works without keys)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Nexar (Octopart) */}
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
              Nexar (Octopart) — 50+ distributors (DigiKey, Mouser, Arrow, Farnell)
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                className="input"
                type="password"
                placeholder="Client ID"
                value={nexarClientId}
                onChange={(e) => setSettings({ nexarClientId: e.target.value })}
              />
              <input
                className="input"
                type="password"
                placeholder="Client Secret"
                value={nexarClientSecret}
                onChange={(e) => setSettings({ nexarClientSecret: e.target.value })}
              />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Free 100 parts/month. Best for electronic components.{' '}
              <a href="https://portal.nexar.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get credentials</a>
            </div>
          </div>

          {/* Mouser */}
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
              Mouser API Key — direct Mouser search
            </label>
            <input
              className="input"
              type="password"
              placeholder="mouser-api-key..."
              value={mouserKey}
              onChange={(e) => setSettings({ mouserKey: e.target.value })}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Free registration.{' '}
              <a href="https://www.mouser.com/api-hub/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get key</a>
            </div>
          </div>

          {/* Tavily */}
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
              Tavily API Key — web search (frames, motors, batteries)
            </label>
            <input
              className="input"
              type="password"
              placeholder="tvly-..."
              value={tavilyKey}
              onChange={(e) => setSettings({ tavilyKey: e.target.value })}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Free 1,000 searches/month.{' '}
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
          Search chain: Nexar → Mouser → JLCPCB (free) → Tavily → Amazon → AliExpress → AI estimate
        </div>
      </section>
    </div>
  )
}
