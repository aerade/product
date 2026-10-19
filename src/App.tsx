import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, Award, BarChart3, Check, CheckCircle2,
  ChevronDown, CircleUserRound, Code2, Crown, Flame, Globe2, Keyboard, LockKeyhole,
  LogOut, Medal, RotateCcw, Sparkles, Target, Trophy, Type, Volume2, VolumeX, X,
} from 'lucide-react'
import { api, type Leaderboard, type Progress, type Session, type User } from './api'
import { achievementInfo, makeExercise, modeName, modes, prettyChar, type Difficulty, type Language, type Mode } from './data'
import { createRun, levelForXp, metrics, multiplier, press, type Run } from './engine'
import { fingerForChar, keyForChar, keyboardRows } from './keyboard'

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
      if (Array.isArray(value.sessions) && Array.isArray(value.achievements)) return value
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

function saveGuestRun(guest: GuestData, run: Run): { next: GuestData; result: Result } {
  const measure = metrics(run, run.finishedAt || Date.now())
  const xpEarned = Math.max(10, Math.round(run.index * (measure.accuracy / 100) / 3 + run.points / 40))
  const session: GuestSession = {
    id: Date.now(), mode: run.mode, language: run.language, difficulty: run.difficulty,
    wpm: measure.wpm, cpm: measure.cpm, accuracy: measure.accuracy, errors: run.errors,
    points: run.points, xp_earned: xpEarned, created_at: new Date().toISOString(),
    elapsed_ms: measure.elapsedMs, correct_chars: run.index, mistake_map: run.mistakes,
  }
  const sessions = [session, ...guest.sessions].slice(0, 60)
  const candidates = ['first']
  if (run.errors === 0 && run.index >= 25) candidates.push('clean')
  if (measure.cpm >= 200 && run.index >= 25) candidates.push('speed')
  if (run.errors === 0 && run.index >= 100) candidates.push('streak')
  if (sessions.reduce((sum, item) => sum + item.correct_chars, 0) >= 1000) candidates.push('thousand')
  if (new Set(sessions.map((item) => item.created_at.slice(0, 10))).size >= 3) candidates.push('regular')
  const existing = new Set(guest.achievements.map((achievement) => achievement.key))
  const unlocked = candidates.filter((key) => !existing.has(key))
  const next = {
    xp: guest.xp + xpEarned, sessions,
    achievements: [...guest.achievements, ...unlocked.map((key) => ({ key, unlocked_at: new Date().toISOString() }))],
  }
  try { localStorage.setItem(guestKey, JSON.stringify(next)) } catch { /* preview still works */ }
  return { next, result: { xp: xpEarned, unlocked, stored: true } }
}

