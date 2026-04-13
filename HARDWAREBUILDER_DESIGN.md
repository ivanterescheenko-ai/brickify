# HardwareBuilder — дизайн-система

> Эстетика: **industrial-technical** — как инженерный чертёж, но живой. Чёткие сетки, монospace акценты, точные отступы, тёмная тема как основная. Ощущение как будто смотришь в профессиональный CAD-инструмент, но сделанный с душой.

---

## Концепция и тон

**Аудитория:** люди которые хотят что-то собрать руками — от школьника до инженера. Не знают терминов, но хотят результат.

**Метафора интерфейса:** инженерный блокнот + Lego инструкция. Сетка как у миллиметровой бумаги, компоненты как детали конструктора, шаги сборки как IKEA-схемы.

**Что запомнится:** монospace числа везде где есть данные, тонкие линии сетки на фоне, анимация появления компонентов как будто AI "думает и рисует".

---

## Шрифты

```css
/* Подключить в index.html */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
```

```css
:root {
  /* Заголовки — Syne, геометрический, запоминающийся */
  --font-display: 'Syne', sans-serif;

  /* Основной текст — IBM Plex Sans, читаемый, технический */
  --font-body: 'IBM Plex Sans', sans-serif;

  /* Данные, цены, коды — IBM Plex Mono */
  --font-mono: 'IBM Plex Mono', monospace;
}
```

**Правила использования:**
- `--font-display` — только H1, логотип, пустые состояния
- `--font-body` — весь текст, лейблы, описания
- `--font-mono` — цены (`$28.00`), количества (`×4`), артикулы, код в инструкции, счётчики шагов

---

## Цветовая палитра

```css
:root {
  /* === ТЁМНАЯ ТЕМА (основная) === */

  /* Фоны */
  --bg-base: #0D0E11;        /* страница */
  --bg-surface: #13151A;     /* карточки */
  --bg-elevated: #1C1F26;    /* модалки, дропдауны */
  --bg-hover: #212530;       /* hover состояния */

  /* Сетка на фоне */
  --bg-grid: rgba(255, 255, 255, 0.03);

  /* Текст */
  --text-primary: #F0F0F0;
  --text-secondary: #8A8F9E;
  --text-tertiary: #4A4F5E;
  --text-inverse: #0D0E11;

  /* Акцент — электрический синий, как на PCB */
  --accent: #3B82F6;
  --accent-dim: rgba(59, 130, 246, 0.15);
  --accent-glow: rgba(59, 130, 246, 0.08);

  /* Семантика */
  --success: #22C55E;
  --success-dim: rgba(34, 197, 94, 0.12);
  --warning: #F59E0B;
  --warning-dim: rgba(245, 158, 11, 0.12);
  --danger: #EF4444;
  --danger-dim: rgba(239, 68, 68, 0.12);

  /* Границы */
  --border: rgba(255, 255, 255, 0.07);
  --border-medium: rgba(255, 255, 255, 0.12);
  --border-accent: rgba(59, 130, 246, 0.4);

  /* === СВЕТЛАЯ ТЕМА === */
  /* переопределить через [data-theme="light"] */
}

[data-theme="light"] {
  --bg-base: #F8F9FB;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F1F3F7;
  --bg-hover: #EAECF2;
  --bg-grid: rgba(0, 0, 0, 0.03);
  --text-primary: #111318;
  --text-secondary: #5C6070;
  --text-tertiary: #9CA3AF;
  --border: rgba(0, 0, 0, 0.07);
  --border-medium: rgba(0, 0, 0, 0.12);
}
```

---

## Типографическая шкала

```css
/* Размеры */
--text-xs:   11px;  /* подписи, теги */
--text-sm:   13px;  /* secondary текст */
--text-base: 15px;  /* основной текст */
--text-lg:   17px;  /* заголовки карточек */
--text-xl:   22px;  /* H2 */
--text-2xl:  30px;  /* H1 страницы */
--text-3xl:  42px;  /* hero заголовок */

/* Межстрочный */
--leading-tight:  1.2;
--leading-normal: 1.6;
--leading-loose:  1.8;

/* Вес */
--weight-light:   300;
--weight-regular: 400;
--weight-medium:  500;
--weight-bold:    700;  /* только display шрифт */
```

