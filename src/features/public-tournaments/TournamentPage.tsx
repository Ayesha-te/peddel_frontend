import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft, CalendarDays, Check, Crown, Link2, MapPin, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getJson, imageUrl, shareUrl } from '@/api/client'
import { EmptyState, ErrorState, PhaseBadge, Section, Skeleton } from '@/components/ui'
import { usePageMeta } from '@/hooks/usePageMeta'
import type { FixtureEntry, TournamentDetail } from '@/types'
import { fmtDateRange, fmtDateTime, setText } from '@/utils/format'

type Tab = 'overview' | 'matches' | 'standings' | 'bracket' | 'teams'

function MatchRow({ f }: { f: FixtureEntry }) {
  const m = f.match
  const win = (i: 0 | 1) => m?.winnerIndex === i && m.status === 'completed'
  const inner = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <span className={clsx(win(0) ? 'font-extrabold text-slate-900' : 'text-slate-700')}>{f.teamA}</span>
        <span className="mx-2 text-slate-300">vs</span>
        <span className={clsx(win(1) ? 'font-extrabold text-slate-900' : 'text-slate-700')}>{f.teamB}</span>
      </div>
      {m?.sets.length ? <span className="font-mono text-sm font-bold tabular-nums text-slate-800">{m.sets.map(setText).join('  ')}{m.inProgress && m.games ? `  ${m.games[0]}-${m.games[1]}` : ''}</span> : null}
      {m?.inProgress ? <span className="badge bg-rose-500 text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE</span>
        : m?.status === 'completed' ? <span className="badge bg-slate-200 text-slate-700">Final</span>
        : <span className="text-xs text-slate-500">{fmtDateTime(m?.scheduledAt)}{m?.court ? ` · ${m.court}` : ''}</span>}
    </div>
  )
  return m ? <Link to={`/matches/${m.publicId}`} className="block">{inner}</Link> : inner
}

function FixtureList({ items }: { items: FixtureEntry[] }) {
  const rounds = [...new Set(items.map((i) => i.round))]
  if (!items.length) return <EmptyState title="No fixtures yet" text="Fixtures will be published soon." />
  return (
    <div className="space-y-5">
      {rounds.map((r) => (
        <Section key={r} title={r}>
          <div className="divide-y divide-slate-100">{items.filter((i) => i.round === r).map((f, i) => <MatchRow key={i} f={f} />)}</div>
        </Section>
      ))}
    </div>
  )
}