function Mark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-mark ${compact ? 'brand-mark-small' : ''}`} aria-hidden="true"><span /><span /></div>
}

function StatCard({ label, value, suffix, icon: Icon, detail }: { label: string; value: string | number; suffix?: string; icon: typeof Activity; detail?: string }) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span><Icon size={17} strokeWidth={1.7} /></div><div className="stat-value">{value}<small>{suffix}</small></div>{detail && <p>{detail}</p>}</div>
}

function Navigation({ page, setPage, onAuth, user, xp }: { page: Page; setPage: (page: Page) => void; onAuth: () => void; user: User | null; xp: number }) {
  const links: { id: Page; label: string; icon: typeof Keyboard }[] = [
    { id: 'overview', label: 'Главная', icon: Target },
    { id: 'practice', label: 'Тренировка', icon: Keyboard },
    { id: 'progress', label: 'Прогресс', icon: BarChart3 },
    { id: 'leaderboard', label: 'Рейтинг', icon: Trophy },
    { id: 'awards', label: 'Достижения', icon: Award },
  ]
  return <aside className="sidebar">
    <div className="brand"><Mark /><div><strong>ПЕЧАТЬ<br />ГЕРОЯ</strong><span>ТИПИНГ / 2026</span></div></div>
    <div className="sidebar-section-label">ПРОСТРАНСТВО</div>
    <nav aria-label="Основная навигация" className="nav-list">
      {links.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="nav-dot" />}</button>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="level-panel"><div className="level-panel-title"><span>ТВОЙ УРОВЕНЬ</span><strong>LVL {levelForXp(xp).toString().padStart(2, '0')}</strong></div><div className="progress-track"><span style={{ width: `${(xp % 250) / 2.5}%` }} /></div><small>{xp % 250} / 250 XP до нового уровня</small></div>
      <button type="button" className="profile-button" onClick={onAuth}><div className="avatar">{user ? user.name.slice(0, 1).toUpperCase() : <CircleUserRound size={21} />}</div><span><strong>{user ? user.name : 'Гостевой режим'}</strong><small>{user ? 'Прогресс сохранён' : 'Войти в аккаунт'}</small></span><ArrowRight size={15} /></button>
    </div>
  </aside>
}

function KeyboardGuide({ language, nextChar }: { language: Language; nextChar: string }) {
  const active = keyForChar(nextChar)
  return <div className="keyboard-guide">
    <div className="section-heading"><div><span className="eyebrow">ПОМОЩНИК</span><h3>Следующая клавиша</h3></div><div className="finger-tip"><span className="finger-dot" />{fingerForChar(nextChar, language)}</div></div>
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

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Закрыть"><X size={19} /></button><Mark compact />
    {user ? <><span className="eyebrow">ПРОФИЛЬ</span><h2 id="auth-title">Привет, {user.name}</h2><p className="muted">Твой прогресс сохранён в аккаунте и будет доступен при следующем входе.</p><div className="account-summary"><span>Всего опыта</span><strong>{user.xp} XP</strong></div><button type="button" className="button button-secondary full" onClick={() => { onLogout(); onClose() }}><LogOut size={17} /> Выйти из аккаунта</button></> : <><span className="eyebrow">ТВОЙ ПРОГРЕСС</span><h2 id="auth-title">{register ? 'Создать аккаунт' : 'С возвращением'}</h2><p className="muted">{register ? 'Сохраняй результаты и участвуй в рейтинге.' : 'Войди, чтобы продолжить с любого устройства.'}</p><form onSubmit={submit} className="auth-form">{register && <label>Имя<input required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к тебе обращаться" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Пароль<input required type="password" minLength={register ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={register ? 'Минимум 8 символов' : 'Ваш пароль'} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="button button-primary full" disabled={busy}>{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}<ArrowRight size={17} /></button></form><button type="button" className="text-button" onClick={() => { setRegister(!register); setError('') }}>{register ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}</button></>}
  </div></div>
}

function chartPoints(sessions: Session[]) {
  const values = [...sessions].slice(0, 10).reverse().map((session) => session.wpm)
  if (!values.length) return ''
  const high = Math.max(35, ...values)
  return values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${90 - (value / high) * 74}`).join(' ')
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [mode, setMode] = useState<Mode>('words')
  const [language, setLanguage] = useState<Language>('ru')
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
  const [authOpen, setAuthOpen] = useState(false)
  const [sound, setSound] = useState(() => localStorage.getItem('hero-sound') !== 'off')
  const [serviceOnline, setServiceOnline] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const savedRuns = useRef(new Set<string>())
  const audioRef = useRef<AudioContext | null>(null)
  const computedProgress = user ? (serverProgress ?? guestProgress(emptyGuest)) : guestProgress(guest)
  const xp = user?.xp ?? guest.xp
  const measure = metrics(run, now)
  const activeBonus = run.bonusUntil !== null && run.bonusUntil > now && !run.finishedAt
  const nextChar = run.text[run.index] || ' '

  useEffect(() => {
    api.me().then(({ user: current }) => {
      setUser(current)
      if (current) api.progress().then(setServerProgress).catch(() => {})
    }).catch(() => setServiceOnline(false))
  }, [])

  useEffect(() => {
    if (!run.startedAt || run.finishedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [run.startedAt, run.finishedAt])

  useEffect(() => {
    if (page !== 'leaderboard') return
    api.leaderboard(boardMetric, boardPeriod).then((data) => { setLeaderboard(data); setServiceOnline(true) }).catch(() => { setLeaderboard(null); setServiceOnline(false) })
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

  function playNote(success: boolean) {
    if (!sound) return
    try {
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = success ? 520 : 180
      gain.gain.setValueAtTime(0.025, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.07)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.07)
    } catch { /* sound is optional */ }
  }

  function handleInput(raw: string) {
    if (!raw || run.finishedAt) return
    const chars = Array.from(raw)
    if (chars.length > 3) return // pasted text is not a typing exercise
    let next = run
    chars.forEach((character) => { next = press(next, character, Date.now()) })
    if (next !== run && (next.lastHit === 'error' || next.combo % 10 === 0)) playNote(next.lastHit === 'correct')
    setRun(next)
    setNow(Date.now())
  }

  function begin(nextMode = mode, nextLanguage = language, nextDifficulty = difficulty) {
    const resolvedLanguage = nextMode === 'code' ? 'en' : nextLanguage
    setMode(nextMode); setLanguage(resolvedLanguage); setDifficulty(nextDifficulty)
    const task = makeExercise(nextMode, resolvedLanguage, nextDifficulty)
    setRun(createRun(nextMode, resolvedLanguage, nextDifficulty, task.text, task.label))
    setResult(null); setNow(Date.now()); setPage('practice')
    window.setTimeout(() => inputRef.current?.focus(), 40)
  }

  async function logout() {
    await api.logout().catch(() => {})
    setUser(null); setServerProgress(null)
  }

  const navTitle: Record<Page, string> = { overview: 'Главная', practice: 'Тренировка', progress: 'Прогресс', leaderboard: 'Рейтинг', awards: 'Достижения' }
  const recent = computedProgress?.sessions || []
  const earned = new Set(computedProgress?.achievements.map((achievement) => achievement.key) || [])

  return <div className="app-shell">
    <Navigation page={page} setPage={setPage} onAuth={() => setAuthOpen(true)} user={user} xp={xp} />
    <div className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>ПЕЧАТЬ ГЕРОЯ</span><span className="crumb-slash">/</span><strong>{navTitle[page]}</strong></div><div className="topbar-right"><span className="live-indicator"><span />ТВОЙ ТЕМП — ТВОИ ПРАВИЛА</span><button type="button" className="account-chip" onClick={() => setAuthOpen(true)}><span>{user ? user.name.slice(0, 1).toUpperCase() : 'Г'}</span>{user ? user.name : 'Гость'}<ChevronDown size={14} /></button></div></header>
      <main className="content">
        {page === 'overview' && <>
          <div className="page-intro"><div><span className="eyebrow">ТРЕНАЖЁР СЛЕПОЙ ПЕЧАТИ / ОСЕНЬ 2026</span><h1>Каждый символ<br /><em>имеет значение.</em></h1><p>Тренируй точность, набирай скорость и превращай практику в игру. Твой следующий рекорд начинается здесь.</p><div className="hero-actions"><button type="button" className="button button-primary" onClick={() => begin()}><Keyboard size={19} /> Начать тренировку <ArrowRight size={18} /></button><button type="button" className="button button-secondary" onClick={() => setPage('progress')}>Мой прогресс <ArrowDownRight size={18} /></button></div></div><div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-key">R<span>↗</span></div><div className="hero-art-caption">НАБИРАЙ СВОЙ<br />ТЕМП / 01</div></div></div>
          <div className="section-heading overview-heading"><div><span className="eyebrow">СЕГОДНЯ И ВСЕГДА</span><h2>Твои показатели</h2></div><button type="button" className="link-button" onClick={() => setPage('progress')}>Вся статистика <ArrowRight size={17} /></button></div>
          <div className="stats-grid"><StatCard label="ТРЕНИРОВОК" value={computedProgress?.summary.sessions ?? 0} icon={Activity} detail="Каждая сессия — шаг вперёд" /><StatCard label="ЛУЧШАЯ СКОРОСТЬ" value={Math.round(computedProgress?.summary.best_wpm ?? 0)} suffix="WPM" icon={Flame} detail="Личный рекорд" /><StatCard label="СРЕДНЯЯ ТОЧНОСТЬ" value={Math.round(computedProgress?.summary.avg_accuracy ?? 0)} suffix="%" icon={Target} detail="Контроль важнее спешки" /><StatCard label="ОПЫТ" value={xp} suffix="XP" icon={Sparkles} detail={`Уровень ${levelForXp(xp)}`} /></div>
          <div className="section-heading mode-heading"><div><span className="eyebrow">ВЫБЕРИ СВОЙ ПУТЬ</span><h2>Режимы тренировки</h2></div><span className="section-subtle">04 РЕЖИМА</span></div>
          <div className="mode-grid">{modes.map((item) => <button type="button" className="mode-card" key={item.id} onClick={() => begin(item.id, item.id === 'code' ? 'en' : language, difficulty)}><span className="mode-index">{item.icon} / 04</span><div className="mode-icon">{item.id === 'code' ? <Code2 size={26} /> : item.id === 'symbols' ? <Sparkles size={26} /> : item.id === 'sentences' ? <Type size={26} /> : <Keyboard size={26} />}</div><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><ArrowRight className="mode-arrow" size={20} /></button>)}</div>
          {!user && <div className="sync-banner"><LockKeyhole size={22} /><div><strong>Продолжай с любого устройства</strong><p>Создай аккаунт, чтобы сохранить прогресс и попасть в рейтинг.</p></div><button type="button" onClick={() => setAuthOpen(true)}>Создать аккаунт <ArrowRight size={16} /></button></div>}
        </>}

        {page === 'practice' && <>
          <div className="page-heading"><div><span className="eyebrow">ЗОНА ФОКУСА / 01</span><h1>Тренировка</h1><p>Смотри на текст. Клавиатуру подскажем мы.</p></div><button type="button" className="button button-secondary" onClick={() => begin()}><RotateCcw size={17} /> Новый текст</button></div>
          <div className="practice-controls"><div className="control-group"><span className="control-label">РЕЖИМ</span><div className="segmented">{modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? 'selected' : ''} onClick={() => begin(item.id, item.id === 'code' ? 'en' : language, difficulty)}>{item.title}</button>)}</div></div><div className="control-group"><span className="control-label">ЯЗЫК</span><div className="segmented"><button type="button" className={language === 'ru' ? 'selected' : ''} disabled={mode === 'code'} title={mode === 'code' ? 'Режим кода использует латинскую раскладку' : undefined} onClick={() => begin(mode, 'ru', difficulty)}>RU</button><button type="button" className={language === 'en' ? 'selected' : ''} onClick={() => begin(mode, 'en', difficulty)}>EN</button></div></div><div className="control-group"><span className="control-label">СЛОЖНОСТЬ</span><div className="segmented">{([1, 2, 3] as Difficulty[]).map((value) => <button key={value} type="button" className={difficulty === value ? 'selected' : ''} onClick={() => begin(mode, language, value)}>{value}</button>)}</div></div></div>
          <div className="practice-grid"><div><div className="typing-card"><div className="typing-topline"><div><span className="live-indicator"><span />{run.finishedAt ? 'ЗАВЕРШЕНО' : run.startedAt ? 'СЕССИЯ ИДЁТ' : 'ГОТОВ К СТАРТУ'}</span><span className="typing-label">{run.label}</span></div><div className="typing-count">{run.index.toString().padStart(2, '0')} <span>/ {run.text.length}</span></div></div><div className="typing-progress"><span style={{ width: `${run.index / run.text.length * 100}%` }} /></div><div className={`typing-text ${run.lastHit === 'error' ? 'typing-error' : ''}`} aria-label="Текст упражнения">{Array.from(run.text).map((char, index) => <span key={index} className={index < run.index ? 'typed' : index === run.index ? 'current' : 'pending'}>{char === '\n' ? <>&#8629;<br /></> : char}</span>)}</div><div className="type-input-wrap"><Keyboard size={19} /><textarea ref={inputRef} aria-label="Поле ввода текста упражнения" value="" onChange={(event) => handleInput(event.currentTarget.value)} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); inputRef.current?.focus() } }} placeholder={run.finishedAt ? 'Упражнение завершено' : 'Нажми сюда и начинай печатать…'} rows={1} disabled={Boolean(run.finishedAt)} /><span className="input-focus-hint">{run.startedAt ? 'ПЕЧАТАЙ ДАЛЬШЕ' : 'НАЧНИ ЗДЕСЬ'}</span></div><div className="typing-foot"><span><CheckCircle2 size={15} /> Неверная клавиша не продвигает текст</span><button type="button" className="sound-button" onClick={() => { localStorage.setItem('hero-sound', sound ? 'off' : 'on'); setSound(!sound) }}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Звук {sound ? 'вкл.' : 'выкл.'}</button></div></div><KeyboardGuide language={language} nextChar={nextChar} /></div><div className="training-side"><div className="live-stats"><span className="eyebrow">В ПРЯМОМ ЭФИРЕ</span><h3>Твой ритм<span className="pulse-dot" /></h3><div className="live-number">{measure.wpm}<small>WPM</small></div><div className="metric-row"><span>Символов / мин</span><strong>{measure.cpm}</strong></div><div className="metric-row"><span>Точность</span><strong>{measure.accuracy}%</strong></div><div className="metric-row"><span>Ошибки</span><strong className={run.errors ? 'danger-text' : ''}>{run.errors}</strong></div><div className="metric-row"><span>Время</span><strong>{Math.floor(measure.elapsedMs / 60000).toString().padStart(2, '0')}:{Math.floor(measure.elapsedMs / 1000 % 60).toString().padStart(2, '0')}</strong></div></div><div className="combo-card"><div className="combo-header"><Flame size={20} /><span>СЕРИЯ БЕЗ ОШИБОК</span></div><strong>{run.combo}<small> COMBO</small></strong><div className="combo-bottom">МНОЖИТЕЛЬ <b>×{multiplier(run.combo)}</b></div>{activeBonus && <div className="bonus-chip"><Sparkles size={14} /> БОНУС ×2 ОЧКА</div>}</div><div className="hint-card"><span className="eyebrow">ПОДСКАЗКА</span><p>Следующий символ: <strong>{prettyChar(nextChar)}</strong></p><small>Нажимай: {fingerForChar(nextChar, language)}</small></div></div></div>
          {run.finishedAt && <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-modal"><div className="result-top"><span className="eyebrow"><Sparkles size={15} /> ТРЕНИРОВКА ЗАВЕРШЕНА</span><button type="button" className="icon-button" onClick={() => setPage('overview')} aria-label="Закрыть результат"><X size={18} /></button></div><div className="result-symbol"><Check size={35} /></div><h2 id="result-title">Отличная работа.</h2><p>Каждая строка приближает тебя к свободной печати.</p><div className="result-stats"><div><strong>{measure.wpm}</strong><span>WPM</span></div><div><strong>{measure.accuracy}%</strong><span>ТОЧНОСТЬ</span></div><div><strong>{run.points}</strong><span>ОЧКИ</span></div></div><div className="result-xp"><Sparkles size={17} /> {result ? `+${result.xp} XP` : 'Сохраняем результат…'}{result?.unlocked.length ? <span>· Новое достижение!</span> : null}</div>{result?.error && <p className="form-error">{result.error}</p>}<div className="result-actions"><button type="button" className="button button-primary" onClick={() => begin()}>Ещё раз <ArrowRight size={17} /></button><button type="button" className="button button-secondary" onClick={() => setPage('progress')}>Посмотреть прогресс</button></div></div></div>}
        </>}

        {page === 'progress' && <><div className="page-heading"><div><span className="eyebrow">РАСТИ КАЖДЫЙ ДЕНЬ / 02</span><h1>Прогресс</h1><p>Посмотри, как меняется твой темп.</p></div><button type="button" className="button button-primary" onClick={() => begin()}><Keyboard size={17} /> Тренироваться</button></div><div className="stats-grid"><StatCard label="СЕССИЙ" value={computedProgress.summary.sessions} icon={Activity} /><StatCard label="ВРЕМЯ В ПРАКТИКЕ" value={Math.round(computedProgress.summary.total_ms / 60000)} suffix="МИН" icon={Target} /><StatCard label="ЛУЧШИЙ РЕЗУЛЬТАТ" value={Math.round(computedProgress.summary.best_wpm)} suffix="WPM" icon={Flame} /><StatCard label="НАПЕЧАТАНО" value={computedProgress.summary.total_chars} icon={Type} /></div><div className="progress-layout"><div className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">ДИНАМИКА</span><h2>Скорость печати</h2></div><span className="chart-unit">WPM / ПОСЛЕДНИЕ 10 СЕССИЙ</span></div>{recent.length ? <div className="chart"><div className="chart-grid"><span>100</span><span>75</span><span>50</span><span>25</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="График скорости"><polyline points={chartPoints(recent)} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg></div> : <div className="empty-chart"><BarChart3 size={32} /><strong>Первый график ждёт тебя</strong><p>Заверши тренировку, чтобы увидеть динамику.</p></div>}</div><div className="panel weak-panel"><span className="eyebrow">ЗОНА РОСТА</span><h2>Сложные символы</h2><p>Обрати внимание на эти клавиши в следующей тренировке.</p>{Object.entries(computedProgress.mistakes).length ? <div className="weak-list">{Object.entries(computedProgress.mistakes).map(([char, count]) => <div key={char}><span className="weak-char">{prettyChar(char)}</span><div className="weak-track"><span style={{ width: `${Math.min(100, count / Math.max(...Object.values(computedProgress.mistakes)) * 100)}%` }} /></div><strong>{count}</strong></div>)}</div> : <div className="empty-weak">Пока нет ошибок. Так держать!</div>}</div></div><div className="section-heading history-heading"><div><span className="eyebrow">ИСТОРИЯ</span><h2>Последние тренировки</h2></div><span className="section-subtle">{recent.length} ЗАПИСЕЙ</span></div><div className="history-list">{recent.length ? recent.slice(0, 8).map((session) => <div className="history-row" key={session.id}><div className="history-mode">{session.mode === 'code' ? <Code2 size={18} /> : <Keyboard size={18} />}</div><div className="history-name"><strong>{modeName[session.mode]}</strong><small>{new Date(session.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} · {session.language.toUpperCase()}</small></div><div className="history-metrics"><span><b>{Math.round(session.wpm)}</b> WPM</span><span><b>{Math.round(session.accuracy)}%</b> точность</span><strong>+{session.xp_earned} XP</strong></div></div>) : <div className="empty-list">Тренировок ещё нет. Начни с короткой серии слов.</div>}</div></>}

        {page === 'leaderboard' && <><div className="page-heading"><div><span className="eyebrow">ЛУЧШИЕ ИЗ ЛУЧШИХ / 03</span><h1>Рейтинг</h1><p>Сравни свой результат с другими героями печати.</p></div><div className="leaderboard-icon"><Trophy size={28} /></div></div><div className="board-controls"><div className="segmented">{([['wpm', 'Скорость'], ['accuracy', 'Точность'], ['xp', 'Опыт']] as const).map(([value, label]) => <button key={value} type="button" className={boardMetric === value ? 'selected' : ''} onClick={() => setBoardMetric(value)}>{label}</button>)}</div><div className="segmented">{([['today', 'Сегодня'], ['week', 'Неделя'], ['all', 'Всё время']] as const).map(([value, label]) => <button key={value} type="button" className={boardPeriod === value ? 'selected' : ''} onClick={() => setBoardPeriod(value)}>{label}</button>)}</div></div><div className="board-panel"><div className="board-header"><span>МЕСТО / УЧАСТНИК</span><span>{boardMetric === 'wpm' ? 'СКОРОСТЬ' : boardMetric === 'accuracy' ? 'ТОЧНОСТЬ' : 'ОПЫТ'}</span></div>{leaderboard?.rows.length ? leaderboard.rows.map((entry, index) => <div className={`board-row ${entry.id === user?.id ? 'board-me' : ''}`} key={entry.id}><div className="board-person"><span className={`rank rank-${index + 1}`}>{index === 0 ? <Crown size={20} /> : (index + 1).toString().padStart(2, '0')}</span><span className="board-avatar">{entry.name.slice(0, 1).toUpperCase()}</span><span><strong>{entry.name}{entry.id === user?.id ? ' · ты' : ''}</strong><small>{entry.sessions} тренировок</small></span></div><strong className="board-score">{boardMetric === 'accuracy' ? `${Math.round(entry.value)}%` : Math.round(entry.value)} <small>{boardMetric === 'wpm' ? 'WPM' : boardMetric === 'xp' ? 'XP' : ''}</small></strong></div>) : <div className="board-empty"><Medal size={36} /><h3>{serviceOnline ? 'Рейтинг пока пуст' : 'Рейтинг сейчас недоступен'}</h3><p>{serviceOnline ? 'Заверши тренировку в аккаунте и займи первое место.' : 'Для общего рейтинга нужно запустить API.'}</p><button type="button" className="button button-primary" onClick={() => user ? begin() : setAuthOpen(true)}>{user ? 'Начать тренировку' : 'Создать аккаунт'} <ArrowRight size={16} /></button></div>}</div><div className="board-note"><Globe2 size={17} /> В рейтинг попадают тренировки от 25 символов и 15 секунд. Периоды считаются по UTC.</div></>}

        {page === 'awards' && <><div className="page-heading"><div><span className="eyebrow">МАЛЕНЬКИЕ ПОБЕДЫ / 04</span><h1>Достижения</h1><p>Каждый знак на этой странице — результат практики.</p></div><div className="awards-count"><Award size={22} /><strong>{earned.size} / {achievementInfo.length}</strong><span>ОТКРЫТО</span></div></div><div className="awards-grid">{achievementInfo.map((achievement) => { const unlocked = earned.has(achievement.key); return <div className={`award-card ${unlocked ? 'unlocked' : ''}`} key={achievement.key}><div className="award-top"><span>{achievement.mark} / 06</span>{unlocked ? <CheckCircle2 size={18} /> : <LockKeyhole size={16} />}</div><div className="award-mark"><Award size={33} strokeWidth={1.35} /></div><h3>{achievement.name}</h3><p>{achievement.description}</p><span className="award-status">{unlocked ? 'ПОЛУЧЕНО' : 'ЕЩЁ ВПЕРЕДИ'}</span></div> })}</div></>}
      </main>
      <footer className="footer"><span>ПЕЧАТЬ ГЕРОЯ © 2026</span><span>ТОЧНОСТЬ → СКОРОСТЬ → МАСТЕРСТВО</span></footer>
    </div>
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSignedIn={(signedIn) => { setUser(signedIn); api.progress().then(setServerProgress).catch(() => {}) }} user={user} onLogout={logout} />}
  </div>
}
