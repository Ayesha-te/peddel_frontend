import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { getJson, wsBase } from '@/api/client'
import type { MatchSnapshot } from '@/types'

export type LinkState = 'connecting' | 'live' | 'reconnecting' | 'polling'

/**
 * Authoritative state comes from REST; the WebSocket only pushes newer revisions.
 *  - messages with an older/equal revision are ignored (stale protection)
 *  - after every (re)connect the server sends a fresh snapshot, so a spectator can never stay behind
 *  - if the socket keeps failing we fall back to slow polling so the page still updates
 */
export function useLiveMatch(publicId: string | undefined) {
  const qc = useQueryClient()
  const key = ['match', publicId]
  const [link, setLink] = useState<LinkState>('connecting')
  const failures = useRef(0)
  const lastFetch = useRef(Date.now())

  const query = useQuery<MatchSnapshot>({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const fresh = await getJson<MatchSnapshot>(`/api/public/matches/${publicId}/`, signal)
      const cur = qc.getQueryData<MatchSnapshot>(key)
      // a WebSocket push may already be newer than this REST response: never go backwards
      return cur && cur.revision > fresh.revision ? { ...cur, timeline: fresh.timeline } : fresh
    },
    enabled: !!publicId,
    refetchInterval: link === 'polling' ? 8000 : false,
    retry: (n, err) => (err as { status?: number }).status !== 404 && n < 2,
  })

  useEffect(() => {
    if (!publicId) return
    let ws: WebSocket | null = null
    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    const apply = (snap: MatchSnapshot) => {
      qc.setQueryData<MatchSnapshot>(key, (old) => {
        if (old && snap.revision <= old.revision) return old // never let stale data overwrite newer
        return { ...snap, timeline: old?.timeline }
      })
    }
    const connect = () => {
      try {
        ws = new WebSocket(`${wsBase()}/ws/matches/${publicId}/`)
      } catch {
        setLink('polling')
        return
      }
      ws.onopen = () => { failures.current = 0; setLink('live') }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.snapshot) {
            apply(msg.snapshot)
            if (msg.type === 'update' && Date.now() - lastFetch.current > 15000) {
              lastFetch.current = Date.now() // refresh the point timeline at most every 15s
              qc.invalidateQueries({ queryKey: key })
            }
          }
        } catch { /* ignore malformed frames */ }
      }
      ws.onclose = (ev) => {
        if (stopped || ev.code === 4404) return
        failures.current++
        setLink(failures.current >= 4 ? 'polling' : 'reconnecting')
        timer = setTimeout(connect, Math.min(1000 * 2 ** failures.current, 20000))
      }
      ws.onerror = () => ws?.close()
    }
    connect()
    const onVisible = () => { if (document.visibilityState === 'visible') qc.invalidateQueries({ queryKey: key }) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stopped = true; clearTimeout(timer); ws?.close(); document.removeEventListener('visibilitychange', onVisible) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId])

  return { ...query, link }
}
