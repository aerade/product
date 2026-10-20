import type { Leaderboard } from './api'

const participants = [
  { id: -1, name: 'ЛеснойЛис', avatar: 1, sessions: 82, wpm: 116, accuracy: 98.7, xp: 28450 },
  { id: -2, name: 'ТихаяСова', avatar: 2, sessions: 74, wpm: 108, accuracy: 99.3, xp: 26820 },
  { id: -3, name: 'СеверныйВетер', avatar: 3, sessions: 93, wpm: 104, accuracy: 97.8, xp: 31560 },
  { id: -4, name: 'МоховойМаг', avatar: 4, sessions: 65, wpm: 101, accuracy: 98.2, xp: 22370 },
  { id: -5, name: 'ЛуннаяИва', avatar: 5, sessions: 88, wpm: 97, accuracy: 99.6, xp: 30140 },
  { id: -6, name: 'СосновыйПик', avatar: 6, sessions: 58, wpm: 94, accuracy: 97.4, xp: 19580 },
  { id: -7, name: 'ЗвёздныйСлед', avatar: 7, sessions: 70, wpm: 91, accuracy: 98.9, xp: 24600 },
  { id: -8, name: 'КаменныйРучей', avatar: 8, sessions: 55, wpm: 87, accuracy: 96.9, xp: 18120 },
  { id: -9, name: 'СинийТуман', avatar: 9, sessions: 47, wpm: 83, accuracy: 99.1, xp: 15930 },
  { id: -10, name: 'НочнойКедр', avatar: 10, sessions: 63, wpm: 79, accuracy: 97.1, xp: 21050 },
]

export function demoLeaderboardRows(metric: Leaderboard['metric'], period: Leaderboard['period']): Leaderboard['rows'] {
  const sessionScale = period === 'today' ? 0.12 : period === 'week' ? 0.38 : 1
  const speedOffset = period === 'today' ? 8 : period === 'week' ? 3 : 0
  const accuracyOffset = period === 'today' ? 0.8 : period === 'week' ? 0.3 : 0

  return participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    avatar: participant.avatar,
    sessions: Math.max(1, Math.round(participant.sessions * sessionScale)),
    value: metric === 'wpm'
      ? participant.wpm - speedOffset
      : metric === 'accuracy'
        ? Math.round((participant.accuracy - accuracyOffset) * 10) / 10
        : Math.round(participant.xp * sessionScale),
  })).sort((a, b) => b.value - a.value)
}
