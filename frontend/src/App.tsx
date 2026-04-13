import { useState } from 'react'
import { Settings as SettingsIcon, Sun, Moon } from 'lucide-react'
import Home from './pages/Home'
import Settings from './pages/Settings'
import './App.css'

type Page = 'home' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <div className="app">
      <div className="grid-background" />

      <header className="topbar">
        <button className="topbar-logo" onClick={() => setPage('home')}>
          Brickify
        </button>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className={`btn btn-ghost ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage(page === 'settings' ? 'home' : 'settings')}
          >
            <SettingsIcon size={16} />
            Настройки
          </button>
        </div>
      </header>

      <main className="main-content">
        {page === 'home' ? <Home /> : <Settings />}
      </main>
    </div>
  )
}
