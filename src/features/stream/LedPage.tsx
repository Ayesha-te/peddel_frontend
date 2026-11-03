import { useMemo, type CSSProperties } from 'react'
import { LogoMark } from './LogoMark'
import { Pop } from './OverlayPage'
import { clock, fitScale, setColumns, toScoreView } from './scoreView'
import { useBroadcast, useBroadcastOptions } from './useBroadcast'
import { useTicker } from './useTicker'
import './stream.css'

/**
 * Screen B - fullscreen LED scoreboard (16:9, resolution independent, 1080p and 4K look identical).
 * Route: /stream/led/:matchId   or   /stream/led?tournament=<slug>   (follows the live match)
 * Options: anim=0|1  sponsors=0|1  duration=0|1  status=1
 */
export default function LedPage() {
  const b = useBroadcast()
  const opt = useBroadcastOptions(b.brand)
  const m = b.snapshot
  const receivedAt = useMemo(() => Date.now(), [m?.publicId, m?.revision, m?.durationSeconds]) // eslint-disable-line react-hooks/exhaustive-deps
  const secs = useTicker(!!m && m.status === 'live', m?.durationSeconds ?? 0, receivedAt)
  const title = b.tournamentName ?? 'Padel'
  const status = opt.showStatus ? <div className="bc-status">match: {b.matchLink} · stream: {b.streamLink}</div> : null
  const next = b.stream?.next
  const sponsors = opt.showSponsors ? b.brand?.sponsors.filter((s) => s.url) ?? [] : []
  const fed = opt.showSponsors ? b.brand?.federation : null

  const head = (
    <header className="led-head">
      {opt.showLogos && b.tournamentLogo && <LogoMark src={b.tournamentLogo} name={title} className="tlogo" />}
      <div className="titles">
        <div className="led-title" style={{ '--tf': fitScale(title) } as CSSProperties}>{title}</div>
        {m?.category && <span className="led-cat">{m.category}</span>}
      </div>
    </header>
  )
  const foot = (
    <footer className="led-foot">
      <div className="led-next">{next ? <>NEXT: <b>{next.teams[0].name}</b> vs <b>{next.teams[1].name}</b>{next.category ? ` · ${next.category}` : ''}</> : ''}</div>
      {sponsors.length > 0 && (
        <div className="led-sponsors">{sponsors.slice(0, 4).map((s) => <LogoMark key={s.id} src={s.url} name={s.name || 'Sponsor'} className="slot" />)}</div>
      )}
      {fed?.url && <LogoMark src={fed.url} name={fed.name || 'Federation'} className="led-fed" />}
    </footer>
  )

  // no live match yet (follow mode) / loading: branded waiting screen, never a stale score
  if (!m || b.loading) {
    return (
      <div className={`bc led-root ${opt.animate ? 'anim' : ''}`} data-testid="led-idle">
        <div className="led-stage">
          {head}
          <div className="led-idle">
            <h2>{b.notFound ? 'Match not found' : b.noLiveMatch ? 'Next match starting soon' : 'Loading…'}</h2>
            {next && <p>{next.teams[0].name} vs {next.teams[1].name}{next.category ? ` · ${next.category}` : ''}</p>}
          </div>
          {foot}
        </div>
        {status}
      </div>
    )
  }

  const v = toScoreView(m)
  const { cols: setCols, offset } = setColumns(m.config.bestOf, v.setsPlayed, 7)
  const live = v.paused ? { t: 'PAUSED', cls: 'paused' } : v.completed ? { t: 'FINAL', cls: 'final' } : v.live ? { t: 'LIVE', cls: '' } : { t: 'UPCOMING', cls: 'paused' }
  const chips: { t: string; blue?: boolean }[] = []
  if (!v.completed) {
    if (v.matchPoint) chips.push({ t: 'Match point' })
    else if (v.setPoint) chips.push({ t: 'Set point' })
    if (v.kind === 'deuce') chips.push({ t: 'Deuce', blue: true })
    if (v.kind === 'advantage') chips.push({ t: 'Advantage', blue: true })
    if (v.kind === 'golden') chips.push({ t: 'Golden point' })
    if (v.kind === 'tiebreak') chips.push({ t: 'Tie-break', blue: true })
    if (v.kind === 'super') chips.push({ t: 'Super tie-break', blue: true })
  }
  const winner = v.completed && m.winnerIndex !== null ? v.teams[m.winnerIndex] : null

  return (
    <div className={`bc led-root ${opt.animate ? 'anim' : ''}`} data-testid="led" data-public-id={m.publicId}>
      <div className="led-stage" key={m.publicId}>
        <header className="led-head">
          {opt.showLogos && b.tournamentLogo && <LogoMark src={b.tournamentLogo} name={title} className="tlogo" />}
          <div className="titles">
            <div className="led-title" style={{ '--tf': fitScale(title) } as CSSProperties} data-testid="title">{title}</div>
            {m.category && <span className="led-cat" data-testid="category">{m.category}</span>}
          </div>
          <div className="led-meta">
            <span className={`led-live ${live.cls}`}>{live.t === 'LIVE' && <i className="bc-live-dot" />}{live.t}</span>
          </div>
        </header>
        <main className="led-duel" style={{ '--rows': setCols + 1 } as CSSProperties}>
          {([0, 1] as const).map((idx) => {
            const t = v.teams[idx]
            const col = idx === 0 ? 1 : 3
            return (
              <div key={idx} className={`led-card ${t.winner ? 'win' : ''}`} style={{ gridColumn: col, gridRow: '1 / -1' }} data-testid={`team-${idx}`}>
                <span className={`led-serve ${t.serving ? 'on' : ''}`} aria-label={t.serving ? 'Serving' : undefined}><i /></span>
                <div className="led-cname">
                  {opt.showLogos && <LogoMark src={t.logo} name={t.name} className="led-tlogo" />}
                  <span className="led-name"><b>{t.name}</b>{t.players.length > 0 && <small>{t.players.join('  ·  ')}</small>}</span>
                </div>
                <div className="led-rows">
                  {Array.from({ length: setCols }, (_, i) => {
                    const s = t.sets[offset + i]
                    return (
                      <span key={i} className={`led-set num ${s && !s.won ? 'lost' : ''}`} data-testid={`set-${idx}-${i}`}>
                        {s ? <><Pop v={s.value} />{s.tb !== null && <sup>{s.tb}</sup>}</> : ''}
                      </span>
                    )
                  })}
                  <span className="led-game num" data-testid={`game-${idx}`}>{t.game !== null ? <Pop v={t.game} /> : ''}</span>
                </div>
              </div>
            )
          })}
          <div className="led-labels" style={{ gridColumn: 2, gridRow: '1 / -1' }}>
            <span /><span />
            <div className="lab-rows">
              {Array.from({ length: setCols }, (_, i) => <span key={i}>SET {offset + i + 1}</span>)}
              <span className="g">GAME</span>
            </div>
          </div>
        </main>
        <div className="led-bar">
          <span className="led-clock num" data-testid="clock">{opt.showDuration && m.startedAt ? clock(secs) : ''}</span>
          <div className="led-points">
            <span className="led-point num" data-testid="point-0">{v.teams[0].point !== '' ? <Pop v={v.teams[0].point} /> : ''}</span>
            <span className="dash">–</span>
            <span className="led-point num" data-testid="point-1">{v.teams[1].point !== '' ? <Pop v={v.teams[1].point} /> : ''}</span>
          </div>
          <span className="led-court">{m.court ?? ''}</span>
        </div>
        {winner && <div className="led-winner" data-testid="winner"><span>Winner · {winner.name}</span></div>}
        {chips.length > 0 && (
          <div className="led-chips" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--u) * 8.6)' }}>
            {chips.map((c) => <span key={c.t} className={`chip ${c.blue ? 'blue' : ''}`}>{c.t}</span>)}
          </div>
        )}
        {foot}
      </div>
      {status}
    </div>
  )
}
