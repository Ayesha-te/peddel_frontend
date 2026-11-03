import { useEffect, useState } from 'react'

/** Match clock: server duration at the moment the update arrived + local seconds since (only while the match is live). */
export function useTicker(running: boolean, base: number, since: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])
  return running ? base + (now - since) / 1000 : base
}
