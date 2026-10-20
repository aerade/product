import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowRight, Award, BarChart3,
  Code2, Flame, Keyboard,
  LogOut, RotateCcw, Settings2, Sparkles, Target, Trophy, Type, X,
} from 'lucide-react'
import { api, type Leaderboard, type Progress, type Session, type User } from './api'
import { achievementInfo, difficultyInfo, makeExercise, modeName, modes, prettyChar, rarityNames, type Difficulty, type Language, type Mode } from './data'
import { createRun, levelForXp, metrics, multiplier, press, type Run } from './engine'
import { fingerForChar, keyForChar, keyboardRows } from './keyboard'
import { demoLeaderboardRows } from './leaderboardDemo'
import SettingsModal from './SettingsModal'
import { applySettings, loadSettings, saveSettings, type Settings } from './settings'

type Page = 'overview' | 'practice' | 'progress' | 'leaderboard' | 'awards'
type GuestSession = Session & { elapsed_ms: number; correct_chars: number; mistake_map: Record<string, number> }
type GuestData = { xp: number; sessions: GuestSession[]; achievements: { key: string; unlocked_at: string }[] }
type Result = { xp: number; unlocked: string[]; stored: boolean; error?: string }

const guestKey = 'hero-typing-guest-v1'
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
  } catch { /* browser storage can be disabled */ }
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
  const xpEarned = Math.max(10, Math.round(run.index * (measure.accuracy / 100) / 3 + run.points / 40))
  const session: GuestSession = {
    id: Date.now(), mode: run.mode, language: run.language, difficulty: run.difficulty,
    wpm: measure.wpm, cpm: measure.cpm, accuracy: measure.accuracy, errors: run.errors,
    points: run.points, xp_earned: xpEarned, created_at: new Date().toISOString(),
    elapsed_ms: measure.elapsedMs, correct_chars: run.index, mistake_map: run.mistakes,
  }
  const sessions = [session, ...guest.sessions].slice(0, 2000)
  const candidates = earnedAchievementKeys(sessions)
  const existing = new Set(guest.achievements.map((achievement) => achievement.key))
  const unlocked = candidates.filter((key) => !existing.has(key))
  const next = {
    xp: guest.xp + xpEarned, sessions,
    achievements: [...guest.achievements, ...unlocked.map((key) => ({ key, unlocked_at: new Date().toISOString() }))],
  }
  try { localStorage.setItem(guestKey, JSON.stringify(next)) } catch { /* preview still works */ }
  return { next, result: { xp: xpEarned, unlocked, stored: true } }
}

function Avatar({ number, size = 'normal' }: { number: number; size?: 'normal' | 'small' }) {
  return <span className={`avatar-frame ${size === 'small' ? 'avatar-frame-small' : ''}`}><img className="user-avatar" src={`/avatars/forest-${String(number).padStart(2, '0')}.png`} alt="" /></span>
}

function StatCard({ label, value, suffix, icon: Icon, detail }: { label: string; value: string | number; suffix?: string; icon?: typeof Activity; detail?: string }) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span>{Icon && <Icon size={17} strokeWidth={1.7} />}</div><div className="stat-value">{value}<small>{suffix}</small></div>{detail && <p>{detail}</p>}</div>
}

function Navigation({ page, setPage, onAuth, user, avatar, xp }: { page: Page; setPage: (page: Page) => void; onAuth: () => void; user: User | null; avatar: number; xp: number }) {
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
      {links.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`nav-item nav-pixel nav-pixel-${id} ${page === id ? 'active' : ''}`} aria-label={label} onClick={() => setPage(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="nav-dot" />}</button>)}
      <button type="button" className="nav-item nav-pixel nav-pixel-settings" aria-label="Настройки временно недоступны" title="Настройки временно недоступны" disabled><Settings2 size={18} /><span>Настройки</span></button>
      <button type="button" className="nav-item compact-action" onClick={onAuth} aria-label="Профиль"><Avatar number={avatar} size="small" /><span>Профиль</span></button>
    </nav>
    <div className="sidebar-bottom">
      <div className="level-panel"><div className="level-panel-title"><span>Уровень {levelForXp(xp)}</span><strong>{xp} XP</strong></div><div className="progress-track"><span style={{ width: `${(xp % 250) / 2.5}%` }} /></div><small>{xp % 250} / 250 XP</small></div>
      <button type="button" className="profile-button" onClick={onAuth}><Avatar number={avatar} /><span><strong>{user ? user.name : 'Гость'}</strong><small>{user ? user.email : 'Войти в аккаунт'}</small></span><ArrowRight size={15} /></button>
    </div>
  </aside>
}

