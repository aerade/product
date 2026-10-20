import { useEffect, useState, type ReactNode } from 'react'
import { Check, Keyboard, Palette, RotateCcw, UserRound, X } from 'lucide-react'
import type { User } from './api'
import { difficultyInfo, modes, type Difficulty, type Language, type Mode } from './data'
import { defaultSettings, themes, type Settings } from './settings'

type Section = 'appearance' | 'practice' | 'profile'
type Props = {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  user: User | null
  avatar: number
  onAvatar: (avatar: number) => Promise<void> | void
  onName: (name: string) => Promise<void>
  onAuth: () => void
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="setting-row"><div><strong>{label}</strong>{hint && <small>{hint}</small>}</div><div className="setting-control">{children}</div></div>
}

function Switch({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={value} className={`setting-switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)}><span /></button>
}

function AvatarGrid({ selected, onSelect }: { selected: number; onSelect: (avatar: number) => void }) {
  return <div className="avatar-grid">{Array.from({ length: 10 }, (_, index) => index + 1).map((avatar) => <button type="button" key={avatar} className={`avatar-option ${selected === avatar ? 'selected' : ''}`} onClick={() => onSelect(avatar)} aria-label={`Аватар ${avatar}`} aria-pressed={selected === avatar}><img src={`/avatars/forest-${String(avatar).padStart(2, '0')}.png`} alt="" loading="lazy" />{selected === avatar && <Check size={15} />}</button>)}</div>
}

function ThemeCard({ theme, selected, onSelect }: { theme: (typeof themes)[number]; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`theme-card ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
    <span className="theme-preview" style={{ backgroundColor: theme.surface, color: theme.ink }}>
      <span className="theme-preview-rail"><i /><i /><i /></span>
      <span className="theme-preview-page"><i className="theme-preview-title" style={{ backgroundColor: theme.ink }} /><i className="theme-preview-action" style={{ backgroundColor: theme.swatch }} /><span><i /><i /></span></span>
    </span>
    <span className="theme-card-caption"><i style={{ backgroundColor: theme.swatch }} />{theme.name}{selected && <Check size={15} />}</span>
  </button>
}

export default function SettingsModal({ settings, onChange, onClose, user, avatar, onAvatar, onName, onAuth }: Props) {
  const [section, setSection] = useState<Section>('appearance')
  const [name, setName] = useState(user?.name ?? '')
  const [nameError, setNameError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [savingName, setSavingName] = useState(false)
  useEffect(() => setName(user?.name ?? ''), [user?.name])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [onClose])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) { onChange({ ...settings, [key]: value }) }
  async function saveName() {
    setNameError(''); setSavingName(true)
    try { await onName(name.trim()) } catch (error) { setNameError(error instanceof Error ? error.message : 'Не удалось сохранить имя') }
    finally { setSavingName(false) }
  }
  async function chooseAvatar(value: number) {
    setAvatarError('')
    try { await onAvatar(value) } catch (error) { setAvatarError(error instanceof Error ? error.message : 'Не удалось сохранить аватар') }
  }

  return <div className="modal-backdrop settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header className="settings-header"><div><h2 id="settings-title">Настройки</h2><p>Изменения сохраняются на этом устройстве.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть настройки"><X size={18} /></button></header>
      <div className="settings-body"><nav className="settings-nav" aria-label="Разделы настроек">
        {([['appearance', Palette, 'Внешний вид'], ['practice', Keyboard, 'Тренировка'], ['profile', UserRound, 'Профиль']] as const).map(([id, Icon, label]) => <button type="button" key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><Icon size={17} /><span>{label}</span></button>)}
      </nav><div className="settings-content">
        {section === 'appearance' && <>
          <h3>Внешний вид</h3>
          <div className="setting-block theme-picker"><h4>Тема</h4><p className="theme-picker-hint">Выберите оформление по миниатюре. Цвета применяются сразу.</p>
            {(['neutral', 'color', 'custom'] as const).map((group) => <div className="theme-group" key={group}><h5>{group === 'neutral' ? 'Базовые' : group === 'color' ? 'Цветные' : 'Своя палитра'}</h5><div className="theme-grid">{themes.filter((theme) => theme.group === group).map((theme) => <ThemeCard key={theme.id} theme={theme} selected={settings.theme === theme.id} onSelect={() => update('theme', theme.id)} />)}</div></div>)}
            {settings.theme === 'custom' && <div className="custom-color-grid">{([['background', 'Фон'], ['surface', 'Карточки'], ['accent', 'Акцент'], ['text', 'Текст'], ['border', 'Рамки']] as const).map(([key, label]) => <label key={key}>{label}<input type="color" value={settings.custom[key]} onChange={(event) => update('custom', { ...settings.custom, [key]: event.target.value })} /></label>)}</div>}
          </div>
          <div className="setting-block"><h4>Интерфейс</h4>
            <Row label="Шрифт"><select value={settings.font} onChange={(event) => update('font', event.target.value as Settings['font'])}><option value="manrope">Manrope</option><option value="system">Системный</option><option value="mono">Моноширинный</option></select></Row>
            <Row label="Компактный вид"><Switch label="Компактный вид" value={settings.compact} onChange={(value) => update('compact', value)} /></Row>
            <Row label="Цветные иконки"><Switch label="Цветные иконки" value={settings.colorfulIcons} onChange={(value) => update('colorfulIcons', value)} /></Row>
            {settings.colorfulIcons && <Row label="Оттенок иконок"><input aria-label="Оттенок иконок" type="range" min="0" max="360" value={settings.iconHue} onChange={(event) => update('iconHue', Number(event.target.value))} /><span>{settings.iconHue}°</span></Row>}
            <Row label="Навигация"><select value={settings.navStyle} onChange={(event) => update('navStyle', event.target.value as Settings['navStyle'])}><option value="labels">Иконки и подписи</option><option value="icons">Только иконки</option></select></Row>
            <Row label="Расположение"><select value={settings.navPosition} onChange={(event) => update('navPosition', event.target.value as Settings['navPosition'])}><option value="left">Слева</option><option value="top">Сверху</option><option value="bottom">Снизу</option></select></Row>
            <Row label="Скругление"><input aria-label="Скругление" type="range" min="0" max="24" value={settings.radius} onChange={(event) => update('radius', Number(event.target.value))} /><span>{settings.radius}px</span></Row>
            <Row label="Толщина рамок"><input aria-label="Толщина рамок" type="range" min="0" max="3" step="0.5" value={settings.borderWidth} onChange={(event) => update('borderWidth', Number(event.target.value))} /><span>{settings.borderWidth}px</span></Row>
            <Row label="Цвет рамок"><select value={settings.borderColor} onChange={(event) => update('borderColor', event.target.value as Settings['borderColor'])}><option value="theme">По теме</option><option value="red">Красный</option><option value="blue">Синий</option><option value="green">Зелёный</option><option value="gold">Золотой</option></select></Row>
            <Row label="Радужная рамка"><Switch label="Радужная рамка" value={settings.rainbowBorder} onChange={(value) => update('rainbowBorder', value)} /></Row>
          </div>
          <div className="setting-block"><h4>Движение и звук</h4>
            <Row label="Анимации"><Switch label="Анимации" value={settings.animations} onChange={(value) => update('animations', value)} /></Row>
            <Row label="Визуальные эффекты"><select value={settings.visualIntensity} onChange={(event) => update('visualIntensity', event.target.value as Settings['visualIntensity'])}><option value="off">Выкл.</option><option value="subtle">Умеренные</option><option value="full">Яркие</option></select></Row>
            <Row label="Подсветка серии"><Switch label="Подсветка серии" value={settings.comboPulse} onChange={(value) => update('comboPulse', value)} /></Row>
            <Row label="Эффект завершения"><Switch label="Эффект завершения" value={settings.completionBurst} onChange={(value) => update('completionBurst', value)} /></Row>
            <Row label="Стиль анимации"><select disabled={!settings.animations} value={settings.animationStyle} onChange={(event) => update('animationStyle', event.target.value as Settings['animationStyle'])}><option value="smooth">Плавный</option><option value="spring">Пружина</option><option value="slide">Сдвиг</option><option value="snappy">Быстрый</option><option value="minimal">Минимальный</option></select></Row>
            <Row label="Скорость"><input aria-label="Скорость анимации" disabled={!settings.animations} type="range" min="0.5" max="2" step="0.1" value={settings.animationSpeed} onChange={(event) => update('animationSpeed', Number(event.target.value))} /><span>{settings.animationSpeed.toFixed(1)}×</span></Row>
            <Row label="Звук кнопок"><select value={settings.buttonSound} onChange={(event) => update('buttonSound', event.target.value as Settings['buttonSound'])}><option value="off">Выкл.</option><option value="soft">Мягкий</option><option value="click">Щелчок</option></select></Row>
            <Row label="Звуковой набор"><select value={settings.soundPack} onChange={(event) => update('soundPack', event.target.value as Settings['soundPack'])}><option value="soft">Мягкий</option><option value="arcade">Аркада</option><option value="synth">Синтезатор</option></select></Row>
            <Row label="Громкость"><input aria-label="Громкость" type="range" min="0" max="100" value={settings.soundVolume} onChange={(event) => update('soundVolume', Number(event.target.value))} /><span>{settings.soundVolume}%</span></Row>
            <Row label="Звук достижений"><Switch label="Звук достижений" value={settings.achievementSound} onChange={(value) => update('achievementSound', value)} /></Row>
          </div>
        </>}
        {section === 'practice' && <>
          <h3>Тренировка</h3>
          <div className="setting-block"><h4>При запуске</h4>
            <Row label="Стартовая страница"><select value={settings.startPage} onChange={(event) => update('startPage', event.target.value as Settings['startPage'])}><option value="overview">Главная</option><option value="practice">Тренировка</option><option value="progress">Прогресс</option><option value="leaderboard">Рейтинг</option><option value="awards">Достижения</option></select></Row>
            <Row label="Режим"><select value={settings.defaultMode} onChange={(event) => update('defaultMode', event.target.value as Mode)}>{modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.title}</option>)}</select></Row>
            <Row label="Язык"><select value={settings.defaultLanguage} onChange={(event) => update('defaultLanguage', event.target.value as Language)}><option value="ru">Русский</option><option value="en">Английский</option></select></Row>
            <Row label="Сложность"><select value={settings.defaultDifficulty} onChange={(event) => update('defaultDifficulty', Number(event.target.value) as Difficulty)}>{difficultyInfo.map((item) => <option key={item.level} value={item.level}>{item.level}. {item.name}</option>)}</select></Row>
            <Row label="Цель на день" hint="Количество тренировок"><input aria-label="Цель на день" type="number" min="1" max="30" value={settings.dailyGoal} onChange={(event) => update('dailyGoal', Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></Row>
          </div>
          <div className="setting-block"><h4>Во время набора</h4>
            <Row label="Виртуальная клавиатура"><Switch label="Виртуальная клавиатура" value={settings.showKeyboard} onChange={(value) => update('showKeyboard', value)} /></Row>
            <Row label="Подсказка пальца"><Switch label="Подсказка пальца" value={settings.showFinger} onChange={(value) => update('showFinger', value)} /></Row>
            <Row label="Показатели скорости"><Switch label="Показатели скорости" value={settings.showStats} onChange={(value) => update('showStats', value)} /></Row>
            <Row label="Серия и очки"><Switch label="Серия и очки" value={settings.showCombo} onChange={(value) => update('showCombo', value)} /></Row>
            <Row label="Режим фокуса" hint="Скрывает лишние панели"><Switch label="Режим фокуса" value={settings.focusMode} onChange={(value) => update('focusMode', value)} /></Row>
            <Row label="Размер текста"><input aria-label="Размер текста" type="range" min="16" max="34" value={settings.textSize} onChange={(event) => update('textSize', Number(event.target.value))} /><span>{settings.textSize}px</span></Row>
            <Row label="Текущий символ"><select value={settings.caretStyle} onChange={(event) => update('caretStyle', event.target.value as Settings['caretStyle'])}><option value="block">Заливка</option><option value="underline">Подчёркивание</option><option value="outline">Рамка</option></select></Row>
            <Row label="Фокус на поле ввода"><Switch label="Фокус на поле ввода" value={settings.autoFocus} onChange={(value) => update('autoFocus', value)} /></Row>
            <Row label="Звук каждой клавиши"><Switch label="Звук каждой клавиши" value={settings.keySound} onChange={(value) => update('keySound', value)} /></Row>
            <Row label="Сигналы набора" hint="Ошибки и серия из 10 символов"><Switch label="Сигналы набора" value={settings.typingSound} onChange={(value) => update('typingSound', value)} /></Row>
            <Row label="Звук завершения"><Switch label="Звук завершения" value={settings.completionSound} onChange={(value) => update('completionSound', value)} /></Row>
          </div>
        </>}
        {section === 'profile' && <>
          <h3>Профиль</h3>
          <div className="setting-block"><h4>Аватар</h4><AvatarGrid selected={avatar} onSelect={chooseAvatar} />{avatarError && <p className="form-error">{avatarError}</p>}</div>
          <div className="setting-block"><h4>Аккаунт</h4>{user ? <><Row label="Имя"><input aria-label="Имя профиля" type="text" minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></Row><Row label="Email"><span>{user.email}</span></Row><button className="button button-secondary" type="button" disabled={savingName || name.trim().length < 2 || name.trim() === user.name} onClick={saveName}>Сохранить имя</button>{nameError && <p className="form-error">{nameError}</p>}</> : <><p className="setting-help">Гостевой аватар хранится в этом браузере. Для синхронизации профиля войдите в аккаунт.</p><button type="button" className="button button-secondary" onClick={onAuth}>Войти в аккаунт</button></>}</div>
        </>}
      </div></div>
      <footer className="settings-footer"><span>Настройки этого браузера</span><button type="button" onClick={() => { onChange(defaultSettings); setSection('appearance') }}><RotateCcw size={15} /> Сбросить</button></footer>
    </div>
  </div>
}
