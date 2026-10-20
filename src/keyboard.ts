import type { Language } from './data'

const rows = {
  ru: [
    ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ', '\\'],
    ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
    ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.'],
  ],
  en: [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ],
}

const fingerNames = [
  'Левый мизинец', 'Левый безымянный', 'Левый средний', 'Левый указательный',
  'Правый указательный', 'Правый средний', 'Правый безымянный', 'Правый мизинец',
]

function fingerIndex(column: number, rowIndex: number) {
  const rightHandStart = [7, 6, 5, 5][rowIndex]
  if (column < rightHandStart) return Math.min(Math.max(0, column - (rowIndex === 0 ? 1 : 0)), 3)
  return 4 + Math.min(column - rightHandStart, 3)
}

const shifted: Record<string, string> = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8',
  '(': '9', ')': '0', '_': '-', '+': '=', ':': ';', '"': "'", '?': '/', '<': ',', '>': '.',
  '{': '[', '}': ']', '|': '\\',
}

const shiftedRu: Record<string, string> = {
  '!': '1', '"': '2', '№': '3', ';': '4', '%': '5', ':': '6', '?': '7', '*': '8',
  '(': '9', ')': '0', '_': '-', '+': '=', ',': '.',
}

export function keyForChar(character: string, language: Language = 'en'): string {
  if (character === ' ') return 'Space'
  if (character === '\n') return 'Enter'
  if (language === 'ru' && shiftedRu[character]) return shiftedRu[character]
  return shifted[character] || character.toLowerCase()
}

export function needsShift(character: string, language: Language): boolean {
  if (character.toLowerCase() !== character) return true
  return Boolean((language === 'ru' && shiftedRu[character]) || shifted[character])
}

export function fingerForChar(character: string, language: Language) {
  if (character === ' ') return 'Большой палец'
  if (character === '\n') return 'Правый мизинец'
  const key = keyForChar(character, language)
  for (const [rowIndex, row] of rows[language].entries()) {
    const column = row.indexOf(key)
    if (column !== -1) return fingerNames[fingerIndex(column, rowIndex)]
  }
  return 'Следите за раскладкой'
}

export function keyboardRows(language: Language) {
  return rows[language]
}