function KeyboardGuide({ language, nextChar, showFinger }: { language: Language; nextChar: string; showFinger: boolean }) {
  const active = keyForChar(nextChar, language)
  return <div className="keyboard-guide">
    <div className="section-heading"><h3>Клавиатура</h3>{showFinger && <div className="finger-tip">{fingerForChar(nextChar, language)}</div>}</div>
    <div className="keyboard-rows" aria-label={`Подсказка клавиатуры для символа ${prettyChar(nextChar)}`}>
      {keyboardRows(language).map((row, index) => <div className={`keyboard-row row-${index}`} key={index}>{row.map((key) => <span key={`${index}-${key}`} className={`keycap ${key === active ? 'keycap-active' : ''}`}>{key.toUpperCase()}</span>)}</div>)}
      <div className="keyboard-row last-row"><span className={`keycap keycap-space ${active === 'Space' ? 'keycap-active' : ''}`}>ПРОБЕЛ</span><span className={`keycap keycap-enter ${active === 'Enter' ? 'keycap-active' : ''}`}>ENTER</span></div>
    </div>
  </div>
}

function AuthModal({ onClose, onSignedIn, user, onLogout }: { onClose: () => void; onSignedIn: (user: User) => void; user: User | null; onLogout: () => void }) {
  const [register, setRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const signedIn = register ? await api.register(name, email, password) : await api.login(email, password)
      onSignedIn(signedIn)
      onClose()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось войти') }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-art" aria-hidden="true" />
      <section className="auth-content">
        <button type="button" className="icon-button modal-close auth-close" onClick={onClose} aria-label="Закрыть"><img src="/auth/close.png" alt="" /></button>
        {user ? <><h2 id="auth-title">Профиль: {user.name}</h2><p className="muted">Результаты доступны после входа на другом устройстве.</p><div className="account-summary"><span>Всего опыта</span><strong>{user.xp} XP</strong></div><button type="button" className="button button-secondary full auth-submit" onClick={() => { onLogout(); onClose() }}><LogOut size={17} /> Выйти из аккаунта</button></> : <><h2 id="auth-title">{register ? 'Создать аккаунт' : 'Вход в Keyflow'}</h2><p className="muted">{register ? 'Для сохранения результатов и участия в рейтинге.' : 'Введите email и пароль.'}</p><form onSubmit={submit} className="auth-form">{register && <label>Имя<input required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к тебе обращаться" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Пароль<input required type="password" minLength={register ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={register ? 'Минимум 8 символов' : 'Ваш пароль'} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="button button-primary full auth-submit" disabled={busy}>{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}<ArrowRight size={17} /></button></form><button type="button" className="text-button auth-switch" onClick={() => { setRegister(!register); setError('') }}>{register ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать аккаунт'}</button></>}
      </section>
    </div>
  </div>
}

function chartPoints(sessions: Session[]) {
  const values = [...sessions].slice(0, 10).reverse().map((session) => session.wpm)
  if (!values.length) return ''
  const high = Math.max(35, ...values)
  return values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${90 - (value / high) * 74}`).join(' ')
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [page, setPage] = useState<Page>(settings.startPage)
  const [mode, setMode] = useState<Mode>(settings.defaultMode)
  const [language, setLanguage] = useState<Language>(settings.defaultMode === 'code' ? 'en' : settings.defaultLanguage)
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.defaultDifficulty)
  const [run, setRun] = useState<Run>(() => { const lang = settings.defaultMode === 'code' ? 'en' : settings.defaultLanguage; const task = makeExercise(settings.defaultMode, lang, settings.defaultDifficulty); return createRun(settings.defaultMode, lang, settings.defaultDifficulty, task.text, task.label) })
  const [now, setNow] = useState(Date.now())
  const [user, setUser] = useState<User | null>(null)
  const [guest, setGuest] = useState<GuestData>(loadGuest)
  const [serverProgress, setServerProgress] = useState<Progress | null>(null)
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [boardMetric, setBoardMetric] = useState<Leaderboard['metric']>('wpm')
  const [boardPeriod, setBoardPeriod] = useState<Leaderboard['period']>('week')
  const [result, setResult] = useState<Result | null>(null)
  const [feedback, setFeedback] = useState<{ id: number; kind: 'correct' | 'error' | 'combo' } | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [guestAvatar, setGuestAvatar] = useState(() => {
    const saved = Number(localStorage.getItem('real-guest-avatar'))
    if (saved >= 1 && saved <= 10) return saved
    const random = Math.floor(Math.random() * 10) + 1
    localStorage.setItem('real-guest-avatar', String(random))
    return random
  })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const savedRuns = useRef(new Set<string>())
  const audioRef = useRef<AudioContext | null>(null)
  const effectCounter = useRef(0)
  const computedProgress = user ? (serverProgress ?? guestProgress(emptyGuest)) : guestProgress(guest)
  const xp = user?.xp ?? guest.xp
  const avatar = user?.avatar ?? guestAvatar
  const measure = metrics(run, now)
  const activeBonus = run.bonusUntil !== null && run.bonusUntil > now && !run.finishedAt
  const nextChar = run.text[run.index] || ' '

  useEffect(() => { saveSettings(settings); applySettings(settings) }, [settings])

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  useEffect(() => {
    if (settings.buttonSound === 'off') return
    const handler = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) playTone(settings.buttonSound === 'click' ? 600 : 410, 0.045)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [settings.buttonSound, settings.soundPack, settings.soundVolume])

  useEffect(() => {
    if (result?.unlocked.length && settings.achievementSound) {
      [660, 880, 1100].forEach((note, index) => playTone(note, 0.14, index * 0.085))
    }
  }, [result, settings.achievementSound, settings.soundPack, settings.soundVolume])

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
    if (page !== 'practice' || !settings.autoFocus || run.startedAt || run.finishedAt) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [page, settings.autoFocus, run.id, run.startedAt, run.finishedAt])

  useEffect(() => {
    const container = textRef.current
    const active = container?.querySelector<HTMLElement>('.current')
    if (!container) return
    if (run.index === 0) { container.scrollTop = 0; return }
    if (!active) return
    const top = active.offsetTop
    if (top > container.scrollTop + container.clientHeight - 60) container.scrollTop = top - container.clientHeight + 70
    else if (top < container.scrollTop + 20) container.scrollTop = top - 20
  }, [run.id, run.index])

  useEffect(() => {
    if (page !== 'leaderboard') return
    api.leaderboard(boardMetric, boardPeriod).then(setLeaderboard).catch(() => setLeaderboard(null))
  }, [page, boardMetric, boardPeriod])

  useEffect(() => {
    if (!run.finishedAt || savedRuns.current.has(run.id)) return
    savedRuns.current.add(run.id)
    if (user) {
      api.save({ mode: run.mode, language: run.language, difficulty: run.difficulty,
        elapsed_ms: metrics(run, run.finishedAt).elapsedMs, correct_chars: run.index,
        errors: run.errors, points: run.points, mistake_map: run.mistakes })
        .then((saved) => { setUser(saved.user); setResult({ xp: saved.xp_earned, unlocked: saved.unlocked, stored: true }); api.progress().then(setServerProgress).catch(() => {}) })
        .catch(() => setResult({ xp: 0, unlocked: [], stored: false, error: 'Сервер недоступен. Результат не сохранён в аккаунте.' }))
    } else {
      const saved = saveGuestRun(guest, run)
      setGuest(saved.next)
      setResult(saved.result)
    }
  }, [run, user, guest])

  function playTone(frequency: number, duration: number, delay = 0) {
    try {
      if (settings.soundVolume <= 0) return
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = settings.soundPack === 'arcade' ? 'square' : settings.soundPack === 'synth' ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      const start = context.currentTime + delay
      gain.gain.setValueAtTime(Math.max(0.001, 0.055 * settings.soundVolume / 100), start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + duration)
    } catch { /* sound is optional */ }
  }

  function handleInput(raw: string) {
    if (!raw || run.finishedAt) return
    const chars = Array.from(raw)
    if (chars.length > 3) return // pasted text is not a typing exercise
    let next = run
    chars.forEach((character) => { next = press(next, character, Date.now()) })
    if (next === run) return
    if (settings.keySound && next.lastHit === 'correct') playTone(330 + next.combo % 5 * 28, 0.035)
    if (settings.typingSound && next.lastHit === 'error') playTone(170, 0.11)
    if (settings.typingSound && next.lastHit === 'correct' && next.combo > 0 && next.combo % 10 === 0) playTone(560 + Math.min(next.combo, 100) * 2, 0.09)
    if (settings.completionSound && next.finishedAt && !run.finishedAt) [540, 720, 960].forEach((note, index) => playTone(note, 0.16, index * 0.09))
    if (settings.animations && settings.visualIntensity !== 'off') {
      effectCounter.current += 1
      setFeedback({ id: effectCounter.current, kind: next.lastHit === 'error' ? 'error' : next.combo > 0 && next.combo % 25 === 0 ? 'combo' : 'correct' })
    }
    setRun(next)
    setNow(Date.now())
  }

  function begin(nextMode = mode, nextLanguage = language, nextDifficulty = difficulty) {
    const resolvedLanguage = nextMode === 'code' ? 'en' : nextLanguage
    setMode(nextMode); setLanguage(resolvedLanguage); setDifficulty(nextDifficulty)
    const task = makeExercise(nextMode, resolvedLanguage, nextDifficulty)
    setRun(createRun(nextMode, resolvedLanguage, nextDifficulty, task.text, task.label))
    setResult(null); setFeedback(null); setNow(Date.now()); setPage('practice')
    if (settings.autoFocus) window.setTimeout(() => inputRef.current?.focus(), 40)
  }

  async function logout() {
    await api.logout().catch(() => {})
    setUser(null); setServerProgress(null)
  }

  async function changeAvatar(value: number) {
    if (user) {
      setUser(await api.updateProfile({ avatar: value }))
      if (page === 'leaderboard') api.leaderboard(boardMetric, boardPeriod).then(setLeaderboard).catch(() => {})
    }
    else { localStorage.setItem('real-guest-avatar', String(value)); setGuestAvatar(value) }
  }

  async function changeName(value: string) {
    setUser(await api.updateProfile({ name: value }))
    if (page === 'leaderboard') api.leaderboard(boardMetric, boardPeriod).then(setLeaderboard).catch(() => {})
  }

  const recent = computedProgress?.sessions || []
  const earned = new Set(computedProgress?.achievements.map((achievement) => achievement.key) || [])
  const liveBoard = leaderboard?.metric === boardMetric && leaderboard.period === boardPeriod && leaderboard.rows.length > 0 ? leaderboard : null
  const boardRows = liveBoard?.rows ?? demoLeaderboardRows(boardMetric, boardPeriod)

  return <div className={`app-shell ${page === 'practice' && settings.focusMode ? 'focus-mode' : ''}`} data-caret={settings.caretStyle}>
    <Navigation page={page} setPage={setPage} onAuth={() => setAuthOpen(true)} user={user} avatar={avatar} xp={xp} />
    <div className="main-area">
      {page === 'practice' && feedback && <div key={feedback.id} className={`key-feedback key-feedback-${feedback.kind}`} aria-hidden="true" />}
      <main className="content">
        <div className="mobile-brand"><img src="/keyflow-sidebar-logo.png" alt="Keyflow" /></div>
        {page === 'overview' && <>
          <div className="page-intro overview-hero"><div className="overview-hero-copy"><h1>Тренировка печати</h1><p>Слова, предложения, код и символы.</p><div className="hero-actions"><button type="button" className="button button-primary" onClick={() => begin(settings.defaultMode, settings.defaultLanguage, settings.defaultDifficulty)}>Начать</button><button type="button" className="button button-secondary" onClick={() => setPage('progress')}>Прогресс</button></div></div></div>
          <div className="section-heading overview-heading"><h2>Статистика</h2><button type="button" className="link-button" onClick={() => setPage('progress')}>Подробнее <ArrowRight size={17} /></button></div>
          <div className="stats-grid overview-stats"><StatCard label="ТРЕНИРОВКИ" value={computedProgress.summary.sessions} /><StatCard label="ЛУЧШАЯ СКОРОСТЬ" value={Math.round(computedProgress.summary.best_wpm)} suffix="WPM" /><StatCard label="ТОЧНОСТЬ" value={Math.round(computedProgress.summary.avg_accuracy)} suffix="%" /><StatCard label="ОПЫТ" value={xp} suffix="XP" /></div>
          <div className="section-heading mode-heading"><h2>Режимы</h2></div>
          <div className="mode-grid overview-modes">{modes.map((item) => <button type="button" className="mode-card" key={item.id} onClick={() => begin(item.id, item.id === 'code' ? 'en' : language, difficulty)}><div className="mode-icon"><img src={`/overview/mode-${item.id}.png`} alt="" /></div><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><ArrowRight className="mode-arrow" size={20} /></button>)}</div>
        </>}

        {page === 'practice' && <>
          <div className="page-heading"><h1>Тренировка</h1><button type="button" className="button button-secondary" onClick={() => begin()}><RotateCcw size={17} /> Новый текст</button></div>
          <div className="practice-controls"><div className="control-group"><span className="control-label">Режим</span><div className="segmented">{modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? 'selected' : ''} onClick={() => begin(item.id, item.id === 'code' ? 'en' : language, difficulty)}>{item.title}</button>)}</div></div><div className="control-group"><span className="control-label">Язык</span><div className="segmented"><button type="button" className={language === 'ru' ? 'selected' : ''} disabled={mode === 'code'} title={mode === 'code' ? 'Код использует латинскую раскладку' : undefined} onClick={() => begin(mode, 'ru', difficulty)}>RU</button><button type="button" className={language === 'en' ? 'selected' : ''} onClick={() => begin(mode, 'en', difficulty)}>EN</button></div></div><div className="control-group"><label className="control-label" htmlFor="difficulty">Сложность</label><select id="difficulty" className="difficulty-select" value={difficulty} onChange={(event) => begin(mode, language, Number(event.target.value) as Difficulty)}>{difficultyInfo.map((item) => <option value={item.level} key={item.level}>{item.level}. {item.name}</option>)}</select></div><span className="difficulty-detail">{difficultyInfo[difficulty - 1].detail}</span></div>
          <div className="practice-grid"><div><div className="typing-card"><div className="typing-topline"><span className="typing-label">{run.label}</span><div className="typing-count">{run.index} <span>/ {run.text.length}</span></div></div><div className="typing-progress"><span style={{ width: `${run.index / run.text.length * 100}%` }} /></div><div ref={textRef} className={`typing-text ${run.lastHit === 'error' ? 'typing-error' : ''}`} aria-label="Текст упражнения">{Array.from(run.text).map((char, index) => <span key={index} className={index < run.index ? 'typed' : index === run.index ? 'current' : 'pending'}>{char === '\n' ? <>&#8629;<br /></> : char}</span>)}</div><div className="type-input-wrap"><Keyboard size={19} /><textarea ref={inputRef} aria-label="Поле ввода текста упражнения" value="" onChange={(event) => handleInput(event.currentTarget.value)} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); inputRef.current?.focus() } }} placeholder={run.finishedAt ? 'Завершено' : 'Печатайте здесь'} rows={1} disabled={Boolean(run.finishedAt)} /></div></div>{settings.showKeyboard && <KeyboardGuide language={language} nextChar={nextChar} showFinger={settings.showFinger} />}</div><div className="training-side">{settings.showStats && <div className="live-stats"><h3>Скорость</h3><div className="live-number">{measure.wpm}<small>WPM</small></div><div className="metric-row"><span>Символов / мин</span><strong>{measure.cpm}</strong></div><div className="metric-row"><span>Точность</span><strong>{measure.accuracy}%</strong></div><div className="metric-row"><span>Ошибки</span><strong className={run.errors ? 'danger-text' : ''}>{run.errors}</strong></div><div className="metric-row"><span>Время</span><strong>{Math.floor(measure.elapsedMs / 60000).toString().padStart(2, '0')}:{Math.floor(measure.elapsedMs / 1000 % 60).toString().padStart(2, '0')}</strong></div></div>}{settings.showCombo && <div className={`combo-card ${settings.comboPulse && run.combo >= 20 ? "combo-hot" : ""}`}><div className="combo-header"><Flame size={20} /><span>Серия</span></div><strong>{run.combo}</strong><div className="combo-bottom">Множитель <b>×{multiplier(run.combo)}</b></div>{activeBonus && <div className="bonus-chip"><Sparkles size={14} /> ×2 очка</div>}</div>}{settings.showFinger && <div className="hint-card"><p>Следующий символ: <strong>{prettyChar(nextChar)}</strong></p><small>{fingerForChar(nextChar, language)}</small></div>}</div></div>
          {run.finishedAt && <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-modal"><div className="result-top"><span>Результат</span><button type="button" className="icon-button" onClick={() => setPage('overview')} aria-label="Закрыть результат"><X size={18} /></button></div><h2 id="result-title">Тренировка завершена</h2><div className="result-stats"><div><strong>{measure.wpm}</strong><span>WPM</span></div><div><strong>{measure.accuracy}%</strong><span>Точность</span></div><div><strong>{run.points}</strong><span>Очки</span></div></div><div className="result-xp">{result ? `+${result.xp} XP` : 'Сохранение…'}{result?.unlocked.length ? <span>· Новое достижение</span> : null}</div>{result?.unlocked.length ? <div className="result-unlocks">{result.unlocked.map((key) => { const item = achievementInfo.find((entry) => entry.key === key); return item && <div key={key} className={`result-unlock rarity-${item.rarity}`}><img src={`/achievements/${key}.png`} alt="" /><span><strong>{item.name}</strong><small>{rarityNames[item.rarity]}</small></span></div> })}</div> : null}{result?.error && <p className="form-error">{result.error}</p>}<div className="result-actions"><button type="button" className="button button-primary" onClick={() => begin()}>Повторить</button><button type="button" className="button button-secondary" onClick={() => setPage('progress')}>Прогресс</button></div></div></div>}
        </>}

        {page === 'progress' && <><div className="page-heading"><div><h1>Прогресс</h1></div><button type="button" className="button button-primary" onClick={() => begin()}><Keyboard size={17} /> Тренироваться</button></div><div className="stats-grid"><StatCard label="СЕССИЙ" value={computedProgress.summary.sessions} icon={Activity} /><StatCard label="ВРЕМЯ В ПРАКТИКЕ" value={Math.round(computedProgress.summary.total_ms / 60000)} suffix="МИН" icon={Target} /><StatCard label="ЛУЧШИЙ РЕЗУЛЬТАТ" value={Math.round(computedProgress.summary.best_wpm)} suffix="WPM" icon={Flame} /><StatCard label="НАПЕЧАТАНО" value={computedProgress.summary.total_chars} icon={Type} /></div><div className="progress-layout"><div className="panel chart-panel"><div className="section-heading"><div><h2>Скорость печати</h2></div><span className="chart-unit">WPM / ПОСЛЕДНИЕ 10 СЕССИЙ</span></div>{recent.length ? <div className="chart"><div className="chart-grid"><span>100</span><span>75</span><span>50</span><span>25</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="График скорости"><polyline points={chartPoints(recent)} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg></div> : <div className="empty-chart"><BarChart3 size={32} /><strong>Нет данных</strong><p>График появится после первой тренировки.</p></div>}</div><div className="panel weak-panel"><h2>Сложные символы</h2><p>Чаще всего ошибки возникают на этих символах.</p>{Object.entries(computedProgress.mistakes).length ? <div className="weak-list">{Object.entries(computedProgress.mistakes).map(([char, count]) => <div key={char}><span className="weak-char">{prettyChar(char)}</span><div className="weak-track"><span style={{ width: `${Math.min(100, count / Math.max(...Object.values(computedProgress.mistakes)) * 100)}%` }} /></div><strong>{count}</strong></div>)}</div> : <div className="empty-weak">Ошибок пока нет.</div>}</div></div><div className="section-heading history-heading"><div><h2>Последние тренировки</h2></div><span className="section-subtle">{recent.length} ЗАПИСЕЙ</span></div><div className="history-list">{recent.length ? recent.slice(0, 8).map((session) => <div className="history-row" key={session.id}><div className="history-mode">{session.mode === 'code' ? <Code2 size={18} /> : <Keyboard size={18} />}</div><div className="history-name"><strong>{modeName[session.mode]}</strong><small>{new Date(session.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} · {session.language.toUpperCase()}</small></div><div className="history-metrics"><span><b>{Math.round(session.wpm)}</b> WPM</span><span><b>{Math.round(session.accuracy)}%</b> точность</span><strong>+{session.xp_earned} XP</strong></div></div>) : <div className="empty-list">Тренировок ещё нет. Начни с короткой серии слов.</div>}</div></>}

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
                  <span><strong>{entry.name}{entry.id === user?.id ? ' · ты' : ''}{!liveBoard && <small className="bot-label">бот</small>}</strong><small>{entry.sessions} тренировок</small></span>
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
    {settingsOpen && <SettingsModal settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} user={user} avatar={avatar} onAvatar={changeAvatar} onName={changeName} onAuth={() => { setSettingsOpen(false); setAuthOpen(true) }} />}
  </div>
}
