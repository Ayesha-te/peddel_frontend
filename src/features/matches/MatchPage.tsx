import clsx from 'clsx'
import { ArrowLeft, CalendarClock, Check, Link2, Maximize2, MapPin, Radio, RefreshCw, Timer, Wifi, WifiOff } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { shareUrl } from '@/api/client'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { useLiveMatch, type LinkState } from '@/hooks/useLiveMatch'
import { usePageMeta } from '@/hooks/usePageMeta'
import { fmtDateTime, fmtDuration, setText } from '@/utils/format'
import { PublicScoreboard } from './PublicScoreboard'

const LINK_LABEL: Record<LinkState, { text: string; cls: string }> = {
  live: { text: 'Live updates on', cls: 'bg-emerald-500/20 text-emerald-300' },
  connecting: { text: 'Connecting…', cls: 'bg-white/10 text-slate-300' },
  reconnecting: { text: 'Reconnecting…', cls: 'bg-amber-500/20 text-amber-300' },
  polling: { text: 'Refreshing every few seconds', cls: 'bg-sky-500/20 text-sky-300' },
}

export default function MatchPage() {
  const { publicId } = useParams()
  const { data: m, isLoading, error, refetch, link } = useLiveMatch(publicId)
  const [copied, setCopied] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  usePageMeta(m ? `${m.teams[0].name} vs ${m.teams[1].name}` : 'Match', m ? `Live padel score - ${m.name}` : undefined)

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl('m', publicId ?? '')); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
  }
  const full = () => boardRef.current?.requestFullscreen?.().catch(() => undefined)

  if (isLoading) return <div className="mx-auto max-w-4xl space-y-4 px-4 py-8"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-64 rounded-3xl" /></div>
  if (error || !m) {
    const notFound = (error as { status?: number } | null)?.status === 404
    return <div className="mx-auto max-w-4xl px-4 py-10"><div className="card">{notFound ? <EmptyState title="Match not found" text="This match does not exist or is not public." /> : <ErrorState message="Could not load the match." onRetry={() => refetch()} />}</div></div>
  }

  const live = m.status === 'live'
  const lk = LINK_LABEL[link]
  const winner = m.winnerIndex != null ? m.teams[m.winnerIndex].name : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      {m.tournament ? (
        <Link to={`/public-tournaments/${m.tournament.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> {m.tournament.name}</Link>
      ) : <Link to="/public-tournaments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Tournaments</Link>}

      <div ref={boardRef} className="space-y-4 bg-slate-50 data-[fs=true]:flex data-[fs=true]:min-h-screen data-[fs=true]:flex-col data-[fs=true]:justify-center data-[fs=true]:bg-ink-950 data-[fs=true]:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold text-slate-900 sm:text-2xl">{m.name}</h1>
          {live && <span className="badge bg-rose-500 text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE</span>}
          {m.status === 'paused' && <span className="badge bg-amber-100 text-amber-800">Paused</span>}
          {m.status === 'completed' && <span className="badge bg-slate-800 text-white">Final</span>}
          {m.status === 'scheduled' || m.status === 'ready' ? <span className="badge bg-sky-100 text-sky-800">Starting soon</span> : null}
        </div>
        <PublicScoreboard m={m} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {m.status !== 'completed' && m.status !== 'cancelled' && (
            <span className={clsx('badge', lk.cls, 'bg-ink-800')}>{link === 'live' ? <Wifi className="h-3.5 w-3.5" /> : link === 'polling' ? <RefreshCw className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{lk.text}</span>
          )}
          {m.display?.matchPointFor.length ? <span className="badge bg-rose-100 text-rose-700">Match point</span> : m.display?.setPointFor.length ? <span className="badge bg-amber-100 text-amber-800">Set point</span> : null}
          {m.display && ['deuce', 'advantage', 'golden', 'tiebreak', 'super'].includes(m.display.pointKind) && !m.state.completed && <span className="badge bg-sky-100 capitalize text-sky-800">{m.display.pointKind === 'super' ? 'Super tie-break' : m.display.pointKind === 'golden' ? 'Golden point' : m.display.pointKind}</span>}
          <span className="flex-1" />
          <button onClick={full} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"><Maximize2 className="h-3.5 w-3.5" /> Full screen</button>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}{copied ? 'Link copied' : 'Share'}</button>
        </div>
      </div>

      {winner && (
        <div className="rounded-2xl border border-ball-400 bg-ball-300/20 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Result</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{winner} win</p>
          <p className="mt-1 font-mono text-lg tabular-nums text-slate-700">{m.state.sets.map(setText).join('   ')}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-700">Match info</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center gap-3"><CalendarClock className="h-4 w-4 text-slate-400" /><dd>{fmtDateTime(m.scheduledAt)}</dd></div>
            <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-slate-400" /><dd>{m.court ?? 'Court to be announced'}</dd></div>
            <div className="flex items-center gap-3"><Timer className="h-4 w-4 text-slate-400" /><dd>{m.startedAt ? fmtDuration(m.durationSeconds) : 'Not started'}</dd></div>
            <div className="flex items-center gap-3"><Radio className="h-4 w-4 text-slate-400" /><dd>Best of {m.config.bestOf}{m.config.goldenPoint ? ' · golden point' : ''}{m.config.superTiebreak ? ' · super tie-break decider' : ''}</dd></div>
          </dl>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-700">Set scores</h2>
          {m.state.sets.length ? (
            <table className="w-full text-sm"><tbody className="divide-y divide-slate-100">
              {m.state.sets.map((s, i) => (
                <tr key={i}><td className="py-2 text-slate-500">{s.super ? 'Super TB' : `Set ${i + 1}`}</td><td className="py-2 text-right font-mono font-bold tabular-nums text-slate-900">{setText(s)}</td></tr>
              ))}
            </tbody></table>
          ) : <p className="text-sm text-slate-500">No completed sets yet.</p>}
        </section>
      </div>

      {m.timeline && m.timeline.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-extrabold uppercase tracking-wide text-slate-700">Recent points</h2>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-sm">
            {m.timeline.filter((e) => e.type === 'point').map((e) => (
              <li key={e.sequence} className="flex items-center justify-between px-5 py-2.5">
                <span>Point <b>{e.team != null ? m.teams[e.team].name : ''}</b></span>
                <span className="font-mono text-xs tabular-nums text-slate-500">{e.sets.map(setText).join(' ')} {e.games[0]}-{e.games[1]} · {e.points[0]}-{e.points[1]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
