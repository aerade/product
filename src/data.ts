export type Mode = 'words' | 'sentences' | 'code' | 'symbols'
export type Language = 'ru' | 'en'
export type Difficulty = 1 | 2 | 3

export const modes: { id: Mode; title: string; subtitle: string; icon: string }[] = [
  { id: 'words', title: 'Слова', subtitle: 'Найди свой ритм', icon: '01' },
  { id: 'sentences', title: 'Предложения', subtitle: 'Держи темп дольше', icon: '02' },
  { id: 'code', title: 'Код', subtitle: 'Точность в деталях', icon: '03' },
  { id: 'symbols', title: 'Символы', subtitle: 'Полный контроль', icon: '04' },
]

const words = {
  ru: [
    'мир', 'дом', 'код', 'луч', 'ритм', 'книга', 'экран', 'палец', 'скорость', 'точность',
    'движение', 'привычка', 'развитие', 'клавиша', 'печать', 'герой', 'слово', 'старт',
    'победа', 'уровень', 'время', 'сила', 'путь', 'фокус', 'работа', 'память', 'задача',
    'команда', 'практика', 'система', 'минута', 'навык', 'ошибка', 'результат',
  ],
  en: [
    'go', 'up', 'run', 'code', 'type', 'focus', 'learn', 'speed', 'skill', 'level',
    'screen', 'finger', 'rhythm', 'motion', 'practice', 'balance', 'streak', 'result',
    'keyboard', 'accuracy', 'system', 'project', 'future', 'bright', 'moment',
  ],
}

const sentences = {
  ru: [
    'Каждая тренировка делает движения увереннее.',
    'Скорость приходит тогда, когда руки знают дорогу.',
    'Смотри на экран и доверяй памяти пальцев.',
    'Одна точная строка лучше десятка поспешных.',
    'Новый рекорд начинается с первого символа.',
    'Ошибки помогают заметить, над чем стоит поработать.',
  ],
  en: [
    'Small steps build a strong typing habit.',
    'Keep your eyes on the screen and trust your hands.',
    'Accuracy comes first, and speed will follow.',
    'Every clean line brings a new personal best.',
    'Practice a little every day to find your rhythm.',
  ],
}

const snippets = [
  { language: 'Python', text: 'def greet(name):\n    return f"Hello, {name}!"' },
  { language: 'JavaScript', text: 'const square = (n) => n * n;\nconsole.log(square(5));' },
  { language: 'HTML', text: '<main class="hero">\n  <h1>Hello, world!</h1>\n</main>' },
  { language: 'CSS', text: '.hero {\n  display: grid;\n  gap: 16px;\n}' },
]

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export function makeExercise(mode: Mode, language: Language, difficulty: Difficulty) {
  if (mode === 'words') {
    const count = 9 + difficulty * 4
    const pool = words[language].filter((word) => difficulty > 1 || word.length <= 7)
    return { text: Array.from({ length: count }, () => pick(pool)).join(' '), label: 'Случайные слова' }
  }
  if (mode === 'sentences') {
    const count = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4
    return { text: Array.from({ length: count }, () => pick(sentences[language])).join(' '), label: 'Связный текст' }
  }
  if (mode === 'code') {
    const snippet = pick(snippets)
    return { text: difficulty === 1 ? snippet.text : `${snippet.text}\n${pick(snippets).text}`, label: snippet.language }
  }
  const alphabet = language === 'ru' ? 'абвгдежзиклмнопрстуфхцчшщыэюя' : 'abcdefghijklmnopqrstuvwxyz'
  const characters = `${alphabet}0123456789!@#$%&*+-=?/`
  const count = 36 + difficulty * 16
  const chunks = Array.from({ length: Math.ceil(count / 8) }, () =>
    Array.from({ length: 8 }, () => pick(characters.split(''))).join(''),
  )
  return { text: chunks.join(' '), label: 'Буквы, цифры и знаки' }
}

export const achievementInfo = [
  { key: 'first', name: 'Первый шаг', description: 'Завершить первую тренировку', mark: '01' },
  { key: 'clean', name: 'Безупречно', description: '25 символов без ошибки', mark: '02' },
  { key: 'speed', name: 'Скоростной набор', description: 'Достичь 200 символов в минуту', mark: '03' },
  { key: 'streak', name: 'Стальной палец', description: '100 символов без ошибки', mark: '04' },
  { key: 'thousand', name: 'Тысяча символов', description: 'Напечатать 1000 символов', mark: '05' },
  { key: 'regular', name: 'Привычка', description: 'Заниматься в 3 разных дня', mark: '06' },
]

export const modeName: Record<Mode, string> = {
  words: 'Слова', sentences: 'Предложения', code: 'Код', symbols: 'Символы',
}

export function prettyChar(char: string): string {
  if (char === ' ') return 'пробел'
  if (char === '\n') return 'Enter'
  return char
}