```css
/* Готовые классы */
.text-display {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: var(--leading-tight);
  color: var(--text-primary);
}

.text-heading {
  font-family: var(--font-body);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.text-mono {
  font-family: var(--font-mono);
  font-weight: 400;
  letter-spacing: 0;
}

.text-label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
```

---

## Пространство и сетка

```css
/* Базовая единица — 4px */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

/* Радиусы */
--radius-sm:  6px;
--radius-md:  10px;
--radius-lg:  14px;
--radius-xl:  20px;
--radius-full: 9999px;

/* Максимальная ширина контента */
--max-width: 1280px;
--content-width: 900px;
```

### CSS сетка для страниц

```css
/* Основной лейаут */
.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 56px 1fr;
  min-height: 100vh;
  max-width: var(--max-width);
  margin: 0 auto;
}

/* Dashboard grid — компоненты и BOM */
.dashboard-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: var(--space-4);
  align-items: start;
}

/* Карточки провайдеров */
.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
}
```

---

## Фоновая сетка (фирменный элемент)

```css
/* Добавить на body или .bg-grid-container */
.grid-background {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(var(--bg-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%);
}
```

---

## Компоненты

### Кнопки

```tsx
// Button.tsx
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const buttonStyles: Record<Variant, string> = {
  primary:   'bg-accent text-white border-transparent hover:bg-accent/90',
  secondary: 'bg-surface text-primary border-border hover:bg-hover',
  ghost:     'bg-transparent text-secondary border-transparent hover:bg-hover hover:text-primary',
  danger:    'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-6 text-base rounded-xl gap-2.5',
}
```

```css
/* CSS-версия */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 120ms ease;
  white-space: nowrap;
  user-select: none;
}

.btn:active { transform: scale(0.97); }

.btn-primary {
  background: var(--accent);
  color: white;
  height: 36px; padding: 0 16px;
  font-size: 14px; border-radius: var(--radius-md);
}
.btn-primary:hover { background: #2563EB; }

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-medium);
  height: 36px; padding: 0 14px;
  font-size: 14px; border-radius: var(--radius-md);
}
.btn-secondary:hover { background: var(--bg-hover); }

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  height: 32px; padding: 0 10px;
  font-size: 13px; border-radius: var(--radius-sm);
}
.btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
```

---

### Поле ввода (главный Input)

```css
/* Большое поле с кнопкой внутри — главный элемент на Home */
.search-container {
  position: relative;
  width: 100%;
  max-width: 720px;
}

.search-input {
  width: 100%;
  height: 56px;
  padding: 0 140px 0 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-xl);
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.search-input::placeholder { color: var(--text-tertiary); }

.search-input:focus {
  border-color: var(--border-accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  height: 40px;
  padding: 0 18px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
}

.search-btn:hover { background: #2563EB; }
```

```css
/* Маленькие инпуты — для настроек */
.input {
  height: 36px;
  padding: 0 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 150ms ease;
  width: 100%;
}
.input:focus { border-color: var(--border-accent); }
.input::placeholder { color: var(--text-tertiary); }
```

---

### Карточка

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: border-color 200ms ease;
}

.card:hover { border-color: var(--border-medium); }

/* Карточка с акцентом слева */
.card-accent {
  border-left: 2px solid var(--accent);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}

/* Карточка провайдера */
.provider-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: all 150ms ease;
  text-align: center;
}
.provider-card:hover {
  border-color: var(--border-medium);
  background: var(--bg-hover);
}
.provider-card.selected {
  border-color: var(--border-accent);
  background: var(--accent-dim);
}
```

---

### Stat card (метрики)

```css
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
}

.stat-label {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: var(--space-2);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
}

