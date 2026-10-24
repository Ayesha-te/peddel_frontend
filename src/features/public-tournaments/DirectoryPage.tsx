import { useQuery } from '@tanstack/react-query'
import { CalendarDays, MapPin, Search, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { getJson, imageUrl } from '@/api/client'
import { EmptyState, ErrorState, PhaseBadge, Skeleton } from '@/components/ui'
import { usePageMeta } from '@/hooks/usePageMeta'
import type { Phase, TournamentCard } from '@/types'
import { fmtDateRange } from '@/utils/format'

const TABS: { id: '' | Phase; label: string }[] = [
  { id: '', label: 'All' }, { id: 'live', label: 'Live' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'completed', label: 'Completed' },
]

function Card({ t }: { t: TournamentCard }) {
  const cover = imageUrl(t.cover)
  const logo = imageUrl(t.logo)
  return (
    <Link to={`/public-tournaments/${t.slug}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-pop">
      <div className="relative h-36 bg-gradient-to-br from-ink-800 via-ink-700 to-court-800">
        {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition group-hover:scale-105" />}
        <div className="absolute left-4 top-4"><PhaseBadge phase={t.phase} /></div>
        <div className="absolute -bottom-7 left-4 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-card">
          {logo ? <img src={logo} alt={`${t.name} logo`} className="h-full w-full object-cover" /> : <Trophy className="h-7 w-7 text-court-600" />}
        </div>
      </div>
      <div className="space-y-3 p-5 pt-10">
        <h2 className="text-lg font-extrabold leading-snug text-slate-900 group-hover:text-court-700">{t.name}</h2>
        {t.description && <p className="line-clamp-2 text-sm text-slate-500">{t.description}</p>}
        <ul className="space-y-1.5 text-sm text-slate-600">
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" />{fmtDateRange(t.startDate, t.endDate)}</li>
          {t.venue && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{t.venue}</li>}
          <li className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" />{t.teamsCount} teams</li>
        </ul>
      </div>
    </Link>
  )
}

export default function DirectoryPage() {
  usePageMeta('Tournaments', 'Browse live, upcoming and completed padel tournaments.')
  const [search, setSearch] = useState('')
  const [phase, setPhase] = useState<'' | Phase>('')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tournaments', search, phase],
    queryFn: ({ signal }) => getJson<{ results: TournamentCard[] }>(`/api/public/tournaments/?search=${encodeURIComponent(search)}${phase ? `&phase=${phase}` : ''}`, signal),
    refetchInterval: 30000,
    placeholderData: (prev) => prev,
  })

  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-ball-400/15 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-court-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-ball-400">Padel · Live</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">Follow every point, from anywhere.</h1>
          <p className="mt-4 max-w-xl text-slate-300">Live scores, fixtures, group tables and knockout brackets for all published tournaments.</p>
          <div className="relative mt-8 max-w-lg">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tournaments or venues…" aria-label="Search tournaments"
              className="h-12 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-slate-900 shadow-pop outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-ball-400" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div role="tablist" aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={phase === t.id} onClick={() => setPhase(t.id)}
              className={clsx('chip', phase === t.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100')}>{t.label}</button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        ) : error ? <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        : !data?.results.length ? <div className="card"><EmptyState title="No tournaments found" text={search || phase ? 'Try a different search or filter.' : 'Published tournaments will appear here.'} /></div>
        : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.results.map((t) => <Card key={t.slug} t={t} />)}</div>}
      </div>
    </>
  )
}
