import type { SetScore } from '@/types'

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export const fmtDateRange = (a?: string | null, b?: string | null) =>
  a && b && a !== b ? `${fmtDate(a)} – ${fmtDate(b)}` : fmtDate(a || b) || 'Dates to be announced'

export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Time TBC'

export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`
}

export function setText(s: SetScore) {
  if (s.super) return `[${s.tiebreak?.[0]}-${s.tiebreak?.[1]}]`
  return `${s.games[0]}-${s.games[1]}${s.tiebreak ? `(${Math.min(...s.tiebreak)})` : ''}`
}
