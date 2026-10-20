import type { Difficulty, Language, Mode } from './data'

export type BonusType = 'points' | 'xp'

export interface Run {
  id: string
  mode: Mode
  language: Language
  difficulty: Difficulty
  text: string
  label: string
  index: number
  correctChars: number
  errors: number
  totalKeys: number
  combo: number
  maxCombo: number
  points: number
  mistakes: Record<string, number>
  startedAt: number | null
  finishedAt: number | null
  bonusUntil: number | null
  bonusType: BonusType | null
  xpBonusChars: number
  xpBonusPoints: number
  lastHit: 'correct' | 'error' | null
}

export function createRun(mode: Mode, language: Language, difficulty: Difficulty, text: string, label: string): Run {
  return {
    id: crypto.randomUUID(), mode, language, difficulty, text, label,
    index: 0, correctChars: 0, errors: 0, totalKeys: 0, combo: 0, maxCombo: 0, points: 0,
    mistakes: {}, startedAt: null, finishedAt: null, bonusUntil: null, bonusType: null,
    xpBonusChars: 0, xpBonusPoints: 0, lastHit: null,
  }
}

export function multiplier(combo: number): number {
  return combo >= 40 ? 5 : combo >= 20 ? 3 : combo >= 10 ? 2 : 1
}

export function press(run: Run, character: string, time: number, chance = Math.random()): Run {
  if (run.finishedAt || run.index >= run.text.length || character.length !== 1) return run
  const startedAt = run.startedAt ?? time
  const totalKeys = run.totalKeys + 1
  if (character !== run.text[run.index]) {
    const wanted = run.text[run.index]
    return {
      ...run, startedAt, totalKeys, errors: run.errors + 1, combo: 0, lastHit: 'error',
      mistakes: { ...run.mistakes, [wanted]: (run.mistakes[wanted] || 0) + 1 },
    }
  }
  const index = run.index + 1
  const combo = run.combo + 1
  const activeBonus = run.bonusUntil !== null && run.bonusUntil > time ? run.bonusType : null
  const basePoints = 10 * multiplier(combo)
  const points = run.points + Math.round(basePoints * (activeBonus === 'points' ? 1.5 : 1))
  const newBonus = !activeBonus && index < run.text.length && index % 15 === 0 && chance < 0.6
    ? (chance < 0.3 ? 'points' : 'xp') : null
  const bonusUntil = newBonus ? time + 10_000 : run.bonusUntil
  return {
    ...run, index, correctChars: run.correctChars + 1, combo, maxCombo: Math.max(run.maxCombo, combo), totalKeys, points,
    startedAt, finishedAt: index === run.text.length ? time : null, bonusUntil,
    bonusType: newBonus ?? run.bonusType,
    xpBonusChars: run.xpBonusChars + (activeBonus === 'xp' ? 1 : 0),
    xpBonusPoints: run.xpBonusPoints + (activeBonus === 'xp' ? basePoints : 0),
    lastHit: 'correct',
  }
}

export function skip(run: Run, time: number): Run {
  if (run.finishedAt || run.index >= run.text.length) return run
  const wanted = run.text[run.index]
  const index = run.index + 1
  return {
    ...run,
    index,
    errors: run.errors + 1,
    totalKeys: run.totalKeys + 1,
    combo: 0,
    startedAt: run.startedAt ?? time,
    finishedAt: index === run.text.length ? time : null,
    lastHit: 'error',
    mistakes: { ...run.mistakes, [wanted]: (run.mistakes[wanted] || 0) + 1 },
  }
}

export function metrics(run: Run, now: number) {
  const elapsedMs = run.startedAt === null ? 0 : Math.max(500, (run.finishedAt ?? now) - run.startedAt)
  const minutes = elapsedMs / 60_000
  const cpm = run.correctChars ? Math.round(run.correctChars / minutes) : 0
  const wpm = Math.round(cpm / 5)
  const accuracy = run.totalKeys ? Math.round((run.correctChars / run.totalKeys) * 100) : 100
  return { elapsedMs, cpm, wpm, accuracy }
}

export function levelForXp(xp: number) {
  return Math.floor(xp / 250) + 1
}
