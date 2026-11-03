import { useMemo, type CSSProperties } from 'react'
import { LogoMark } from './LogoMark'
import { LogoRotator, type LogoItem } from './LogoRotator'
import { clock, setColumns, toScoreView, type ScoreView } from './scoreView'
import { useBroadcast, useBroadcastOptions } from './useBroadcast'
import { useTicker } from './useTicker'
import './stream.css'

export const Pop = ({ v, className }: { v: string | number; className?: string }) => <span key={String(v)} className={`bc-pop ${className ?? ''}`}>{v}</span>

function Chips({ v }: { v: ScoreView }) {
  const chips: { t: string; blue?: boolean }[] = []
  if (v.completed) return null
  if (v.matchPoint) chips.push({ t: 'Match point' })
  else if (v.setPoint) chips.push({ t: 'Set point' })
  if (v.kind === 'deuce') chips.push({ t: 'Deuce', blue: true })
  if (v.kind === 'advantage') chips.push({ t: 'Advantage', blue: true })
  if (v.kind === 'golden') chips.push({ t: 'Golden point' })
  if (v.kind === 'tiebreak') chips.push({ t: 'Tie-break', blue: true })
  if (v.kind === 'super') chips.push({ t: 'Super tie-break', blue: true })
  if (!chips.length) return null
  return <div className="ov-chips">{chips.map((c) => <span key={c.t} className={`chip ${c.blue ? 'blue' : ''}`}>{c.t}</span>)}</div>
}

/**
 * Screen A - transparent OBS overlay. Route: /stream/overlay/:matchId   or   /stream/overlay?tournament=<slug>
 * Options (query string): anim=0|1  scale=0.5..3  pos=tl|bl|tr|br  duration=0|1  logos=0|1  sponsors=0|1  rotate=3..60  status=1
 */
export default function OverlayPage() {
  const b = useBroadcast()
  const opt = useBroadcastOptions(b.brand)
  const m = b.snapshot
  // the clock counts from the moment this score update arrived (server duration + local seconds), so it never drifts or resets on re-render
  const receivedAt = useMemo(() => Date.now(), [m?.publicId, m?.revision, m?.durationSeconds]) // eslint-disable-line react-hooks/exhaustive-deps
  const secs = useTicker(!!m && m.status === 'live', m?.durationSeconds ?? 0, receivedAt)

  const logos: LogoItem[] = []
  if (opt.showLogos) {
    if (b.tournamentLogo) logos.push({ key: 'tournament', src: b.tournamentLogo, name: b.tournamentName ?? 'Tournament' })
    if (opt.showSponsors) {
      b.brand?.sponsors.forEach((s) => s.url && logos.push({ key: `s${s.id}`, src: s.url, name: s.name || 'Sponsor' }))
      if (b.brand?.federation?.url) logos.push({ key: 'fed', src: b.brand.federation.url, name: b.brand.federation.name || 'Federation' })
    }
  }

  const style = { '--scale': opt.scale } as CSSProperties
  const status = opt.showStatus ? <div className="bc-status">match: {b.matchLink} · stream: {b.streamLink}</div> : null

  // nothing live / nothing loaded yet -> stay fully transparent (never show a stale previous match)
  if (!m || b.loading) return <div className={`bc ov ${opt.animate ? 'anim' : ''}`} style={style} data-testid="overlay-empty">{status}</div>

  const v = toScoreView(m)
  const { cols: setCols, offset } = setColumns(m.config.bestOf, v.setsPlayed, 5)
  const tag = b.brand?.settings.hashtag?.trim() || ''
  const live = v.paused ? { t: 'PAUSED', cls: 'paused' } : v.completed ? { t: 'FINAL', cls: 'final' } : v.live ? { t: 'LIVE', cls: '' } : { t: 'UPCOMING', cls: 'paused' }

  return (
    <div className={`bc ov ${opt.animate ? 'anim' : ''}`} style={style} data-pos={opt.position} data-testid="overlay" data-public-id={m.publicId}>
      <div className="ov-board bc-board-in" key={m.publicId} style={{ '--cols': setCols } as CSSProperties}>
        <div className="ov-head">
          <span className={`live ${live.cls}`}>{live.t === 'LIVE' && <i className="bc-live-dot" />}{live.t}</span>
          <span className="grow" data-testid="title">{m.category || b.tournamentName}</span>
          {opt.showDuration && m.startedAt && <span className="clock">{clock(secs)}</span>}
        </div>
        <span />
        <span />
        {Array.from({ length: setCols }, (_, i) => <span key={i} className="ov-label">S{offset + i + 1}</span>)}
        <span className="ov-label">GAME</span>
        <span className="ov-label">PT</span>
        {v.teams.map((t, idx) => (
          <div key={idx} className={`ov-row ${t.winner ? 'win' : ''}`} data-testid={`team-${idx}`}>
            <span className={`ov-serve ${t.serving ? 'on' : ''}`} aria-label={t.serving ? 'Serving' : undefined}><i /></span>
            <span className="ov-name">
              {opt.showLogos && <LogoMark src={t.logo} name={t.name} className="logo" />}
              <span>{t.name}</span>
            </span>
            {Array.from({ length: setCols }, (_, i) => {
              const s = t.sets[offset + i]
              return (
                <span key={i} className={`ov-set num ${s && !s.won ? 'lost' : ''}`} data-testid={`set-${idx}-${i}`}>
                  {s ? <><Pop v={s.value} />{s.tb !== null && <sup>{s.tb}</sup>}</> : ''}
                </span>
              )
            })}
            <span className="ov-game num" data-testid={`game-${idx}`}>{t.game !== null ? <Pop v={t.game} /> : ''}</span>
            <span className="ov-point num" data-testid={`point-${idx}`}>{t.point !== '' ? <Pop v={t.point} /> : (t.winner ? '★' : '')}</span>
          </div>
        ))}
        <Chips v={v} />
        {tag && <div className="ov-tag" data-testid="hashtag">{tag}</div>}
      </div>
      {logos.length > 0 && (
        <div className="ov-logos">
          <LogoRotator key={`${m.publicId}:${logos.length}`} items={logos} animate={opt.animate} seconds={opt.rotateSeconds} />
        </div>
      )}
      {status}
    </div>
  )
}
