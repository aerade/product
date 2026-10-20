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
  keySound: boolean
  typingSound: boolean
  completionSound: boolean
  achievementSound: boolean
  soundPack: 'soft' | 'arcade' | 'synth'
  soundVolume: number
  visualIntensity: 'off' | 'subtle' | 'full'
  comboPulse: boolean
  completionBurst: boolean
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
  theme: 'dark', custom: { background: '#090a0c', surface: '#151819', accent: '#f4f4f4', text: '#f6f7f5', border: '#343a37' },
  font: 'manrope', compact: false, colorfulIcons: false, iconHue: 100,
  navStyle: 'labels', navPosition: 'left', radius: 14, borderWidth: 1, borderColor: 'theme', rainbowBorder: false,
  animations: true, animationStyle: 'smooth', animationSpeed: 1,
  buttonSound: 'off', keySound: false, typingSound: true, completionSound: true,
  achievementSound: true, soundPack: 'soft', soundVolume: 45,
  visualIntensity: 'full', comboPulse: true, completionBurst: true,
  showKeyboard: true, showFinger: true, showStats: true, showCombo: true,
  focusMode: false, textSize: 22, caretStyle: 'block', autoFocus: true,
  defaultMode: 'words', defaultLanguage: 'ru', defaultDifficulty: 1, dailyGoal: 3, startPage: 'overview',
}

export const themes: { id: Theme; name: string; swatch: string; surface: string; ink: string; group: 'neutral' | 'color' | 'custom' }[] = [
  { id: 'dark', name: 'Чёрно-белая', swatch: '#f3f3f3', surface: '#17191b', ink: '#f5f5f5', group: 'neutral' },
  { id: 'blue', name: 'Синяя', swatch: '#6db5e6', surface: '#111c27', ink: '#f6f7f5', group: 'color' },
  { id: 'purple', name: 'Фиолетовая', swatch: '#bda4ec', surface: '#1a1525', ink: '#f6f7f5', group: 'color' },
  { id: 'red', name: 'Красная', swatch: '#eb7479', surface: '#211619', ink: '#f6f7f5', group: 'color' },
  { id: 'orange', name: 'Оранжевая', swatch: '#dfae83', surface: '#211915', ink: '#f6f7f5', group: 'color' },
  { id: 'pink', name: 'Розовая', swatch: '#dba5be', surface: '#241920', ink: '#f6f7f5', group: 'color' },
  { id: 'sakura', name: 'Сакура', swatch: '#eadfe3', surface: '#261f22', ink: '#f6f7f5', group: 'color' },
  { id: 'green', name: 'Зелёная', swatch: '#73d59d', surface: '#122019', ink: '#f6f7f5', group: 'color' },
  { id: 'teal', name: 'Бирюзовая', swatch: '#6cd0ca', surface: '#142321', ink: '#f6f7f5', group: 'color' },
  { id: 'cyan', name: 'Циановая', swatch: '#65c6df', surface: '#12212a', ink: '#f6f7f5', group: 'color' },
  { id: 'yellow', name: 'Жёлтая', swatch: '#f2cf69', surface: '#211e15', ink: '#f6f7f5', group: 'color' },
  { id: 'indigo', name: 'Индиго', swatch: '#9ba7ef', surface: '#191d2c', ink: '#f6f7f5', group: 'color' },
  { id: 'light', name: 'Светлая', swatch: '#252a28', surface: '#ffffff', ink: '#202522', group: 'neutral' },
  { id: 'custom', name: 'Своя', swatch: '#a9bbc3', surface: '#1a2024', ink: '#f5f5f5', group: 'custom' },
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
  root.dataset.visualIntensity = settings.visualIntensity
  root.dataset.comboPulse = String(settings.comboPulse)
  root.dataset.completionBurst = String(settings.completionBurst)
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
