import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowRight, Award, BarChart3,
  ChevronDown, Code2, Flame, Keyboard,
  LogIn, LogOut, RotateCcw, Target, Trophy, Type,
} from 'lucide-react'
import { api, type Leaderboard, type Progress, type Session, type User } from './api'
import { achievementInfo, difficultyInfo, makeExercise, modeName, modes, prettyChar, rarityNames, type Difficulty, type Language, type Mode } from './data'
import { createRun, levelForXp, metrics, multiplier, press, skip, type Run } from './engine'
import { fingerForChar, keyForChar, keyboardRows, needsShift } from './keyboard'
import { demoLeaderboardRows } from './leaderboardDemo'
import { modeUnlockLevel, unlockedDifficulty, unlocksAtLevel } from './progression'

type Page = 'overview' | 'practice' | 'progress' | 'leaderboard' | 'awards'
type GuestSession = Session & { elapsed_ms: number; correct_chars: number; mistake_map: Record<string, number> }
type GuestData = { xp: number; sessions: GuestSession[]; achievements: { key: string; unlocked_at: string }[] }
type Result = { xp: number; unlocked: string[]; stored: boolean; levelBefore?: number; error?: string }

const guestKey = 'hero-typing-guest-v1'
const pageKey = 'keyflow-last-page-v1'
const emptyGuest: GuestData = { xp: 0, sessions: [], achievements: [] }

function loadGuest(): GuestData {
  try {
    const raw = localStorage.getItem(guestKey)
    if (raw) {
      const value = JSON.parse(raw) as GuestData
      if (Array.isArray(value.sessions) && Array.isArray(value.achievements)) {
        const existing = new Set(value.achievements.map((achievement) => achievement.key))
        const earned = earnedAchievementKeys(value.sessions)
        return { ...value, achievements: [...value.achievements, ...earned.filter((key) => !existing.has(key)).map((key) => ({ key, unlocked_at: new Date().toISOString() }))] }
      }
    }
  } catch {}
  return emptyGuest
}

function guestProgress(guest: GuestData): Progress {
  const sessions = guest.sessions
  const mistakes: Record<string, number> = {}
  sessions.forEach((session) => Object.entries(session.mistake_map).forEach(([char, count]) => {
    mistakes[char] = (mistakes[char] || 0) + count
  }))
  return {
    summary: {
      sessions: sessions.length,
      total_ms: sessions.reduce((sum, session) => sum + session.elapsed_ms, 0),
      total_chars: sessions.reduce((sum, session) => sum + session.correct_chars, 0),
      best_wpm: Math.max(0, ...sessions.map((session) => session.wpm)),
      avg_accuracy: sessions.length ? sessions.reduce((sum, session) => sum + session.accuracy, 0) / sessions.length : 0,
    },
    sessions,
    mistakes: Object.fromEntries(Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8)),
    achievements: guest.achievements,
  }
}

function earnedAchievementKeys(sessions: GuestSession[]): string[] {
  if (!sessions.length) return []
  const keys: string[] = []
  const total = sessions.reduce((sum, session) => sum + session.correct_chars, 0)
  const qualified = sessions.filter((session) => session.correct_chars >= 40 && session.elapsed_ms >= 15_000)
  const days = new Set(qualified.map((session) => session.created_at.slice(0, 10)))
  if (qualified.length >= 3) keys.push('first')
  if (qualified.length >= 12) keys.push('five')
  if (sessions.some((session) => session.errors === 0 && session.correct_chars >= 120)) keys.push('clean')
  if (total >= 5_000) keys.push('thousand')
  if (days.size >= 7) keys.push('regular')
  if (sessions.some((session) => session.correct_chars >= 120 && session.correct_chars * 60_000 / session.elapsed_ms >= 260)) keys.push('speed')
  if (sessions.some((session) => session.errors === 0 && session.correct_chars >= 240)) keys.push('streak')
  if (['ru', 'en'].every((language) => qualified.filter((session) => session.language === language && session.correct_chars >= 100).length >= 3)) keys.push('polyglot')
  if (modes.every((mode) => qualified.filter((session) => session.mode === mode.id && session.difficulty >= 3).length >= 3)) keys.push('all_modes')
  if (sessions.some((session) => session.correct_chars >= 300 && session.correct_chars / (session.correct_chars + session.errors) >= .995)) keys.push('precision')
  if (sessions.some((session) => session.correct_chars >= 200 && session.correct_chars * 60_000 / session.elapsed_ms >= 400)) keys.push('speed300')
  if (total >= 50_000) keys.push('ten_thousand')
  if (days.size >= 21) keys.push('week')
  if (sessions.filter((session) => session.difficulty === 8 && session.errors === 0 && session.correct_chars >= 350).length >= 2) keys.push('expert')
  return keys
}

function saveGuestRun(guest: GuestData, run: Run): { next: GuestData; result: Result } {
  const measure = metrics(run, run.finishedAt || Date.now())
  const xpEarned = Math.max(10, Math.round(run.correctChars * (measure.accuracy / 100) / 3 + run.points / 40))
    + Math.round(run.xpBonusChars * (measure.accuracy / 100) / 3 + run.xpBonusPoints / 40)
  const session: GuestSession = {
    id: Date.now(), mode: run.mode, language: run.language, difficulty: run.difficulty,
    wpm: measure.wpm, cpm: measure.cpm, accuracy: measure.accuracy, errors: run.errors,
    points: run.points, xp_earned: xpEarned, created_at: new Date().toISOString(),
    elapsed_ms: measure.elapsedMs, correct_chars: run.correctChars, mistake_map: run.mistakes,
  }
  const sessions = [session, ...guest.sessions].slice(0, 2000)
  const candidates = earnedAchievementKeys(sessions)
  const existing = new Set(guest.achievements.map((achievement) => achievement.key))
  const unlocked = candidates.filter((key) => !existing.has(key))
  const next = {
    xp: guest.xp + xpEarned, sessions,
    achievements: [...guest.achievements, ...unlocked.map((key) => ({ key, unlocked_at: new Date().toISOString() }))],
  }
  try { localStorage.setItem(guestKey, JSON.stringify(next)) } catch {}
  return { next, result: { xp: xpEarned, unlocked, stored: true, levelBefore: levelForXp(guest.xp) } }
}

