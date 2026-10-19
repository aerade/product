import type { Language } from './data'

const rows = {
  ru: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
    ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
    ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.'],
  ],
  en: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ],
}

const fingerNames = [
  'Левый мизинец', 'Левый безымянный', 'Левый средний', 'Левый указательный',
  'Правый указательный', 'Правый средний', 'Правый безымянный', 'Правый мизинец',
]

function fingerIndex(column: number, length: number) {
  const mid = Math.ceil(length / 2)
  if (column < mid) return Math.min(column, 3)
  return 4 + Math.min(Math.max(0, column - mid), 3)
}

const shifted: Record<string, string> = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8',
  '(': '9', ')': '0', '_': '-', '+': '=', ':': ';', '"': "'", '?': '/', '<': ',', '>': '.',
  '{': '[', '}': ']', '|': '\\',
}

export function keyForChar(character: string): string {
  if (character === ' ') return 'Space'
  if (character === '\n') return 'Enter'
  return shifted[character] || character.toLowerCase()
}

export function fingerForChar(character: string, language: Language) {
  if (character === ' ') return 'Большой палец'
  if (character === '\n') return 'Правый мизинец'
  const key = keyForChar(character)
  for (const row of rows[language]) {
    const column = row.indexOf(key)
    if (column !== -1) return fingerNames[fingerIndex(column, row.length)]
  }
  return 'Следите за раскладкой'
}

export function keyboardRows(language: Language) {
  return rows[language]
}
