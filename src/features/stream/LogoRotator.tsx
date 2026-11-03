import { useEffect, useState } from 'react'
import { LogoMark } from './LogoMark'

export interface LogoItem { key: string; src: string | null; name: string }

/**
 * Right-hand logo slot of the overlay. The first logo slides in from the right; with several logos (tournament, sponsors,
 * federation) they rotate smoothly. With animation disabled (admin setting, ?anim=0 or prefers-reduced-motion) logos simply swap.
 * Re-keyed per match by the parent so the previous match's logos never linger.
 */
export function LogoRotator({ items, animate, seconds }: { items: LogoItem[]; animate: boolean; seconds: number }) {
  const [i, setI] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const n = items.length

  useEffect(() => setI(0), [n])
  useEffect(() => {
    if (n < 2) return
    const swap = setInterval(() => {
      if (animate) {
        setLeaving(true)
        setTimeout(() => { setI((v) => (v + 1) % n); setLeaving(false) }, 350)
      } else setI((v) => (v + 1) % n)
    }, seconds * 1000)
    return () => clearInterval(swap)
  }, [n, animate, seconds])

  if (!n) return null
  const cur = items[Math.min(i, n - 1)]
  return (
    <div className="slot" data-testid="logo-slot">
      <div key={cur.key} className={leaving ? 'bc-logo-out' : 'bc-logo-in'} style={{ width: '100%', height: '100%' }} data-logo={cur.key}>
        <LogoMark src={cur.src} name={cur.name} className="logo-wrap" />
      </div>
    </div>
  )
}
