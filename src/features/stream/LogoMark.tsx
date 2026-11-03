import { useEffect, useState } from 'react'
import { imageUrl } from '@/api/client'
import { initials } from './scoreView'

const PALETTE = ['#0e44a8', '#0b7a5c', '#a3271f', '#6d28d9', '#b45309', '#0e7490']
const colour = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]

/**
 * Logo with a safe fallback. `object-fit: contain` (via .bc img) preserves the aspect ratio: logos are never stretched or cropped.
 * A missing, empty or broken image path shows the team's initials instead of a broken-image icon.
 */
export function LogoMark({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const url = imageUrl(src)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  if (!url || failed) {
    return (
      <div className={className} role="img" aria-label={`${name} logo`}>
        <div className="logo-fallback" style={{ background: colour(name) }}><span>{initials(name)}</span></div>
      </div>
    )
  }
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={url} alt={`${name} logo`} onError={() => setFailed(true)} draggable={false} />
    </div>
  )
}
