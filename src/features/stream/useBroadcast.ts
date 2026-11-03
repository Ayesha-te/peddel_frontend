import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useLiveMatch } from '@/hooks/useLiveMatch'
import type { MatchSnapshot, StreamBrand } from '@/types'
import { useStream } from './useStream'

export interface BroadcastOptions {
  animate: boolean
  scale: number
  showDuration: boolean
  showLogos: boolean
  showSponsors: boolean
  showStatus: boolean
  position: 'tl' | 'bl' | 'tr' | 'br'
  rotateSeconds: number
}

const flag = (v: string | null, fallback: boolean) => (v === null ? fallback : !['0', 'false', 'off', 'no'].includes(v.toLowerCase()))

/** URL options (OBS Browser Source URLs) win over the admin's tournament settings. */
export function useBroadcastOptions(brand: StreamBrand | undefined): BroadcastOptions {
  const [sp] = useSearchParams()
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const scale = Number(sp.get('scale'))
  const rotate = Number(sp.get('rotate'))
  const pos = sp.get('pos')
  return {
    animate: flag(sp.get('anim'), brand?.settings.logoAnimation ?? true) && !reduced,
    scale: Number.isFinite(scale) && scale >= 0.4 && scale <= 3 ? scale : 1,
    showDuration: flag(sp.get('duration'), brand?.settings.showDuration ?? true),
    showLogos: flag(sp.get('logos'), true),
    showSponsors: flag(sp.get('sponsors'), true),
    showStatus: flag(sp.get('status'), false),
    position: pos === 'bl' || pos === 'tr' || pos === 'br' ? pos : 'tl',
    rotateSeconds: Number.isFinite(rotate) && rotate >= 3 && rotate <= 60 ? rotate : brand?.settings.sponsorRotateSeconds ?? 8,
  }
}

/**
 * One hook for both broadcast screens.
 *  /stream/<screen>/:matchId           -> fixed match
 *  /stream/<screen>?tournament=<slug>  -> follows whichever match the admin sets live in the streaming queue
 */
export function useBroadcast() {
  const { matchId } = useParams()
  const [sp] = useSearchParams()
  const followSlug = matchId ? undefined : sp.get('tournament') ?? undefined

  // follow mode: the tournament's stream state tells us which match is live
  const followed = useStream(followSlug)
  const publicId = matchId ?? followed.data?.live?.publicId

  const match = useLiveMatch(publicId)
  const snapshot: MatchSnapshot | undefined = publicId ? match.data : undefined

  // fixed-match mode: branding comes from the match's own tournament
  const brandSlug = followSlug ?? snapshot?.tournament?.slug
  const own = useStream(matchId ? brandSlug : undefined)
  const stream = followSlug ? followed : own

  useEffect(() => { document.documentElement.classList.add('stream-page'); return () => document.documentElement.classList.remove('stream-page') }, [])

  return {
    snapshot,
    stream: stream.data,
    brand: stream.data?.brand,
    tournamentName: snapshot?.tournament?.name ?? stream.data?.tournament?.name,
    tournamentLogo: snapshot?.tournament?.logo ?? stream.data?.tournament?.logo ?? null,
    matchLink: match.link,
    streamLink: followSlug ? followed.link : 'live',
    follow: !!followSlug,
    loading: (!!publicId && match.isLoading) || (!!followSlug && followed.isLoading),
    notFound: (match.error as { status?: number } | null)?.status === 404 || (followed.error as { status?: number } | null)?.status === 404,
    noLiveMatch: !!followSlug && !followed.isLoading && !followed.data?.live,
  }
}
