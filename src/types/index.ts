export type Phase = 'upcoming' | 'live' | 'completed'

export interface TournamentCard {
  slug: string
  name: string
  logo: string | null
  cover: string | null
  venue: string
  startDate: string | null
  endDate: string | null
  phase: Phase
  teamsCount: number
  organizer: string
  description: string
}

export interface SetScore { games: [number, number]; tiebreak: [number, number] | null; super: boolean }

export interface MatchSummary {
  publicId: string
  status: string
  scheduledAt: string | null
  court: string | null
  sets: SetScore[]
  games: [number, number] | null
  winnerIndex: 0 | 1 | null
  inProgress: boolean
}

export interface FixtureEntry {
  round: string
  roundNumber: number
  position: number
  group: string | null
  teamA: string
  teamB: string
  match: MatchSummary | null
}

export interface TournamentDetail extends TournamentCard {
  rules: string
  format: string
  rankingCriteria: string[]
  pointsPerWin: number
  teams: { name: string; group: string | null; players: { name: string; photo: string | null }[] }[]
  standings: { group: string; isFinal: boolean; rows: { rank: number; team: string; played: number; wins: number; losses: number; points: number; setDifference: number; gameDifference: number; qualified: boolean }[] }[]
  groupFixtures: FixtureEntry[]
  knockout: FixtureEntry[]
  champion: string | null
  rankings: { place: number; team: string }[]
}

export interface EngineState {
  sets: SetScore[]
  games: [number, number]
  points: [number, number]
  inTiebreak: boolean
  isSuper: boolean
  tiebreakTarget: number
  server: 0 | 1
  winner: 0 | 1 | null
  completed: boolean
}

export interface MatchSnapshot {
  publicId: string
  name: string
  status: string
  revision: number
  scheduledAt: string | null
  court: string | null
  tournament: { name: string; slug: string } | null
  teams: [{ name: string; players: string[] }, { name: string; players: string[] }]
  state: EngineState
  config: { bestOf: number; goldenPoint: boolean; superTiebreak: boolean }
  durationSeconds: number
  winnerIndex: 0 | 1 | null
  startedAt: string | null
  completedAt: string | null
  display: { pointLabels: [string, string]; pointKind: string; matchPointFor: number[]; setPointFor: number[]; setsWon: [number, number] } | null
  timeline?: { sequence: number; type: string; team: number | null; at: string; sets: SetScore[]; games: [number, number]; points: [string, string] }[]
}
