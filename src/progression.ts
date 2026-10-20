import type { Difficulty, Mode } from './data'

export const modeUnlockLevel: Record<Mode, number> = {
  words: 1,
  sentences: 2,
  symbols: 3,
  code: 4,
}

export function unlockedDifficulty(level: number): Difficulty {
  return Math.min(8, Math.max(1, level)) as Difficulty
}

export function unlocksAtLevel(level: number): string[] {
  const modes = Object.entries(modeUnlockLevel)
    .filter(([, required]) => required === level)
    .map(([mode]) => ({ words: 'Слова', sentences: 'Предложения', symbols: 'Символы', code: 'Код' })[mode as Mode])
  if (level >= 2 && level <= 8) modes.push(`Сложность ${level}`)
  return modes
}
