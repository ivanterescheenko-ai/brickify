interface StatCardsProps {
  totalComponents: number
  totalBudget: number
  difficulty: string
  hasTavily: boolean
}

export default function StatCards({ totalComponents, totalBudget, difficulty, hasTavily }: StatCardsProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card accent">
        <div className="stat-label">Компонентов</div>
        <div className="stat-value">{totalComponents}</div>
      </div>
      <div className="stat-card success">
        <div className="stat-label">{hasTavily ? 'Бюджет' : 'Оценка AI'}</div>
        <div className="stat-value">${totalBudget.toFixed(0)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Сложность</div>
        <div className="stat-value" style={{ fontSize: 20 }}>{difficulty}</div>
      </div>
    </div>
  )
}