function Avatar({ number, size = 'normal' }: { number: number; size?: 'normal' | 'small' }) {
  return <span className={`avatar-frame ${size === 'small' ? 'avatar-frame-small' : ''}`}><img className="user-avatar" src={`/avatars/forest-${String(number).padStart(2, '0')}.png`} alt="" /></span>
}

function StatCard({ label, value, suffix, icon: Icon, detail }: { label: string; value: string | number; suffix?: string; icon?: typeof Activity; detail?: string }) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span>{Icon && <Icon size={17} strokeWidth={1.7} />}</div><div className="stat-value">{value}<small>{suffix}</small></div>{detail && <p>{detail}</p>}</div>
}

function Navigation({ page, setPage, onAuth, onLogout, user, avatar, xp }: { page: Page; setPage: (page: Page) => void; onAuth: () => void; onLogout: () => void; user: User | null; avatar: number; xp: number }) {
  const links: { id: Page; label: string; icon: typeof Keyboard }[] = [
    { id: 'overview', label: 'Главная', icon: Target },
    { id: 'practice', label: 'Тренировка', icon: Keyboard },
    { id: 'progress', label: 'Прогресс', icon: BarChart3 },
    { id: 'leaderboard', label: 'Рейтинг', icon: Trophy },
    { id: 'awards', label: 'Достижения', icon: Award },
  ]
  return <aside className="sidebar">
    <div className="brand"><img src="/keyflow-sidebar-logo.png" className="brand-logo" alt="Keyflow" /><img src="/keyflow-sidebar-mark.png" className="brand-mark-compact" alt="" /></div>
    <nav aria-label="Основная навигация" className="nav-list">
      {links.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`nav-item nav-pixel nav-pixel-${id} ${page === id ? 'active' : ''}`} aria-label={label} onClick={() => setPage(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="level-panel"><div className="level-panel-title"><span>Уровень {levelForXp(xp)}</span><strong>{xp} XP</strong></div><div className="progress-track"><span style={{ width: `${(xp % 250) / 2.5}%` }} /></div><small>{xp % 250} / 250 XP</small></div>
      <div className="profile-button"><Avatar number={avatar} /><span><strong>{user ? user.name : 'Гость'}</strong><small>{user ? user.email : 'Войти в аккаунт'}</small></span>{user ? <button type="button" className="profile-logout" onClick={onLogout} aria-label="Выйти из аккаунта" title="Выйти"><img src="/profile-logout.png" alt="" /></button> : <button type="button" className="profile-login" onClick={onAuth} aria-label="Войти в аккаунт" title="Войти"><LogIn size={23} /></button>}</div>
    </div>
  </aside>
}

function KeyboardGuide({ language, nextChar, pressedKey }: { language: Language; nextChar: string; pressedKey: { character: string; correct: boolean } | null }) {
  const active = keyForChar(nextChar, language)
  const pressed = pressedKey ? keyForChar(pressedKey.character, language) : null
  const isUppercaseLetter = (character: string) => character !== character.toLowerCase() && character === character.toUpperCase() && /\p{L}/u.test(character)
  const targetUsesCaps = isUppercaseLetter(nextChar)
  const pressedUsesCaps = pressedKey ? isUppercaseLetter(pressedKey.character) : false
  const missedCaps = Boolean(pressedKey && !pressedKey.correct && targetUsesCaps && pressed === active && !pressedUsesCaps)
  const pressedShift = pressedKey ? needsShift(pressedKey.character, language) && !pressedUsesCaps : false
  const shiftActive = needsShift(nextChar, language) && !targetUsesCaps
  const rows = keyboardRows(language)
  const keycap = (key: string, rowIndex: number) => <span key={`${rowIndex}-${key}`} className={`keycap ${key === active ? 'keycap-active' : ''} ${key === pressed ? (pressedKey?.correct ? 'keycap-hit' : 'keycap-wrong') : ''}`}>{key.toUpperCase()}</span>
  return <div className="keyboard-guide">
    <div className="keyboard-scroll"><div className="keyboard-rows" role="img" aria-label={`Подсказка клавиатуры для символа ${prettyChar(nextChar)}`}>
      <div className="keyboard-row">{rows[0].map((key) => keycap(key, 0))}<span className="keycap keycap-backspace keycap-modifier">⌫</span></div>
      <div className="keyboard-row"><span className="keycap keycap-tab keycap-modifier">Tab</span>{rows[1].map((key) => keycap(key, 1))}</div>
      <div className="keyboard-row"><span className={`keycap keycap-caps keycap-modifier ${targetUsesCaps ? 'keycap-shift-active' : ''} ${missedCaps || pressedUsesCaps && !pressedKey?.correct ? 'keycap-wrong' : pressedUsesCaps ? 'keycap-hit' : ''}`}>Caps</span>{rows[2].map((key) => keycap(key, 2))}<span className={`keycap keycap-enter keycap-modifier ${active === 'Enter' ? 'keycap-active' : ''}`}>Enter</span></div>
      <div className="keyboard-row"><span className={`keycap keycap-shift keycap-modifier ${shiftActive ? 'keycap-active keycap-shift-active' : ''} ${pressedShift ? (pressedKey?.correct ? 'keycap-hit' : 'keycap-wrong') : ''}`}>Shift</span>{rows[3].map((key) => keycap(key, 3))}<span className={`keycap keycap-shift keycap-modifier ${shiftActive ? 'keycap-active keycap-shift-active' : ''} ${pressedShift ? (pressedKey?.correct ? 'keycap-hit' : 'keycap-wrong') : ''}`}>Shift</span></div>
      <div className="keyboard-row keyboard-row-bottom"><span className="keycap keycap-bottom-key keycap-modifier">Ctrl</span><span className="keycap keycap-bottom-key keycap-modifier">Win</span><span className="keycap keycap-bottom-key keycap-modifier">Alt</span><span className={`keycap keycap-space ${active === 'Space' ? 'keycap-active' : ''} ${pressed === 'Space' ? (pressedKey?.correct ? 'keycap-hit' : 'keycap-wrong') : ''}`}>ПРОБЕЛ</span><span className="keycap keycap-bottom-key keycap-modifier">Alt</span><span className="keycap keycap-bottom-key keycap-modifier">Fn</span><span className="keycap keycap-bottom-key keycap-modifier">Ctrl</span></div>
    </div></div>
  </div>
}

function DifficultyPicker({ value, level, onSelect }: { value: Difficulty; level: number; onSelect: (difficulty: Difficulty) => void }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return
    optionRefs.current[value - 1]?.focus()
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, value])

  return <div className="difficulty-picker" ref={containerRef}>
    <button ref={triggerRef} type="button" className="difficulty-trigger" aria-label="Сложность" aria-haspopup="listbox" aria-expanded={open} aria-controls="difficulty-options" onClick={() => setOpen(!open)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
    }}><span>{value}. {difficultyInfo[value - 1].name}</span><ChevronDown size={15} aria-hidden="true" /></button>
    {open && <div id="difficulty-options" className="difficulty-options" role="listbox" aria-label="Сложность" onKeyDown={(event) => {
      const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement)
      const lastIndex = unlockedDifficulty(level) - 1
      const nextIndex = event.key === 'ArrowDown' ? (currentIndex + 1) % (lastIndex + 1) : event.key === 'ArrowUp' ? (currentIndex + lastIndex) % (lastIndex + 1) : event.key === 'Home' ? 0 : event.key === 'End' ? lastIndex : -1
      if (nextIndex >= 0) { event.preventDefault(); optionRefs.current[nextIndex]?.focus() }
    }}>
      {difficultyInfo.map((item, index) => <button key={item.level} ref={(element) => { optionRefs.current[index] = element }} type="button" role="option" aria-selected={item.level === value} disabled={item.level > level} className={item.level === value ? 'selected' : ''} onClick={() => {
        setOpen(false)
        if (item.level !== value) onSelect(item.level)
        triggerRef.current?.focus()
      }}><span>{item.level}. {item.name}</span><small>{item.level > level ? `Откроется на уровне ${item.level}` : item.detail}</small></button>)}
    </div>}
  </div>
}

