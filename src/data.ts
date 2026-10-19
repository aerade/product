export type Mode = 'words' | 'sentences' | 'code' | 'symbols'
export type Language = 'ru' | 'en'
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const difficultyInfo: { level: Difficulty; name: string; detail: string }[] = [
  { level: 1, name: 'Разминка', detail: 'Короткие слова, строчные буквы' },
  { level: 2, name: 'Темп', detail: 'Больше слов и длиннее серия' },
  { level: 3, name: 'Точность', detail: 'Длинные слова и предложения' },
  { level: 4, name: 'Регистр', detail: 'Заглавные буквы и пунктуация' },
  { level: 5, name: 'Числа', detail: 'Цифры, даты и знаки' },
  { level: 6, name: 'Сложный набор', detail: 'Плотный текст и смена регистра' },
  { level: 7, name: 'Дистанция', detail: 'Длинная серия без пауз' },
  { level: 8, name: 'Эксперт', detail: 'Длинный текст с символами и разным регистром' },
]

export const modes: { id: Mode; title: string; subtitle: string; icon: string }[] = [
  { id: 'words', title: 'Слова', subtitle: 'Серии слов', icon: '01' },
  { id: 'sentences', title: 'Предложения', subtitle: 'Связный текст', icon: '02' },
  { id: 'code', title: 'Код', subtitle: 'Синтаксис и отступы', icon: '03' },
  { id: 'symbols', title: 'Символы', subtitle: 'Знаки и цифры', icon: '04' },
]

const words = {
  ru: ['мир', 'дом', 'код', 'луч', 'ритм', 'книга', 'экран', 'палец', 'скорость', 'точность', 'движение', 'привычка', 'развитие', 'клавиша', 'печать', 'слово', 'старт', 'уровень', 'время', 'сила', 'путь', 'фокус', 'работа', 'память', 'задача', 'команда', 'практика', 'система', 'минута', 'навык', 'ошибка', 'результат', 'последовательность', 'взаимодействие', 'производительность', 'концентрация', 'ответственность'],
  en: ['go', 'up', 'run', 'code', 'type', 'focus', 'learn', 'speed', 'skill', 'level', 'screen', 'finger', 'rhythm', 'motion', 'practice', 'balance', 'streak', 'result', 'keyboard', 'accuracy', 'system', 'project', 'future', 'bright', 'moment', 'concentration', 'responsibility', 'performance', 'development', 'consistency'],
}

const sentences = {
  ru: ['Смотри на экран и держи руки на клавиатуре.', 'Скорость зависит от точности каждого нажатия.', 'После ошибки верни внимание к текущему символу.', 'Короткие занятия помогают закрепить навык.', 'На сложном участке полезно снизить скорость.', 'Регулярная практика улучшает результат.'],
  en: ['Keep your eyes on the screen and your hands on the keyboard.', 'Typing speed depends on the accuracy of each key press.', 'After an error, return your attention to the current character.', 'Short sessions make it easier to build a steady habit.', 'Slow down when a line becomes difficult.', 'Regular practice improves your results.'],
}

const snippets = [
  { language: 'Python', text: 'def greet(name):\n    return f"Hello, {name}!"' },
  { language: 'JavaScript', text: 'const square = (n) => n * n;\nconsole.log(square(5));' },
  { language: 'HTML', text: '<main class="hero">\n  <h1>Hello, world!</h1>\n</main>' },
  { language: 'CSS', text: '.hero {\n  display: grid;\n  gap: 16px;\n}' },
  { language: 'TypeScript', text: 'type User = { id: number; name: string };\nconst ids = users.map((user) => user.id);' },
  { language: 'SQL', text: 'SELECT name, COUNT(*) AS total\nFROM users\nGROUP BY name\nORDER BY total DESC;' },
]

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const repeat = <T,>(count: number, make: () => T): T[] => Array.from({ length: count }, make)

export function makeExercise(mode: Mode, language: Language, difficulty: Difficulty) {
  if (mode === 'words') {
    const pool = words[language].filter((word) => difficulty >= 3 || word.length <= (difficulty === 1 ? 7 : 11))
    const count = [0, 12, 20, 28, 32, 38, 46, 58, 72][difficulty]
    const text = repeat(count, () => pick(pool)).map((word, index) => {
      if (difficulty >= 4 && index % 6 === 0) word = word[0].toUpperCase() + word.slice(1)
      if (difficulty >= 5 && index % 9 === 4) word += `-${Math.floor(10 + Math.random() * 90)}`
      if (difficulty >= 6 && index % 7 === 3) word += pick([',', ';', ':'])
      if (difficulty >= 8 && index % 10 === 7) word = `"${word}"`
      return word
    }).join(' ')
    return { text, label: 'Слова' }
  }
  if (mode === 'sentences') {
    const count = [0, 1, 2, 3, 4, 5, 6, 8, 10][difficulty]
    const text = repeat(count, () => pick(sentences[language])).map((line, index) => {
      if (difficulty >= 5 && index % 2 === 0) return `${line.slice(0, -1)} (${2026 + index}).`
      if (difficulty >= 7 && index % 3 === 1) return `"${line}"`
      return line
    }).join(difficulty >= 6 ? '\n' : ' ')
    return { text, label: 'Предложения' }
  }
  if (mode === 'code') {
    const count = [0, 1, 1, 2, 2, 3, 4, 5, 6][difficulty]
    const pieces = repeat(count, () => pick(snippets))
    let text = pieces.map((piece) => piece.text).join('\n\n')
    if (difficulty >= 4) text += '\n// TODO: check(value_42);'
    if (difficulty >= 6) text += '\nconst result = (a, b) => ({ total: a + b, ok: true });'
    if (difficulty >= 8) text += '\nif (result.ok && result.total >= 42) { console.log("ready!"); }'
    return { text, label: pieces.length === 1 ? pieces[0].language : 'Фрагменты кода' }
  }
  const alphabet = language === 'ru' ? 'абвгдежзиклмнопрстуфхцчшщыэюя' : 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const punctuation = language === 'ru' ? '!"№;%:?*()-_=+,.' : '!@#$%&*+-=?/;:()_[]{}'
  const pool = difficulty <= 2 ? `${alphabet}${digits}` : difficulty <= 4 ? `${alphabet}${digits}${punctuation.slice(0, 10)}` : `${alphabet}${alphabet.toUpperCase()}${digits}${punctuation}`
  const groupCount = [0, 5, 7, 9, 11, 13, 16, 20, 24][difficulty]
  const groupSize = difficulty >= 6 ? 10 : 8
  const text = repeat(groupCount, () => repeat(groupSize, () => pick(pool.split(''))).join('')).join(' ')
  return { text, label: 'Символы' }
}

export const achievementInfo = [
  { key: 'first', name: 'Первая тренировка', description: 'Завершить тренировку', mark: '01' },
  { key: 'clean', name: 'Без ошибок', description: '25 символов без ошибки', mark: '02' },
  { key: 'speed', name: '200 CPM', description: 'Достичь 200 символов в минуту', mark: '03' },
  { key: 'streak', name: '100 без ошибок', description: '100 символов без ошибки', mark: '04' },
  { key: 'thousand', name: '1000 символов', description: 'Напечатать 1000 символов', mark: '05' },
  { key: 'regular', name: 'Три дня', description: 'Заниматься в 3 разных дня', mark: '06' },
]

export const modeName: Record<Mode, string> = { words: 'Слова', sentences: 'Предложения', code: 'Код', symbols: 'Символы' }

export function prettyChar(char: string): string {
  if (char === ' ') return 'пробел'
  if (char === '\n') return 'Enter'
  return char
}
