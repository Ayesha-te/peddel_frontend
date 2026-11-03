import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { getJson, wsBase } from '@/api/client'
import type { StreamState } from '@/types'

export type StreamLink = 'connecting' | 'live' | 'reconnecting' | 'polling'

/**
 * Which match is live (and what is next) for a tournament broadcast, plus its branding.
 * - REST gives the state on load/refresh; the WebSocket pushes every change the admin makes in the streaming queue.
 * - After a disconnect the socket sends a fresh state on reconnect; if it keeps failing we fall back to slow polling.
 */
export function useStream(slug: string | undefined) {
  const qc = useQueryClient()
  const key = ['stream', slug]
  const [link, setLink] = useState<StreamLink>('connecting')
  const failures = useRef(0)

  const query = useQuery<StreamState>({
    queryKey: key,
    queryFn: ({ signal }) => getJson<StreamState>(`/api/public/stream/${slug}/`, signal),
    enabled: !!slug,
    refetchInterval: link === 'polling' ? 5000 : false,
    retry: (n, err) => (err as { status?: number }).status !== 404 && n < 3,
  })

  useEffect(() => {
    if (!slug) return
    let ws: WebSocket | null = null
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const connect = () => {
      try {
        ws = new WebSocket(`${wsBase()}/ws/stream/${slug}/`)
      } catch {
        setLink('polling')
        return
      }
      ws.onopen = () => { failures.current = 0; setLink('live') }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'state' && msg.state) {
            // the socket carries live/next/brand; keep tournament identity from the REST response
            qc.setQueryData<StreamState>(key, (old) => ({ ...(old ?? ({} as StreamState)), ...msg.state, tournament: old?.tournament ?? msg.state.tournament }))
            if (!qc.getQueryData<StreamState>(key)?.tournament) qc.invalidateQueries({ queryKey: key })
          }
        } catch { /* ignore malformed frames */ }
      }
      ws.onclose = (ev) => {
        if (stopped || ev.code === 4404) return
        failures.current++
        setLink(failures.current >= 4 ? 'polling' : 'reconnecting')
        timer = setTimeout(connect, Math.min(1000 * 2 ** failures.current, 15000))
      }
      ws.onerror = () => ws?.close()
    }
    connect()
    const onVisible = () => { if (document.visibilityState === 'visible') qc.invalidateQueries({ queryKey: key }) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stopped = true; clearTimeout(timer); ws?.close(); document.removeEventListener('visibilitychange', onVisible) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return { ...query, link }
}
