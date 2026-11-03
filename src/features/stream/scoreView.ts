import type { MatchSnapshot } from '@/types'

export interface TeamView {
  name: string
  players: string[]
  logo: string | null
  /** one entry per completed set (games, or the super tie-break score) */
  sets: { value: number; won: boolean; tb: number | null; super: boolean }[]
  /** games in the CURRENT set (null once the match is over) */
  game: number | null
  point: string
  serving: boolean
  winner: boolean
}

export interface ScoreView {
  teams: [TeamView, TeamView]
  kind: string
  inTiebreak: boolean
  completed: boolean
  live: boolean
  paused: boolean
  matchPoint: boolean
  setPoint: boolean
  setsPlayed: number
}

/** Pure projection of the authoritative snapshot into what a broadcast screen shows. No scoring logic lives here. */
export function toScoreView(m: MatchSnapshot): ScoreView {
  const s = m.state
  const labels = m.display?.pointLabels ?? ['0', '0']
  const completed = !!s.completed
  const mk = (i: 0 | 1): TeamView => ({
    name: m.teams[i].name,
    players: m.teams[i].players,
    logo: m.teams[i].logo ?? null,
    sets: s.sets.map((set) => {
      const other = (1 - i) as 0 | 1
      if (set.super) return { value: set.tiebreak?.[i] ?? (set.games[i] ? 1 : 0), won: set.games[i] > set.games[other], tb: null, super: true }
      const loserTb = set.tiebreak && set.games[i] < set.games[other] ? set.tiebreak[i] : null
      return { value: set.games[i], won: set.games[i] > set.games[other], tb: loserTb, super: false }
    }),
    game: completed ? null : s.games[i],
    point: completed ? '' : labels[i],
    serving: !completed && m.status === 'live' && s.server === i,
    winner: completed && s.winner === i,
  })
  return {
    teams: [mk(0), mk(1)],
    kind: m.display?.pointKind ?? 'normal',
    inTiebreak: !!s.inTiebreak,
    completed,
    live: m.status === 'live',
    paused: m.status === 'paused',
    matchPoint: !completed && (m.display?.matchPointFor.length ?? 0) > 0,
    setPoint: !completed && (m.display?.setPointFor.length ?? 0) > 0,
    setsPlayed: s.sets.length,
  }
}

export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function initials(name: string) {
  return name.split(/[\s/&-]+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase() || '?'
}

/**
 * SET columns hold COMPLETED sets only (the current set's running games are shown in GAME), so nothing is shown twice.
 * The number of columns follows the match format (best of 3 -> 3, best of 5 -> 5, ...), capped for readability;
 * when more sets than columns have been played, the most recent ones are shown.
 */
export function setColumns(bestOf: number, setsPlayed: number, cap = 7) {
  const need = Math.floor(bestOf / 2) + 1
  const maxSets = 2 * need - 1
  const cols = Math.max(1, Math.min(cap, Math.max(maxSets, setsPlayed > cap ? cap : 1)))
  const offset = Math.max(0, setsPlayed - cols)
  return { cols, offset }
}

/** Font scale for long names so they stay on the board instead of being cut with an ellipsis. */
export function fitScale(text: string, short = 26, long = 44) {
  const n = text.length
  return n <= short ? 1 : n <= long ? 0.78 : 0.6
}
