import type { Difficulty, Language, Mode } from './data'

export type Theme = 'dark' | 'blue' | 'purple' | 'red' | 'orange' | 'pink' | 'sakura' | 'green' | 'teal' | 'cyan' | 'yellow' | 'indigo' | 'light' | 'custom'
export type Settings = {
  theme: Theme
  custom: { background: string; surface: string; accent: string; text: string; border: string }
  font: 'manrope' | 'system' | 'mono'
  compact: boolean
  colorfulIcons: boolean
  iconHue: number
  navStyle: 'labels' | 'icons'
  navPosition: 'left' | 'top' | 'bottom'
  radius: number
  borderWidth: number
  borderColor: 'theme' | 'red' | 'blue' | 'green' | 'gold'
  rainbowBorder: boolean
  animations: boolean
  animationStyle: 'smooth' | 'spring' | 'slide' | 'snappy' | 'minimal'
  animationSpeed: number
  buttonSound: 'off' | 'soft' | 'click'
  typingSound: boolean
  completionSound: boolean
  showKeyboard: boolean
  showFinger: boolean
  showStats: boolean
  showCombo: boolean
  focusMode: boolean
  textSize: number
  caretStyle: 'block' | 'underline' | 'outline'
  autoFocus: boolean
  defaultMode: Mode
  defaultLanguage: Language
  defaultDifficulty: Difficulty
  dailyGoal: number
  startPage: 'overview' | 'practice' | 'progress' | 'leaderboard' | 'awards'
}

export const defaultSettings: Settings = {
  theme: 'dark', custom: { background: '#090a0c', surface: '#151819', accent: '#d5f1a0', text: '#f6f7f5', border: '#343a37' },
  font: 'manrope', compact: false, colorfulIcons: false, iconHue: 100,
  navStyle: 'labels', navPosition: 'left', radius: 14, borderWidth: 1, borderColor: 'theme', rainbowBorder: false,
  animations: true, animationStyle: 'smooth', animationSpeed: 1,
  buttonSound: 'off', typingSound: true, completionSound: true,
  showKeyboard: true, showFinger: true, showStats: true, showCombo: true,
  focusMode: false, textSize: 22, caretStyle: 'block', autoFocus: true,
  defaultMode: 'words', defaultLanguage: 'ru', defaultDifficulty: 1, dailyGoal: 3, startPage: 'overview',
}

export const themes: { id: Theme; name: string; swatch: string }[] = [
  { id: 'dark', name: 'Тёмная', swatch: '#d5f1a0' },
  { id: 'blue', name: 'Синяя', swatch: '#6db5e6' },
  { id: 'purple', name: 'Фиолетовая', swatch: '#bda4ec' },
  { id: 'red', name: 'Красная', swatch: '#eb7479' },
  { id: 'orange', name: 'Оранжевая', swatch: '#dfae83' },
  { id: 'pink', name: 'Розовая', swatch: '#dba5be' },
  { id: 'sakura', name: 'Сакура', swatch: '#eadfe3' },
  { id: 'green', name: 'Зелёная', swatch: '#73d59d' },
  { id: 'teal', name: 'Бирюзовая', swatch: '#6cd0ca' },
  { id: 'cyan', name: 'Циановая', swatch: '#65c6df' },
  { id: 'yellow', name: 'Жёлтая', swatch: '#f2cf69' },
  { id: 'indigo', name: 'Индиго', swatch: '#9ba7ef' },
  { id: 'light', name: 'Светлая', swatch: '#f2f1ee' },
  { id: 'custom', name: 'Своя', swatch: '#a9bbc3' },
]

const key = 'real-typing-settings-v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>
      return { ...defaultSettings, ...saved, custom: { ...defaultSettings.custom, ...saved.custom } }
    }
  } catch { /* storage may be unavailable */ }
  return defaultSettings
}

export function saveSettings(settings: Settings) {
  try { localStorage.setItem(key, JSON.stringify(settings)) } catch { /* local use still works */ }
}

export function applySettings(settings: Settings) {
  const root = document.documentElement
  root.dataset.theme = settings.theme
  root.dataset.font = settings.font
  root.dataset.compact = String(settings.compact)
  root.dataset.colorfulIcons = String(settings.colorfulIcons)
  root.dataset.navStyle = settings.navStyle
  root.dataset.navPosition = settings.navPosition
  root.dataset.rainbowBorder = String(settings.rainbowBorder)
  root.dataset.animations = String(settings.animations)
  root.dataset.animationStyle = settings.animationStyle
  root.style.setProperty('--ui-radius', `${settings.radius}px`)
  root.style.setProperty('--ui-border-width', `${settings.borderWidth}px`)
  root.style.setProperty('--ui-animation-speed', String(settings.animationSpeed))
  root.style.setProperty('--ui-icon-hue', `${settings.iconHue}deg`)
  root.style.setProperty('--typing-text-size', `${settings.textSize}px`)
  if (settings.theme === 'custom') {
    root.style.setProperty('--bg', settings.custom.background)
    root.style.setProperty('--surface', settings.custom.surface)
    root.style.setProperty('--surface2', settings.custom.surface)
    root.style.setProperty('--lime', settings.custom.accent)
    root.style.setProperty('--white', settings.custom.text)
    root.style.setProperty('--line', settings.custom.border)
  } else {
    for (const variable of ['--bg', '--surface', '--surface2', '--lime', '--white', '--line']) root.style.removeProperty(variable)
  }
  const borderColors = { red: '#d95555', blue: '#4da3d9', green: '#4db879', gold: '#d0a34c' }
  if (settings.borderColor !== 'theme') root.style.setProperty('--line', borderColors[settings.borderColor])
}
