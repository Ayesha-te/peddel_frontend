import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DirectoryPage from '@/features/public-tournaments/DirectoryPage'
import TournamentPage from '@/features/public-tournaments/TournamentPage'
import MatchPage from '@/features/matches/MatchPage'
import { PublicScoreboard } from '@/features/matches/PublicScoreboard'
import type { MatchSnapshot } from '@/types'

const TOURNAMENT = {
  slug: 'demo', name: 'Demo Open', logo: null, cover: null, venue: 'Club', startDate: '2030-01-01', endDate: '2030-01-03', phase: 'live', teamsCount: 4,
  organizer: 'Fed', description: 'Great event', rules: '', format: 'groups_knockout', rankingCriteria: ['points'], pointsPerWin: 3,
  teams: [{ name: 'Alpha', group: 'Group A', players: [{ name: 'Ann', photo: null }, { name: 'Bo', photo: null }] }],
  standings: [{ group: 'Group A', isFinal: false, rows: [{ rank: 1, team: 'Alpha', played: 1, wins: 1, losses: 0, points: 3, setDifference: 2, gameDifference: 5, qualified: false }] }],
  groupFixtures: [{ round: 'Group A - Round 1', roundNumber: 1, position: 0, group: 'Group A', teamA: 'Alpha', teamB: 'Bravo',
    match: { publicId: 'LIVEMATCH1', status: 'live', scheduledAt: null, court: 'Court 1', sets: [], games: [2, 1], winnerIndex: null, inProgress: true } }],
  knockout: [{ round: 'Final', roundNumber: 1, position: 0, group: null, teamA: 'Winner Group A', teamB: 'Winner Group B', match: null }],
  champion: null, rankings: [],
}

const snapshot = (over: Partial<MatchSnapshot> = {}): MatchSnapshot => ({
  publicId: 'LIVEMATCH1', name: 'Semi 1', status: 'live', revision: 4, scheduledAt: null, court: 'Court 2', tournament: { name: 'Demo Open', slug: 'demo' },
  teams: [{ name: 'Alpha', players: ['Ann', 'Bo'] }, { name: 'Bravo', players: ['Cy', 'Di'] }],
  state: { sets: [{ games: [6, 4], tiebreak: null, super: false }], games: [2, 1], points: [2, 1], inTiebreak: false, isSuper: false, tiebreakTarget: 0, server: 0, winner: null, completed: false },
  config: { bestOf: 3, goldenPoint: false, superTiebreak: false }, durationSeconds: 1500, winnerIndex: null, startedAt: '2030-01-01T10:00:00Z', completedAt: null,
  display: { pointLabels: ['30', '15'], pointKind: 'normal', matchPointFor: [], setPointFor: [], setsWon: [1, 0] }, timeline: [], ...over,
})

class FakeSocket { static instances: FakeSocket[] = []; onopen: any; onmessage: any; onclose: any; onerror: any; constructor(public url: string) { FakeSocket.instances.push(this) } close() {} }

function mockApi(routes: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const hit = Object.entries(routes).find(([k]) => String(url).includes(k))
    if (!hit) return new Response('{}', { status: 404 })
    return new Response(JSON.stringify(hit[1]), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
}

const wrap = (ui: React.ReactNode, path: string, route: string) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={ui} /></Routes></MemoryRouter>
  </QueryClientProvider>
)

beforeEach(() => { FakeSocket.instances = []; vi.stubGlobal('WebSocket', FakeSocket) })
afterEach(() => { vi.unstubAllGlobals() })

const assertNoPdf = (container: HTMLElement) => {
  expect(container.innerHTML.toLowerCase()).not.toContain('pdf')
  expect(container.querySelectorAll('a[href*="pdf" i], [download]').length).toBe(0)
}

