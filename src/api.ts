import type { Difficulty, Language, Mode } from './data'

export interface User { id: number; name: string; email: string; avatar: number; xp: number; level: number }
export interface Session {
  id: number; mode: Mode; language: Language; difficulty: Difficulty; wpm: number; cpm: number;
  accuracy: number; errors: number; points: number; xp_earned: number; created_at: string
}
export interface Progress {
  summary: { sessions: number; total_ms: number; total_chars: number; best_wpm: number; avg_accuracy: number }
  sessions: Session[]
  mistakes: Record<string, number>
  achievements: { key: string; unlocked_at: string }[]
}
export interface Leaderboard { metric: 'wpm' | 'accuracy' | 'xp'; period: 'today' | 'week' | 'all'; rows: { id: number; name: string; avatar: number; value: number; sessions: number }[] }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string }
    throw new Error(payload.detail || `Ошибка сервера: ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  me: () => request<{ user: User | null }>('/auth/me'),
  register: (name: string, email: string, password: string) => request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  updateProfile: (changes: { name?: string; avatar?: number }) => request<User>('/profile', { method: 'PATCH', body: JSON.stringify(changes) }),
  progress: () => request<Progress>('/progress'),
  leaderboard: (metric: Leaderboard['metric'], period: Leaderboard['period']) => request<Leaderboard>(`/leaderboard?metric=${metric}&period=${period}`),
  save: (session: {
    mode: Mode; language: Language; difficulty: Difficulty; elapsed_ms: number; correct_chars: number;
    errors: number; points: number; xp_bonus_chars: number; xp_bonus_points: number;
    mistake_map: Record<string, number>
  }) => request<{ xp_earned: number; user: User; unlocked: string[]; wpm: number; cpm: number; accuracy: number }>('/practice', { method: 'POST', body: JSON.stringify(session) }),
}