/* Цветные варианты */
.stat-card.success .stat-value { color: var(--success); }
.stat-card.warning .stat-value { color: var(--warning); }
.stat-card.accent  .stat-value { color: var(--accent); }
```

```tsx
// Пример использования
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
  <StatCard label="Компонентов" value="14" />
  <StatCard label="Бюджет" value="$280" variant="success" />
  <StatCard label="Поставщиков" value="3" variant="accent" />
</div>
```

---

### Дерево компонентов

```css
/* ComponentTree */
.tree-root {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Блок (верхний уровень) */
.tree-block {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tree-block-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: background 150ms ease;
  user-select: none;
}

.tree-block-header:hover { background: var(--bg-hover); }

.tree-block-icon {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.tree-block-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.tree-block-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Компонент (дочерний) */
.tree-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4) var(--space-2) var(--space-8);
  border-top: 1px solid var(--border);
  transition: background 120ms ease;
  cursor: pointer;
}

.tree-item:hover { background: var(--bg-hover); }

.tree-item-name {
  font-size: var(--text-sm);
  color: var(--text-primary);
  flex: 1;
}

.tree-item-spec {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.tree-item-price {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--success);
  flex-shrink: 0;
}
```

```tsx
// ComponentTree.tsx — структура
function ComponentTree({ blocks }) {
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set([0]))

  return (
    <div className="tree-root">
      {blocks.map((block, i) => (
        <div className="tree-block" key={i}>
          <div
            className="tree-block-header"
            onClick={() => toggleBlock(i)}
          >
            <div className="tree-block-icon" />
            <span className="tree-block-name">{block.name}</span>
            <span className="tree-block-count">{block.components.length}</span>
            <ChevronIcon open={openBlocks.has(i)} />
          </div>

          {openBlocks.has(i) && block.components.map((comp, j) => (
            <div className="tree-item" key={j}>
              <div>
                <div className="tree-item-name">{comp.name}</div>
                <div className="tree-item-spec">{comp.spec}</div>
              </div>
              <div className="tree-item-price">
                ${comp.estimated_price_usd}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

---

### BOM таблица

```css
.bom-table {
  width: 100%;
  border-collapse: collapse;
}

.bom-table th {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.bom-table td {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.bom-table tr:last-child td { border-bottom: none; }
.bom-table tr:hover td { background: var(--bg-hover); }

/* Ячейки */
.bom-name { font-weight: 500; }

.bom-spec {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

.bom-qty {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
}

.bom-price {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--success);
  text-align: right;
}

.bom-shop {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}
.bom-shop:hover { background: var(--accent); color: white; }

/* Итоговая строка */
.bom-total td {
  font-weight: 500;
  border-top: 1px solid var(--border-medium);
  padding-top: var(--space-3);
}
.bom-total .bom-price { font-size: var(--text-base); color: var(--text-primary); }
```

---

### Лего-инструкция

```css
.guide-steps {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Вертикальная линия */
.guide-steps::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 24px;
  bottom: 24px;
  width: 1px;
  background: var(--border-medium);
}

.guide-step {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-5) 0;
  position: relative;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: all 200ms ease;
}

/* Активный шаг */
.guide-step.active .step-number {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* Завершённый шаг */
.guide-step.done .step-number {
  background: var(--success-dim);
  border-color: var(--success);
  color: var(--success);
}

.step-content { flex: 1; padding-top: 8px; }

.step-title {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.step-body {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-loose);
  margin-bottom: var(--space-3);
}

.step-tip {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--warning-dim);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--warning);
  font-size: var(--text-sm);
  color: var(--warning);
}

.step-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.tool-tag {
  font-size: var(--text-xs);
  padding: 3px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.step-time {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
}
```

---

### Тег / бейдж

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.badge-default  { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }
.badge-accent   { background: var(--accent-dim);  color: var(--accent); }
.badge-success  { background: var(--success-dim); color: var(--success); }
.badge-warning  { background: var(--warning-dim); color: var(--warning); }
.badge-danger   { background: var(--danger-dim);  color: var(--danger); }
```

---

## Анимации

```css
/* Появление элементов */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Пульс для loading */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* Появление строк BOM — stagger через animation-delay */
.bom-table tr {
  animation: fadeUp 300ms ease both;
}
.bom-table tr:nth-child(1)  { animation-delay: 0ms; }
.bom-table tr:nth-child(2)  { animation-delay: 40ms; }
.bom-table tr:nth-child(3)  { animation-delay: 80ms; }
.bom-table tr:nth-child(4)  { animation-delay: 120ms; }
.bom-table tr:nth-child(5)  { animation-delay: 160ms; }
/* и т.д. */

/* Появление карточек дерева */
.tree-block {
  animation: fadeUp 250ms ease both;
}

/* Loading скелетон */
.skeleton {
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease infinite;
}
```

```tsx
// Скелетон во время загрузки
function SkeletonBom() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[100, 85, 90, 75, 80].map((w, i) => (
        <div key={i} style={{
          display: 'flex', gap: '12px', alignItems: 'center',
          animationDelay: `${i * 80}ms`
        }} className="skeleton-row">
          <div className="skeleton" style={{ height: '14px', width: `${w}%`, borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '14px', width: '50px', borderRadius: '4px', flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}
```

---

## Страница Home — раскладка

```
┌─────────────────────────────────────────────────────────────┐
│  [logo]                              [light/dark] [settings] │ ← topbar 56px
├─────────────────────────────────────────────────────────────┤
│                                                              │
│         Что хочешь собрать?                                  │ ← hero
│         [___________________________] [Собрать →]            │
│         Примеры: FPV дрон · Arduino термостат · 3D принтер  │
│                                                              │
├───────────────────┬─────────────────────────────────────────┤
│  Структура        │  Bill of Materials                       │
│  устройства       │                                          │
│                   │  [14 компонентов] [$280] [3 магазина]    │
│  ▼ Рама           │                                          │
│    · карбон 5"    │  ┌ Название ──── Кол ── Цена ── Где ─┐  │
│  ▼ Силовая        │  │ Рама Apex 5"   1    $28   [RDQ]   │  │
│    · мотор ×4     │  │ Мотор 2306     4    $68   [GetFPV]│  │
│    · ESC          │  │ ...                                │  │
│  ▼ Управление     │  └───────────────────────────────────┘  │
│    · FC           │                                          │
│    · приёмник     │  [Скачать PDF]  [Скопировать список]     │
│  ▼ Камера         │                                          │
│  ▼ Питание        │                                          │
├───────────────────┴─────────────────────────────────────────┤
│  Инструкция сборки                                           │
│                                                              │
│  ① Соберите раму          ② Установите моторы               │
│    Прикрутите нижнюю...      Моторы CW на позиции...        │
│                                                              │
│  ③ Припаяйте ESC          ④ Подключите FC                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Страница Settings — раскладка

```
┌─────────────────────────────────────────────────────────────┐
│  Настройки                                                   │
│                                                              │
│  Выбери AI-модель                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Claude  │ │  GPT-4o  │ │  Gemini  │ │   Grok   │       │
│  │ Anthropic│ │  OpenAI  │ │  Google  │ │   xAI    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ DeepSeek │ │  Ollama  │ │ LM Studio│ │  Кастом  │       │
│  │ (Китай)  │ │ (локально│ │ (локально│ │  URL+key │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  API ключ                                                    │
│  [sk-ant-xxxxxxxxxxxxxxxx___________________________]        │
│  Получи ключ на console.anthropic.com →                      │
│                                                              │
│  Модель                        [claude-sonnet-4-20250514 ▾]  │
│                                                              │
│  [Проверить подключение]              Статус: ● Работает     │
│                                                              │
│  ──────────────────────────────────────────────────          │
│  Поиск компонентов (опционально)                             │
│                                                              │
│  Tavily API ключ (для поиска цен)                            │
│  [tvly-xxxxxxxxxxxxxxxxxx__________________________]         │
│  Бесплатно 1000 запросов/месяц. Получить →                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Иконки

Использовать `lucide-react` — минималистичные, одного стиля:

```tsx
import {
  Cpu,          // электроника, компоненты
  Wrench,       // инструменты, сборка
  ShoppingCart, // где купить
  ChevronRight, // раскрытие дерева
  CheckCircle,  // выполненный шаг
  AlertTriangle,// предупреждение
  Copy,         // скопировать
  Download,     // скачать PDF
  Settings,     // настройки
  Zap,          // быстро/просто
  ExternalLink, // ссылка на магазин
  Search,       // поиск
  Loader2,      // загрузка (с анимацией spin)
} from 'lucide-react'

// Всегда использовать size={16} для инлайн, size={20} для кнопок
<Cpu size={16} style={{ color: 'var(--accent)' }} />
```

---

## Состояния интерфейса

### Пустое состояние (до поиска)

```tsx
// Центрировано на странице
<div style={{ textAlign: 'center', padding: '80px 20px' }}>
  <div style={{
    fontFamily: 'var(--font-display)',
    fontSize: '42px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  }}>
    Что собираем?
  </div>
  <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>
    Опиши устройство — AI разберёт на части и найдёт где купить
  </p>
  {/* SearchBar */}
  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
    {['FPV дрон', 'Arduino термостат', '3D принтер', 'Умная лампа'].map(example => (
      <button key={example} className="btn btn-ghost" style={{ fontSize: '13px' }}>
        {example}
      </button>
    ))}
  </div>
</div>
```

### Загрузка

```tsx
// Показывать пока идёт запрос
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    color: 'var(--text-secondary)', fontSize: '14px',
    animation: 'fadeIn 300ms ease'
  }}>
    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
    {phase} {/* "Анализирую устройство..." | "Ищу компоненты..." | "Пишу инструкцию..." */}
  </div>
  <SkeletonBom />
</div>

// Фазы загрузки — стриминг из SSE
const PHASES = [
  'Анализирую устройство...',
  'Разбиваю на блоки...',
  'Ищу компоненты...',
  'Считаю бюджет...',
  'Пишу инструкцию...',
]
```

### Ошибка

```tsx
<div style={{
  padding: '16px',
  background: 'var(--danger-dim)',
  border: '1px solid var(--danger)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--danger)',
  fontSize: '14px',
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
}}>
  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
  <div>
    <div style={{ fontWeight: 500, marginBottom: 4 }}>Что-то пошло не так</div>
    <div style={{ opacity: 0.8 }}>{errorMessage}</div>
    <button className="btn btn-ghost" style={{ marginTop: 8, color: 'var(--danger)' }}>
      Попробовать снова
    </button>
  </div>
</div>
```

---

## Tailwind конфиг (если используешь Tailwind)

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{tsx,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['IBM Plex Sans', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        bg: {
          base:     '#0D0E11',
          surface:  '#13151A',
          elevated: '#1C1F26',
          hover:    '#212530',
        },
        accent: {
          DEFAULT: '#3B82F6',
          dim:     'rgba(59,130,246,0.15)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          medium:  'rgba(255,255,255,0.12)',
          accent:  'rgba(59,130,246,0.4)',
        },
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '14px', xl: '20px',
      },
    },
  },
}
```

---

## Чеклист перед публикацией на GitHub

- [ ] Тёмная тема работает без мигания при загрузке (добавить `data-theme` на `<html>` до рендера)
- [ ] Все числа через `--font-mono`
- [ ] Skeleton показывается пока идёт запрос
- [ ] Анимации `fadeUp` на элементах BOM и дерева
- [ ] Мобильная версия: dashboard-grid → `grid-template-columns: 1fr`
- [ ] Кнопка "Скачать PDF" работает (использовать `window.print()` или `jsPDF`)
- [ ] Кнопка "Скопировать список" копирует BOM как Markdown таблицу
- [ ] Favicon — маленький чертёжный символ или шестерня
- [ ] `prefers-color-scheme` — автоопределение тёмной темы
- [ ] Шрифты загружаются через `font-display: swap`
