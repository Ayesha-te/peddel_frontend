import clsx from 'clsx'
import type { MatchSnapshot } from '@/types'

const SetCell = ({ value, won, tb }: { value: number; won: boolean; tb?: number | null }) => (
  <div className={clsx('relative w-10 text-center sm:w-14', won ? 'text-white' : 'text-slate-500')}>
    <span className="score-num text-4xl font-bold sm:text-5xl">{value}</span>
    {tb != null && <sup className="absolute -right-0.5 top-0 text-xs font-semibold text-slate-400">{tb}</sup>}
  </div>
)

export function PublicScoreboard({ m }: { m: MatchSnapshot }) {
  const { state, display } = m
  const done = state.completed
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-800 shadow-pop" aria-label="Scoreboard">
      {([0, 1] as const).map((idx) => {
        const serving = state.server === idx && !done && m.status === 'live'
        const won = done && state.winner === idx
        const label = display?.pointLabels[idx] ?? '0'
        return (
          <div key={idx} className={clsx('flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-7 sm:py-6', idx === 0 && 'border-b border-white/10', won && 'bg-ball-400/10')}>
            <span className={clsx('h-3 w-3 shrink-0 rounded-full', serving ? 'bg-ball-400 shadow-[0_0_14px_rgba(212,245,60,.9)]' : 'bg-transparent')} role={serving ? 'img' : undefined} aria-label={serving ? 'Serving' : undefined} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-extrabold text-white sm:text-3xl">{m.teams[idx].name}{won && ' 🏆'}</p>
              <p className="truncate text-xs text-slate-400 sm:text-sm">{m.teams[idx].players.join('  ·  ') || '—'}</p>
            </div>
            <div className="flex items-center">
              {state.sets.map((s, i) => (
                <SetCell key={i} value={s.super ? (s.games[idx] ? 1 : 0) : s.games[idx]} won={s.games[idx] > s.games[1 - idx]}
                  tb={s.super ? s.tiebreak?.[idx] : s.tiebreak && s.games[idx] < s.games[1 - idx] ? s.tiebreak[idx] : null} />
              ))}
              {!done && <SetCell value={state.inTiebreak && state.isSuper ? 0 : state.games[idx]} won />}
            </div>
            {!done && (
              <div key={`${label}-${m.revision}`} className="pop grid h-20 w-20 place-items-center rounded-2xl bg-ink-700 sm:h-28 sm:w-28">
                <span className="score-num text-5xl font-extrabold text-ball-400 sm:text-7xl">{label}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