describe('public directory', () => {
  it('lists published tournaments with phase and details, and has no PDF controls', async () => {
    mockApi({ '/api/public/tournaments/': { results: [TOURNAMENT], count: 1 } })
    const { container } = render(wrap(<DirectoryPage />, '/public-tournaments', '/public-tournaments'))
    expect(await screen.findByText('Demo Open')).toBeInTheDocument()
    const card = screen.getByRole('link', { name: /demo open/i })
    expect(card).toHaveAttribute('href', '/public-tournaments/demo')
    expect(within(card).getByText('Live')).toBeInTheDocument()
    assertNoPdf(container)
  })
  it('shows an empty state', async () => {
    mockApi({ '/api/public/tournaments/': { results: [], count: 0 } })
    render(wrap(<DirectoryPage />, '/public-tournaments', '/public-tournaments'))
    expect(await screen.findByText(/no tournaments found/i)).toBeInTheDocument()
  })
  it('shows an error state with retry when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network') }))
    render(wrap(<DirectoryPage />, '/public-tournaments', '/public-tournaments'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})

describe('public tournament page', () => {
  it('shows live matches, standings, bracket and teams - and never a PDF control', async () => {
    mockApi({ '/api/public/tournaments/demo/': TOURNAMENT })
    const { container } = render(wrap(<TournamentPage />, '/public-tournaments/demo', '/public-tournaments/:slug'))
    expect(await screen.findByRole('heading', { name: 'Demo Open' })).toBeInTheDocument()
    expect(screen.getByText(/live now/i)).toBeInTheDocument()
    for (const name of [/matches/i, /standings/i, /bracket/i, /teams/i]) {
      screen.getByRole('tab', { name }).click()
      await waitFor(() => assertNoPdf(container))
    }
    expect(screen.queryByRole('button', { name: /pdf|download|export/i })).toBeNull()
  })
  it('renders not-found for unknown/private tournaments', async () => {
    mockApi({})
    render(wrap(<TournamentPage />, '/public-tournaments/secret', '/public-tournaments/:slug'))
    expect(await screen.findByText(/tournament not found/i)).toBeInTheDocument()
  })
})

describe('public match page', () => {
  it('shows live score and ignores stale websocket revisions', async () => {
    mockApi({ '/api/public/matches/LIVEMATCH1/': snapshot() })
    const { container } = render(wrap(<MatchPage />, '/matches/LIVEMATCH1', '/matches/:publicId'))
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByLabelText('Serving')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    assertNoPdf(container)

    const ws = FakeSocket.instances[0]
    expect(ws.url).toContain('/ws/matches/LIVEMATCH1/')
    ws.onopen()
    ws.onmessage({ data: JSON.stringify({ type: 'update', snapshot: snapshot({ revision: 5, display: { pointLabels: ['40', '15'], pointKind: 'normal', matchPointFor: [], setPointFor: [], setsWon: [1, 0] } }) }) })
    await waitFor(() => expect(screen.getByText('40')).toBeInTheDocument())
    // a late, older message must not roll the score back
    ws.onmessage({ data: JSON.stringify({ type: 'update', snapshot: snapshot({ revision: 3 }) }) })
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.queryByText('30')).toBeNull()
  })
  it('shows the winner for a completed match', async () => {
    const done = snapshot({ status: 'completed', winnerIndex: 1, state: { ...snapshot().state, completed: true, winner: 1, sets: [{ games: [4, 6], tiebreak: null, super: false }, { games: [3, 6], tiebreak: null, super: false }] } })
    mockApi({ '/api/public/matches/LIVEMATCH1/': done })
    render(wrap(<MatchPage />, '/matches/LIVEMATCH1', '/matches/:publicId'))
    expect(await screen.findByText(/bravo win/i)).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })
  it('shows not-found for private/unknown matches', async () => {
    mockApi({})
    render(wrap(<MatchPage />, '/matches/NOPE', '/matches/:publicId'))
    expect(await screen.findByText(/match not found/i)).toBeInTheDocument()
  })
})

describe('scoreboard component', () => {
  it('highlights the serving team and winner', () => {
    const done = snapshot({ status: 'completed', winnerIndex: 0, state: { ...snapshot().state, completed: true, winner: 0 } })
    render(<PublicScoreboard m={done} />)
    expect(screen.queryByLabelText('Serving')).toBeNull()
    expect(screen.getByText(/Alpha/)).toHaveTextContent('🏆')
  })
})

describe('source guarantees', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p] })
  it('the public site source contains no PDF code, download links or non-GET requests', () => {
    for (const file of walk(join(process.cwd(), 'src'))) {
      const text = readFileSync(file, 'utf8')
      expect(text.toLowerCase(), file).not.toMatch(/pdf/)
      expect(text, file).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)/i)
    }
  })
})