function Bracket({ items }: { items: FixtureEntry[] }) {
  if (!items.length) return <div className="card"><EmptyState title="No knockout stage" text="The bracket appears once the group stage is set." /></div>
  const rounds = [...new Set(items.map((i) => i.roundNumber))].sort((a, b) => a - b)
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max gap-8">
        {rounds.map((r) => {
          const list = items.filter((i) => i.roundNumber === r).sort((a, b) => a.position - b.position)
          return (
            <div key={r} className="flex w-64 flex-col">
              <h3 className="mb-3 text-center text-xs font-extrabold uppercase tracking-wider text-slate-500">{list[0].round}</h3>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {list.map((f, i) => {
                  const m = f.match
                  const card = (
                    <div className="card overflow-hidden text-sm transition hover:shadow-pop">
                      {([0, 1] as const).map((s) => {
                        const won = m?.status === 'completed' && m.winnerIndex === s
                        return (
                          <div key={s} className={clsx('flex items-center justify-between gap-2 px-3 py-2.5', s === 0 && 'border-b border-slate-100', won && 'bg-emerald-50 font-extrabold')}>
                            <span className="truncate">{s === 0 ? f.teamA : f.teamB}</span>
                            <span className="font-mono text-xs tabular-nums text-slate-500">{m?.sets.map((x) => (x.super ? (x.games[s] ? 1 : 0) : x.games[s])).join(' ')}</span>
                          </div>
                        )
                      })}
                      {m?.inProgress && <div className="bg-rose-500 px-3 py-1 text-center text-[11px] font-bold text-white">LIVE</div>}
                    </div>
                  )
                  return m ? <Link key={i} to={`/matches/${m.publicId}`}>{card}</Link> : <div key={i}>{card}</div>
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TournamentPage() {
  const { slug } = useParams()
  const [tab, setTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState(false)
  const { data: t, isLoading, error, refetch } = useQuery({
    queryKey: ['tournament', slug],
    queryFn: ({ signal }) => getJson<TournamentDetail>(`/api/public/tournaments/${slug}/`, signal),
    refetchInterval: 15000,
    retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2,
  })
  usePageMeta(t?.name ?? 'Tournament', t?.description, imageUrl(t?.cover ?? t?.logo))

  if (isLoading) return <div className="mx-auto max-w-6xl space-y-4 px-4 py-8"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 rounded-2xl" /></div>
  if (error || !t) {
    const nf = (error as { status?: number } | null)?.status === 404
    return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card">{nf ? <EmptyState title="Tournament not found" text="It may be unpublished or the link is incorrect." /> : <ErrorState message="Could not load the tournament." onRetry={() => refetch()} />}</div></div>
  }

  const live = [...t.groupFixtures, ...t.knockout].filter((f) => f.match?.inProgress)
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'matches', label: 'Matches' }, { id: 'standings', label: 'Standings' },
    { id: 'bracket', label: 'Bracket' }, { id: 'teams', label: `Teams (${t.teams.length})` },
  ]
  const cover = imageUrl(t.cover)
  const logo = imageUrl(t.logo)
  const copy = async () => { try { await navigator.clipboard.writeText(shareUrl('t', t.slug)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }

  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 text-white">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/60 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8">
          <Link to="/public-tournaments" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> All tournaments</Link>
          <div className="flex flex-wrap items-end gap-5">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-4 border-white/20 bg-white sm:h-24 sm:w-24">
              {logo ? <img src={logo} alt={`${t.name} logo`} className="h-full w-full object-cover" /> : <Trophy className="h-9 w-9 text-court-600" />}
            </div>
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              <PhaseBadge phase={t.phase} />
              <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{t.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{fmtDateRange(t.startDate, t.endDate)}</span>
                {t.venue && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{t.venue}</span>}
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{t.teamsCount} teams</span>
              </p>
            </div>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">{copied ? <Check className="h-4 w-4 text-ball-400" /> : <Link2 className="h-4 w-4" />}{copied ? 'Link copied' : 'Share'}</button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {t.champion && (
          <div className="mb-6 flex items-center gap-4 rounded-2xl border border-ball-400 bg-gradient-to-r from-ball-300/40 to-ball-300/10 p-5">
            <Crown className="h-9 w-9 text-amber-600" />
            <div><p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Champions</p><p className="text-2xl font-extrabold text-slate-900">{t.champion}</p></div>
          </div>
        )}
        {live.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Live now</h2>
            <div className="card divide-y divide-slate-100 overflow-hidden">{live.map((f, i) => <MatchRow key={i} f={f} />)}</div>
          </div>
        )}

        <div role="tablist" aria-label="Tournament sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
          {tabs.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
              className={clsx('whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-bold transition', tab === x.id ? 'border-court-600 text-court-700' : 'border-transparent text-slate-500 hover:text-slate-900')}>{x.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Section title="About"><div className="space-y-3 p-5 text-slate-700">{t.description ? <p className="whitespace-pre-line">{t.description}</p> : <p className="text-slate-500">No description provided.</p>}</div></Section>
              {t.rules && <Section title="Rules"><p className="whitespace-pre-line p-5 text-sm text-slate-700">{t.rules}</p></Section>}
              {t.rankings.length > 0 && (
                <Section title="Final ranking"><ol className="divide-y divide-slate-100">{t.rankings.map((r, i) => <li key={i} className="flex items-center gap-4 px-5 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-sm font-extrabold text-ball-400">{r.place}</span><span className="font-bold text-slate-900">{r.team}</span></li>)}</ol></Section>
              )}
            </div>
            <Section title="Details"><dl className="divide-y divide-slate-100 text-sm">
              {([['Organizer', t.organizer || '—'], ['Venue', t.venue || '—'], ['Format', t.format.replace(/_/g, ' ')], ['Teams', String(t.teams.length)]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold capitalize text-slate-900">{v}</dd></div>
              ))}
            </dl></Section>
          </div>
        )}

        {tab === 'matches' && (
          <div className="space-y-8">
            {t.groupFixtures.length > 0 && <div><h2 className="mb-3 text-lg font-extrabold text-slate-900">Group stage</h2><FixtureList items={t.groupFixtures} /></div>}
            {t.knockout.length > 0 && <div><h2 className="mb-3 text-lg font-extrabold text-slate-900">Knockout stage</h2><FixtureList items={t.knockout} /></div>}
            {!t.groupFixtures.length && !t.knockout.length && <div className="card"><EmptyState title="No matches yet" text="The schedule will be published soon." /></div>}
          </div>
        )}

        {tab === 'standings' && (
          t.standings.length ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {t.standings.map((g) => (
                <Section key={g.group} title={g.group} action={!g.isFinal ? <span className="text-xs font-semibold text-slate-400">Live table</span> : undefined}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead><tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{['#', 'Team', 'P', 'W', 'L', 'Pts', 'SD', 'GD'].map((h, i) => <th key={h} className={clsx('px-3 py-2.5 font-bold', i > 1 ? 'text-center' : 'text-left')}>{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {g.rows.map((r) => (
                          <tr key={r.team} className={r.qualified ? 'bg-emerald-50/70' : ''}>
                            <td className="px-3 py-3 font-extrabold text-slate-400">{r.rank}</td>
                            <td className="px-3 py-3 font-bold text-slate-900">{r.team}{r.qualified && <Check className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" aria-label="Qualified" />}</td>
                            <td className="px-3 text-center tabular-nums">{r.played}</td><td className="px-3 text-center tabular-nums">{r.wins}</td><td className="px-3 text-center tabular-nums">{r.losses}</td>
                            <td className="px-3 text-center font-extrabold tabular-nums text-slate-900">{r.points}</td>
                            <td className="px-3 text-center tabular-nums">{r.setDifference > 0 ? '+' : ''}{r.setDifference}</td>
                            <td className="px-3 text-center tabular-nums">{r.gameDifference > 0 ? '+' : ''}{r.gameDifference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              ))}
            </div>
          ) : <div className="card"><EmptyState title="No standings yet" text="Tables appear once group fixtures are published." /></div>
        )}

        {tab === 'bracket' && <Bracket items={t.knockout} />}

        {tab === 'teams' && (
          t.teams.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.teams.map((team) => (
                <div key={team.name} className="card p-5">
                  <div className="flex items-center justify-between"><h3 className="font-extrabold text-slate-900">{team.name}</h3>{team.group && <span className="badge bg-slate-100 text-slate-600">{team.group}</span>}</div>
                  <ul className="mt-3 space-y-2">{team.players.map((p) => (
                    <li key={p.name} className="flex items-center gap-3 text-sm text-slate-700">
                      {p.photo ? <img src={imageUrl(p.photo) ?? ''} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-court-100 text-xs font-bold text-court-700">{p.name[0]}</span>}{p.name}
                    </li>
                  ))}</ul>
                </div>
              ))}
            </div>
          ) : <div className="card"><EmptyState title="No teams yet" /></div>
        )}
      </div>
    </>
  )
}