function AuthModal({ onClose, onSignedIn, user, onLogout }: { onClose: () => void; onSignedIn: (user: User) => void; user: User | null; onLogout: () => void }) {
  const [register, setRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loginToast, setLoginToast] = useState(false)
  const [loginToastLeaving, setLoginToastLeaving] = useState(false)
  const [toastSequence, setToastSequence] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loginToast) return
    const leaveTimer = window.setTimeout(() => setLoginToastLeaving(true), 1500)
    const removeTimer = window.setTimeout(() => { setLoginToast(false); setLoginToastLeaving(false) }, 1800)
    return () => { window.clearTimeout(leaveTimer); window.clearTimeout(removeTimer) }
  }, [loginToast, toastSequence])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const signedIn = register ? await api.register(name, email, password) : await api.login(email, password)
      onSignedIn(signedIn)
      onClose()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось войти'
      if (!register && message === 'Неверный email или пароль') {
        setError('')
        setLoginToastLeaving(false)
        setLoginToast(true)
        setToastSequence((sequence) => sequence + 1)
      } else setError(message)
    }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    {loginToast && <div className={`auth-toast${loginToastLeaving ? ' auth-toast-leaving' : ''}`} role="alert" aria-live="assertive"><span className="auth-toast-mark">!</span>Неверный email или пароль</div>}
    <div className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-art" aria-hidden="true" />
      <section className="auth-content">
        <button type="button" className="icon-button modal-close auth-close" onClick={onClose} aria-label="Закрыть"><img src="/auth/close.png" alt="" /></button>
        {user ? <><h2 id="auth-title">Профиль: {user.name}</h2><p className="muted">Результаты доступны после входа на другом устройстве.</p><div className="account-summary"><span>Всего опыта</span><strong>{user.xp} XP</strong></div><button type="button" className="button button-secondary full auth-submit" onClick={() => { onLogout(); onClose() }}><LogOut size={17} /> Выйти из аккаунта</button></> : <><h2 id="auth-title">{register ? 'Создать аккаунт' : 'Вход в Keyflow'}</h2><p className="muted">{register ? 'Для сохранения результатов и участия в рейтинге.' : 'Введите email и пароль.'}</p><form onSubmit={submit} className="auth-form">{register && <label>Имя<input required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к тебе обращаться" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Пароль<input required type="password" minLength={register ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={register ? 'Минимум 8 символов' : 'Ваш пароль'} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="button button-primary full auth-submit" disabled={busy}>{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}<ArrowRight size={17} /></button></form><button type="button" className="text-button auth-switch" onClick={() => { setRegister(!register); setError('') }}>{register ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать аккаунт'}</button></>}
      </section>
    </div>
  </div>
}

type ChartMetric = 'speed' | 'accuracy'
type ChartPeriod = 'day' | 'week'

function progressChartData(sessions: Session[], metric: ChartMetric, period: ChartPeriod) {
  const groups = new Map<number, { total: number; count: number }>()
  for (const session of sessions) {
    const date = new Date(session.created_at)
    date.setHours(0, 0, 0, 0)
    if (period === 'week') date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const key = date.getTime()
    const group = groups.get(key) ?? { total: 0, count: 0 }
    group.total += metric === 'speed' ? session.wpm : session.accuracy
    group.count += 1
    groups.set(key, group)
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (period === 'week') today.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const length = period === 'day' ? 7 : 8
  const firstDate = new Date(today)
  firstDate.setDate(firstDate.getDate() - (length - 1) * (period === 'day' ? 1 : 7))
  return Array.from({ length }, (_, index) => {
    const date = new Date(firstDate)
    date.setDate(firstDate.getDate() + index * (period === 'day' ? 1 : 7))
    const key = date.getTime()
    const group = groups.get(key)
    const dateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
    return {
      label: period === 'day' ? dateLabel : `нед. ${dateLabel}`,
      value: group ? group.total / group.count : null,
    }
  })
}

function ProgressChart({ sessions }: { sessions: Session[] }) {
  const [metric, setMetric] = useState<ChartMetric>('speed')
  const [period, setPeriod] = useState<ChartPeriod>('day')
  const data = progressChartData(sessions, metric, period)
  const values = data.flatMap((item) => item.value === null ? [] : [item.value])
  const maximum = metric === 'accuracy' ? 100 : Math.max(20, Math.ceil(Math.max(...values, 0) / 20) * 20)
  const segments: string[][] = []
  data.forEach((item, index) => {
    if (item.value === null) return
    const point = `${index / Math.max(1, data.length - 1) * 100},${90 - item.value / maximum * 74}`
    if (index === 0 || data[index - 1].value === null) segments.push([])
    segments[segments.length - 1].push(point)
  })
  const ticks = [maximum, maximum * .75, maximum * .5, maximum * .25]
  const chartPoints = data.flatMap((item, index) => item.value === null ? [] : [{
    key: `${item.label}-${index}`,
    left: `${index / Math.max(1, data.length - 1) * 100}%`,
    top: `${90 - item.value / maximum * 74}%`,
  }])

  return <div className="panel chart-panel">
    <div className="chart-heading">
      <div className="section-heading"><h2>{metric === 'speed' ? 'Скорость печати' : 'Точность печати'}</h2><span className="chart-unit">СРЕДНЕЕ ЗА ПЕРИОД</span></div>
      <div className="chart-controls">
        <div className="segmented" aria-label="Показатель графика">
          <button type="button" aria-pressed={metric === 'speed'} className={metric === 'speed' ? 'selected' : ''} onClick={() => setMetric('speed')}>Скорость</button>
          <button type="button" aria-pressed={metric === 'accuracy'} className={metric === 'accuracy' ? 'selected' : ''} onClick={() => setMetric('accuracy')}>Точность</button>
        </div>
        <div className="segmented" aria-label="Период графика">
          <button type="button" aria-pressed={period === 'day'} className={period === 'day' ? 'selected' : ''} onClick={() => setPeriod('day')}>Дни</button>
          <button type="button" aria-pressed={period === 'week'} className={period === 'week' ? 'selected' : ''} onClick={() => setPeriod('week')}>Недели</button>
        </div>
      </div>
    </div>
    {values.length ? <><div className="chart">
      <div className="chart-grid">{ticks.map((tick) => <span key={tick}>{Math.round(tick)}{metric === 'accuracy' ? '%' : ''}</span>)}</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={metric === 'speed' ? 'График средней скорости по датам' : 'График средней точности по датам'}>
        {segments.map((segment, index) => <polyline key={index} points={segment.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      {chartPoints.map((point) => <span key={point.key} className="chart-point" style={{ left: point.left, top: point.top }} />)}
    </div><div className="chart-labels">{data.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></>
      : <div className="empty-chart"><BarChart3 size={32} /><strong>Нет данных</strong><p>{sessions.length ? 'За выбранный период занятий не было.' : 'График появится после первой тренировки.'}</p></div>}
  </div>
}

export default function App() {
  const [page, setPage] = useState<Page>(() => {
    try {
      const saved = localStorage.getItem(pageKey) as Page | null
      return saved && ['overview', 'practice', 'progress', 'leaderboard', 'awards'].includes(saved) ? saved : 'overview'
    } catch { return 'overview' }
  })
  const [mode, setMode] = useState<Mode>('words')
  const [language, setLanguage] = useState<Language>('ru')
  const [displayMode, setDisplayMode] = useState<'character' | 'word'>('character')
  const [difficulty, setDifficulty] = useState<Difficulty>(1)
  const [run, setRun] = useState<Run>(() => { const task = makeExercise('words', 'ru', 1); return createRun('words', 'ru', 1, task.text, task.label) })
  const [now, setNow] = useState(Date.now())
  const [user, setUser] = useState<User | null>(null)
  const [guest, setGuest] = useState<GuestData>(loadGuest)
  const [serverProgress, setServerProgress] = useState<Progress | null>(null)
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [boardMetric, setBoardMetric] = useState<Leaderboard['metric']>('wpm')
  const [boardPeriod, setBoardPeriod] = useState<Leaderboard['period']>('week')
  const [result, setResult] = useState<Result | null>(null)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [feedback, setFeedback] = useState<{ id: number; kind: 'correct' | 'error' | 'combo' } | null>(null)
  const [pressedKey, setPressedKey] = useState<{ id: number; character: string; correct: boolean } | null>(null)
  const [bonusPosition, setBonusPosition] = useState<{ left: string; top: string } | null>(null)
  const [comboPosition, setComboPosition] = useState<{ left: string; top: string } | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [guestAvatar] = useState(() => {
    const saved = Number(localStorage.getItem('real-guest-avatar'))
    if (saved >= 1 && saved <= 10) return saved
    const random = Math.floor(Math.random() * 10) + 1
    localStorage.setItem('real-guest-avatar', String(random))
    return random
  })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const runRef = useRef(run)
  const textRef = useRef<HTMLDivElement>(null)
  const effectsStageRef = useRef<HTMLDivElement>(null)
  const savedRuns = useRef(new Set<string>())
  const audioRef = useRef<AudioContext | null>(null)
  const effectCounter = useRef(0)
  const computedProgress = user ? (serverProgress ?? guestProgress(emptyGuest)) : guestProgress(guest)
  const xp = user?.xp ?? guest.xp
  const playerLevel = levelForXp(xp)
  const avatar = user?.avatar ?? guestAvatar
  const measure = metrics(run, now)
  const activeBonus = run.bonusUntil !== null && run.bonusUntil > now && !run.finishedAt
  const activeBonusType = activeBonus ? run.bonusType : null
  const levelBefore = result?.levelBefore ?? playerLevel
  const levelGained = playerLevel > levelBefore
  const newlyUnlocked = Array.from({ length: Math.max(0, playerLevel - levelBefore) }, (_, index) => unlocksAtLevel(levelBefore + index + 1)).flat()
  const nextChar = run.text[run.index] || ' '
  let activeWordStart = run.index
  let activeWordEnd = run.index
  const hasActiveWord = run.index < run.text.length && !/\s/.test(run.text[run.index])
  if (displayMode === 'word' && hasActiveWord) {
    while (activeWordStart > 0 && !/\s/.test(run.text[activeWordStart - 1])) activeWordStart -= 1
    while (activeWordEnd < run.text.length && !/\s/.test(run.text[activeWordEnd])) activeWordEnd += 1
  }

  function randomEffectPosition(width: number, height: number) {
    const stage = effectsStageRef.current
    if (!stage) return null
    const margin = 8
    const effectWidth = Math.min(width, stage.clientWidth - margin * 2)
    const effectHeight = Math.min(height, stage.clientHeight - margin * 2)
    if (effectWidth < 1 || effectHeight < 1) return null
    const safeWidth = stage.clientWidth - effectWidth - margin * 2
    const safeHeight = stage.clientHeight - effectHeight - margin * 2
    return {
      left: `${margin + Math.random() * safeWidth}px`,
      top: `${margin + Math.random() * safeHeight}px`,
    }
  }

  useEffect(() => {
    const comboActive = !run.finishedAt && run.combo > 0
    let nextComboPosition = comboActive ? randomEffectPosition(108, 120) : null
    let nextBonusPosition = activeBonus ? randomEffectPosition(112, 48) : null
    const stage = effectsStageRef.current
    if (comboActive && activeBonus && stage) {
      const margin = 8
      if (stage.clientWidth >= 244) {
        const comboOnLeft = Math.random() < 0.5
        const comboTop = margin + Math.random() * Math.max(0, stage.clientHeight - 120 - margin * 2)
        const bonusTop = margin + Math.random() * Math.max(0, stage.clientHeight - 48 - margin * 2)
        nextComboPosition = { left: `${comboOnLeft ? margin : stage.clientWidth - 108 - margin}px`, top: `${comboTop}px` }
        nextBonusPosition = { left: `${comboOnLeft ? stage.clientWidth - 112 - margin : margin}px`, top: `${bonusTop}px` }
      } else {
        const comboTop = margin + Math.random() * Math.max(0, stage.clientHeight - 120 - 48 - margin * 3)
        nextComboPosition = { left: `${margin}px`, top: `${comboTop}px` }
        nextBonusPosition = { left: `${margin}px`, top: `${comboTop + 120 + margin}px` }
      }
    }
    setComboPosition(nextComboPosition)
    setBonusPosition(nextBonusPosition)
  }, [activeBonusType, run.bonusUntil, run.id, run.combo > 0, multiplier(run.combo), run.finishedAt])

  useEffect(() => {
    if (modeUnlockLevel[mode] <= playerLevel && difficulty <= unlockedDifficulty(playerLevel)) return
    const nextMode = modeUnlockLevel[mode] <= playerLevel ? mode : 'words'
    const nextDifficulty = Math.min(difficulty, unlockedDifficulty(playerLevel)) as Difficulty
    const task = makeExercise(nextMode, language, nextDifficulty)
    const nextRun = createRun(nextMode, language, nextDifficulty, task.text, task.label)
    runRef.current = nextRun
    setMode(nextMode); setDifficulty(nextDifficulty); setRun(nextRun)
    setResult(null); setResultDismissed(false); setFeedback(null); setPressedKey(null)
  }, [playerLevel, mode, difficulty, language])

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  useEffect(() => {
    try { localStorage.setItem(pageKey, page) } catch {}
  }, [page])

  useEffect(() => {
    if (result?.unlocked.length) [660, 880, 1100].forEach((note, index) => playTone(note, 0.14, index * 0.085))
  }, [result])

  useEffect(() => {
    api.me().then(({ user: current }) => {
      setUser(current)
      if (current) api.progress().then(setServerProgress).catch(() => {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!run.startedAt || run.finishedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [run.startedAt, run.finishedAt])

  useEffect(() => {
    if (page !== 'practice' || run.startedAt || run.finishedAt) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [page, run.id, run.startedAt, run.finishedAt])

  useEffect(() => {
    const container = textRef.current
    const active = container?.querySelector<HTMLElement>('.current')
    if (!container) return
    if (run.index === 0) { container.scrollTop = 0; return }
    if (!active) return
    const textBounds = container.getBoundingClientRect()
    const characterBounds = active.getBoundingClientRect()
    if (characterBounds.bottom > textBounds.bottom - 12) container.scrollTop += characterBounds.bottom - textBounds.bottom + 12
    else if (characterBounds.top < textBounds.top + 12) container.scrollTop -= textBounds.top + 12 - characterBounds.top
  }, [run.id, run.index])

  useEffect(() => {
    if (page !== 'leaderboard') return
    api.leaderboard(boardMetric, boardPeriod).then(setLeaderboard).catch(() => setLeaderboard(null))
  }, [page, boardMetric, boardPeriod, user?.id])

  useEffect(() => {
    if (!run.finishedAt || savedRuns.current.has(run.id)) return
    savedRuns.current.add(run.id)
    if (user) {
      api.save({ mode: run.mode, language: run.language, difficulty: run.difficulty,
        elapsed_ms: metrics(run, run.finishedAt).elapsedMs, correct_chars: run.correctChars,
        errors: run.errors, points: run.points, xp_bonus_chars: run.xpBonusChars,
        xp_bonus_points: run.xpBonusPoints, mistake_map: run.mistakes })
        .then((saved) => { setUser(saved.user); setResult({ xp: saved.xp_earned, unlocked: saved.unlocked, stored: true, levelBefore: levelForXp(user.xp) }); api.progress().then(setServerProgress).catch(() => {}) })
        .catch(() => setResult({ xp: 0, unlocked: [], stored: false, error: 'Сервер недоступен. Результат не сохранён в аккаунте.' }))
    } else {
      const saved = saveGuestRun(guest, run)
      setGuest(saved.next)
      setResult(saved.result)
    }
  }, [run, user, guest])

  function playTone(frequency: number, duration: number, delay = 0) {
    try {
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.value = frequency
      const start = context.currentTime + delay
      gain.gain.setValueAtTime(0.04, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + duration)
    } catch {}
  }

  function updateRunAfterInput(currentRun: Run, next: Run, character: string) {
    if (next === currentRun) return
    runRef.current = next
    effectCounter.current += 1
    const pressId = effectCounter.current
    setPressedKey({ id: pressId, character, correct: next.lastHit === 'correct' })
    window.setTimeout(() => setPressedKey((current) => current?.id === pressId ? null : current), 400)
    if (next.lastHit === 'correct') playTone(330 + next.combo % 5 * 28, 0.035)
    if (next.lastHit === 'error') playTone(170, 0.11)
    if (next.lastHit === 'correct' && next.combo > 0 && next.combo % 10 === 0) playTone(560 + Math.min(next.combo, 100) * 2, 0.09)
    if (next.finishedAt && !currentRun.finishedAt) [540, 720, 960].forEach((note, index) => playTone(note, 0.16, index * 0.09))
    {
      setFeedback({ id: effectCounter.current, kind: next.lastHit === 'error' ? 'error' : next.combo > 0 && next.combo % 25 === 0 ? 'combo' : 'correct' })
    }
    setRun(next)
    setNow(Date.now())
  }

  function handleInput(raw: string) {
    const currentRun = runRef.current
    if (!raw || currentRun.finishedAt) return
    const chars = Array.from(raw)
    if (chars.length > 3) return
    let next = currentRun
    chars.forEach((character) => { next = press(next, character, Date.now()) })
    updateRunAfterInput(currentRun, next, chars[chars.length - 1])
  }

  function skipCurrentChar() {
    const currentRun = runRef.current
    updateRunAfterInput(currentRun, skip(currentRun, Date.now()), '')
    inputRef.current?.focus()
  }

  function begin(nextMode = mode, nextLanguage = language, nextDifficulty = difficulty) {
    const availableMode = modeUnlockLevel[nextMode] <= playerLevel ? nextMode : 'words'
    const availableDifficulty = Math.min(nextDifficulty, unlockedDifficulty(playerLevel)) as Difficulty
    const resolvedLanguage = availableMode === 'code' ? 'en' : nextLanguage
    setMode(availableMode); setLanguage(resolvedLanguage); setDifficulty(availableDifficulty)
    const task = makeExercise(availableMode, resolvedLanguage, availableDifficulty)
    const nextRun = createRun(availableMode, resolvedLanguage, availableDifficulty, task.text, task.label)
    runRef.current = nextRun
    setRun(nextRun)
    setResult(null); setResultDismissed(false); setFeedback(null); setPressedKey(null); setNow(Date.now()); setPage('practice')
    window.setTimeout(() => inputRef.current?.focus(), 40)
  }

  async function logout() {
    await api.logout().catch(() => {})
    setUser(null); setServerProgress(null)
    setLeaderboard(null)
  }

  const recent = computedProgress?.sessions || []
  const earned = new Set(computedProgress?.achievements.map((achievement) => achievement.key) || [])
  const liveBoard = leaderboard?.metric === boardMetric && leaderboard.period === boardPeriod && leaderboard.rows.length > 0 ? leaderboard : null
  const bots = demoLeaderboardRows(boardMetric, boardPeriod)
  const boardRows = [...(liveBoard?.rows ?? []), ...bots].sort((a, b) => b.value - a.value)

  return <div className={`app-shell page-${page}`}>
    <Navigation page={page} setPage={setPage} onAuth={() => setAuthOpen(true)} onLogout={() => { void logout() }} user={user} avatar={avatar} xp={xp} />
    <div className="main-area">
      {page === 'practice' && feedback && <div key={feedback.id} className={`key-feedback key-feedback-${feedback.kind}`} aria-hidden="true" />}
      <main className="content">
        <div className="mobile-brand"><img src="/keyflow-sidebar-logo.png" alt="Keyflow" /></div>
        {page === 'overview' && <>
          <div className="page-intro overview-hero"><div className="overview-hero-copy"><h1>Тренировка печати</h1><p>Слова, предложения, код и символы.</p><div className="hero-actions"><button type="button" className="button button-primary" onClick={() => begin('words', 'ru', 1)}>Начать</button><button type="button" className="button button-secondary" onClick={() => setPage('progress')}>Прогресс</button></div></div></div>
          <div className="section-heading overview-heading"><h2>Статистика</h2><button type="button" className="link-button" onClick={() => setPage('progress')}>Подробнее <ArrowRight size={17} /></button></div>
          <div className="stats-grid overview-stats"><StatCard label="ТРЕНИРОВКИ" value={computedProgress.summary.sessions} /><StatCard label="ЛУЧШАЯ СКОРОСТЬ" value={Math.round(computedProgress.summary.best_wpm)} suffix="WPM" /><StatCard label="ТОЧНОСТЬ" value={Math.round(computedProgress.summary.avg_accuracy)} suffix="%" /><StatCard label="ОПЫТ" value={xp} suffix="XP" /></div>
          <div className="section-heading mode-heading"><h2>Режимы</h2></div>
          <div className="mode-grid overview-modes">{modes.map((item) => { const locked = playerLevel < modeUnlockLevel[item.id]; return <button type="button" className={`mode-card ${locked ? "mode-card-locked" : ""}`} key={item.id} disabled={locked} title={locked ? `Откроется на уровне ${modeUnlockLevel[item.id]}` : undefined} onClick={() => begin(item.id, item.id === 'code' ? 'en' : language, difficulty)}><div className="mode-icon"><img src={`/overview/mode-${item.id}.png`} alt="" /></div><div><h3>{item.title}</h3><p>{locked ? <><img className="unlock-lock" src="/progress/lock.png" alt="" /> Нужен уровень {modeUnlockLevel[item.id]}</> : item.subtitle}</p></div><ArrowRight className="mode-arrow" size={20} /></button>})}</div>
        </>}

        {page === 'practice' && <section className="practice-page">
          <div className="page-heading"><h1>Тренировка</h1><button type="button" className="button button-secondary" onClick={() => begin()}><RotateCcw size={17} /> Новый текст</button></div>
          <div className="practice-controls">
            <div className="control-group"><span className="control-label">Режим</span><div className="segmented">{modes.map((item) => { const locked = playerLevel < modeUnlockLevel[item.id]; return <button key={item.id} type="button" className={mode === item.id ? 'selected' : ''} disabled={locked} title={locked ? `Откроется на уровне ${modeUnlockLevel[item.id]}` : undefined} onClick={() => begin(item.id, item.id === 'code' ? 'en' : language, difficulty)}>{locked && <img className="unlock-lock" src="/progress/lock.png" alt="" />}{item.title}{locked && <small className="required-level">ур. {modeUnlockLevel[item.id]}</small>}</button> })}</div></div>
            <div className="control-group"><span className="control-label">Язык</span><div className="segmented"><button type="button" className={language === 'ru' ? 'selected' : ''} disabled={mode === 'code'} title={mode === 'code' ? 'Код использует латинскую раскладку' : undefined} onClick={() => begin(mode, 'ru', difficulty)}>RU</button><button type="button" className={language === 'en' ? 'selected' : ''} onClick={() => begin(mode, 'en', difficulty)}>EN</button></div></div>
            <div className="control-group"><span className="control-label">Сложность</span><DifficultyPicker value={difficulty} level={playerLevel} onSelect={(level) => begin(mode, language, level)} /></div>
            <div className="control-group"><span className="control-label">Отображение</span><div className="segmented"><button type="button" className={displayMode === 'character' ? 'selected' : ''} aria-pressed={displayMode === 'character'} onClick={() => setDisplayMode('character')}>Символ</button><button type="button" className={displayMode === 'word' ? 'selected' : ''} aria-pressed={displayMode === 'word'} onClick={() => setDisplayMode('word')}>Слово</button></div></div>
          </div>
          <div className="practice-grid">
            <div>
              <div className="typing-card">
                <div className="typing-topline"><span className="typing-label">{run.label}</span><div className="typing-count">{run.index} <span>/ {run.text.length}</span></div></div>
                <div className="typing-progress"><span style={{ width: `${run.index / run.text.length * 100}%` }} /></div>
                <div ref={textRef} className={`typing-text ${pressedKey && !pressedKey.correct ? 'typing-error' : ''}`} aria-label="Текст упражнения">
                  {Array.from(run.text).map((char, index) => {
                    const inCurrentWord = displayMode === 'word' && hasActiveWord && index >= activeWordStart && index < activeWordEnd
                    const classes = [index < run.index ? 'typed' : '', inCurrentWord ? 'current-word' : '', index === run.index ? 'current' : '', index > run.index && !inCurrentWord ? 'pending' : ''].filter(Boolean).join(' ')
                    return <span key={index} className={classes}>{char === '\n' ? <>&#8629;<br /></> : char}</span>
                  })}
                </div>
                <div className="type-input-wrap"><Keyboard size={19} /><textarea ref={inputRef} aria-label="Поле ввода текста упражнения" value="" onChange={(event) => { handleInput(event.currentTarget.value); event.currentTarget.value = '' }} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); skipCurrentChar() } else if (event.key === 'Tab') { event.preventDefault(); inputRef.current?.focus() } }} placeholder={run.finishedAt ? 'Завершено' : 'Печатайте здесь'} rows={1} disabled={Boolean(run.finishedAt)} /><button type="button" className="skip-character" onClick={skipCurrentChar} disabled={Boolean(run.finishedAt)}>Пропустить <ArrowRight size={13} /></button></div>
              </div>
              <KeyboardGuide language={language} nextChar={nextChar} pressedKey={pressedKey} />
              <div className="keyboard-finger-hint"><span>Палец для текущего символа</span><strong>{fingerForChar(nextChar, language)}</strong></div>
            </div>
            <div className="training-side">
              <div className="live-stats"><h3>Скорость</h3><div className="live-number">{measure.wpm}<small>WPM</small></div><div className="metric-row"><span>Символов / мин</span><strong>{measure.cpm}</strong></div><div className="metric-row"><span>Точность</span><strong>{measure.accuracy}%</strong></div><div className="metric-row"><span>Ошибки</span><strong className={run.errors ? 'danger-text' : ''}>{run.errors}</strong></div><div className="metric-row"><span>Время</span><strong>{Math.floor(measure.elapsedMs / 60000).toString().padStart(2, '0')}:{Math.floor(measure.elapsedMs / 1000 % 60).toString().padStart(2, '0')}</strong></div></div>
              <div className="combo-card"><div className="combo-header"><Flame size={20} /><span>Серия без ошибок</span></div><strong>{run.combo}</strong><div className="combo-bottom">Множитель <b>×{multiplier(run.combo)}</b></div></div>
              <div ref={effectsStageRef} className="practice-effects" aria-live="polite">
                {activeBonusType && bonusPosition && <div key={`${activeBonusType}-${run.bonusUntil}`} className="bonus-effect" style={bonusPosition} role="status"><img src={`/practice/bonus/${activeBonusType}.png`} alt={activeBonusType === 'points' ? '+50% очков' : 'Удвоение опыта'} /><span aria-hidden="true">{Math.ceil(((run.bonusUntil ?? now) - now) / 1000)} сек</span></div>}
                {!run.finishedAt && run.combo > 0 && comboPosition && <div key={`${run.id}-${multiplier(run.combo)}`} className={`combo-effect combo-tier-${multiplier(run.combo)}`} style={comboPosition} aria-label={`Серия ${run.combo}, множитель ×${multiplier(run.combo)}`}><span>КОМБО</span><img src={`/practice/bonus/combo-${Math.max(2, multiplier(run.combo))}.png`} alt="" /><strong>×{multiplier(run.combo)}</strong></div>}
              </div>
            </div>
          </div>
          {run.finishedAt && !resultDismissed && <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-modal"><div className="result-top"><span>Результат</span><button type="button" className="icon-button modal-close auth-close result-close" onClick={() => { setResultDismissed(true); setPage('practice') }} aria-label="Закрыть результат"><img src="/auth/close.png" alt="" /></button></div><h2 id="result-title">Тренировка завершена</h2><div className="result-stats"><div><strong>{measure.cpm}</strong><span>Символов / мин</span></div><div><strong>{measure.accuracy}%</strong><span>Точность</span></div><div><strong>{run.points}</strong><span>Очки</span></div></div><div className="result-xp">{result ? `+${result.xp} XP` : 'Сохранение…'}{result?.unlocked.length ? <span>· Новое достижение</span> : null}</div>{levelGained && <div className="result-level-up"><strong>Уровень {playerLevel}!</strong><span>{newlyUnlocked.length ? `Открыто: ${newlyUnlocked.join(" · ")}` : "Все режимы и сложности открыты"}</span></div>}{result?.unlocked.length ? <div className="result-unlocks">{result.unlocked.map((key) => { const item = achievementInfo.find((entry) => entry.key === key); return item && <div key={key} className={`result-unlock rarity-${item.rarity}`}><img src={`/achievements/${key}.png`} alt="" /><span><strong>{item.name}</strong><small>{rarityNames[item.rarity]}</small></span></div> })}</div> : null}{result?.error && <p className="form-error">{result.error}</p>}<div className="result-actions"><button type="button" className="button button-primary" onClick={() => begin()}>Повторить</button><button type="button" className="button button-secondary" onClick={() => setPage('progress')}>Прогресс</button></div></div></div>}
        </section>}

        {page === 'progress' && <>
          <div className="page-heading progress-heading"><div><h1>Прогресс</h1></div><button type="button" className="button button-primary" onClick={() => begin()}><Keyboard size={17} /> Тренироваться</button></div>
          <div className="stats-grid"><StatCard label="СЕССИЙ" value={computedProgress.summary.sessions} icon={Activity} /><StatCard label="ВРЕМЯ В ПРАКТИКЕ" value={Math.round(computedProgress.summary.total_ms / 60000)} suffix="МИН" icon={Target} /><StatCard label="ЛУЧШИЙ РЕЗУЛЬТАТ" value={Math.round(computedProgress.summary.best_wpm)} suffix="WPM" icon={Flame} /><StatCard label="НАПЕЧАТАНО" value={computedProgress.summary.total_chars} icon={Type} /></div>
          <div className="progress-layout"><ProgressChart sessions={recent} /><div className="panel weak-panel"><h2>Сложные символы</h2><p>Чаще всего ошибки возникают на этих символах.</p>{Object.entries(computedProgress.mistakes).length ? <div className="weak-list">{Object.entries(computedProgress.mistakes).map(([char, count]) => <div key={char}><span className="weak-char">{prettyChar(char)}</span><div className="weak-track"><span style={{ width: `${Math.min(100, count / Math.max(...Object.values(computedProgress.mistakes)) * 100)}%` }} /></div><strong>{count}</strong></div>)}</div> : <div className="empty-weak">Ошибок пока нет.</div>}</div></div>
          <div className="section-heading history-heading"><div><h2>Последние тренировки</h2></div><span className="section-subtle">{recent.length} ЗАПИСЕЙ</span></div>
          <div className="history-list">{recent.length ? recent.slice(0, 8).map((session) => <div className="history-row" key={session.id}><div className="history-mode">{session.mode === 'code' ? <Code2 size={18} /> : <Keyboard size={18} />}</div><div className="history-name"><strong>{modeName[session.mode]}</strong><small>{new Date(session.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} · {session.language.toUpperCase()}</small></div><div className="history-metrics"><span><b>{Math.round(session.wpm)}</b> WPM</span><span><b>{Math.round(session.accuracy)}%</b> точность</span><strong>+{session.xp_earned} XP</strong></div></div>) : <div className="empty-list">Тренировок ещё нет. Начни с короткой серии слов.</div>}</div>
        </>}

        {page === 'leaderboard' && <section className="leaderboard-page">
          <div className="page-heading"><h1>Рейтинг</h1></div>
          <div className="board-controls">
            <div className="segmented" aria-label="Показатель рейтинга">
              {([['wpm', 'Скорость'], ['accuracy', 'Точность'], ['xp', 'Опыт']] as const).map(([value, label]) => <button key={value} type="button" className={boardMetric === value ? 'selected' : ''} aria-pressed={boardMetric === value} onClick={() => setBoardMetric(value)}>{label}</button>)}
            </div>
            <div className="segmented" aria-label="Период рейтинга">
              {([['today', 'Сегодня'], ['week', 'Неделя'], ['all', 'Всё время']] as const).map(([value, label]) => <button key={value} type="button" className={boardPeriod === value ? 'selected' : ''} aria-pressed={boardPeriod === value} onClick={() => setBoardPeriod(value)}>{label}</button>)}
            </div>
          </div>
          <div className="board-panel">
            <div className="board-header">
              <span>МЕСТО / УЧАСТНИК</span>
              <span className="board-header-meta"><span>{boardMetric === 'wpm' ? 'СКОРОСТЬ' : boardMetric === 'accuracy' ? 'ТОЧНОСТЬ' : 'ОПЫТ'}</span></span>
            </div>
            <div className="board-list" role="region" aria-label="Участники рейтинга" tabIndex={0}>
              {boardRows.map((entry, index) => <div className={`board-row ${entry.id === user?.id ? 'board-me' : ''}`} key={entry.id}>
                <div className="board-person">
                  <span className={`rank rank-${index + 1}`}>{index === 0 ? <img src="/leaderboard/ui/crown.png" alt="1 место" /> : (index + 1).toString().padStart(2, '0')}</span>
                  <span className="board-avatar"><Avatar number={entry.avatar || 1} size="small" /></span>
                  <span><strong>{entry.name}{entry.id === user?.id ? ' · ты' : ''}{entry.id < 0 && <small className="bot-label">бот</small>}</strong><small>{entry.sessions} тренировок</small></span>
                </div>
                <strong className="board-score">{boardMetric === 'accuracy' ? `${Math.round(entry.value * 10) / 10}%` : Math.round(entry.value)} <small>{boardMetric === 'wpm' ? 'WPM' : boardMetric === 'xp' ? 'XP' : ''}</small></strong>
              </div>)}
            </div>
          </div>
          <div className="board-note">* Для рейтинга нужны 25 символов и 15 секунд.</div>
        </section>}

        {page === 'awards' && <>
          <section className="awards-hero">
            <div className="awards-intro"><h1>Достижения</h1><p>Значки за скорость, точность и регулярные тренировки.</p></div>
            <div className="awards-progress-card"><div className="awards-progress-top"><span className="awards-trophy"><Award size={23} /></span><span><strong>{earned.size} / {achievementInfo.length}</strong><small>ОТКРЫТО</small></span><span className="awards-left"><small>ОСТАЛОСЬ</small><strong>{achievementInfo.length - earned.size}</strong></span></div><div className="awards-progress-track"><span style={{ width: `${achievementInfo.length ? (earned.size / achievementInfo.length) * 100 : 0}%` }} /></div></div>
          </section>
          <div className="awards-grid">{achievementInfo.map((achievement) => { const unlocked = earned.has(achievement.key); return <div className={`award-card rarity-${achievement.rarity} ${unlocked ? 'unlocked' : 'locked'}`} key={achievement.key}><div className="award-top"><span className="award-rarity">{rarityNames[achievement.rarity]}</span></div><div className="award-mark"><img src={`/achievements/${achievement.key}.png`} alt="" loading="lazy" /></div><h3>{achievement.name}</h3><p>{achievement.description}</p><span className="award-status">{unlocked ? 'ОТКРЫТО' : 'ЗАКРЫТО'}</span></div> })}</div>
        </>}
      </main>
    </div>
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSignedIn={(signedIn) => { setUser(signedIn); api.progress().then(setServerProgress).catch(() => {}) }} user={user} onLogout={logout} />}
  </div>
}
