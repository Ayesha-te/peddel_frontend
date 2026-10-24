export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://peddel.stride-events.net').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The public site is strictly read-only: this client can only issue GET requests. */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 404 ? 'Not found' : 'Something went wrong. Please try again.')
  return (await res.json()) as T
}

export function imageUrl(path?: string | null) {
  return path ? `${API_BASE}${path}` : null
}

export function wsBase() {
  const explicit = import.meta.env.VITE_WS_BASE_URL as string | undefined
  return (explicit ?? API_BASE.replace(/^http/, 'ws')).replace(/\/$/, '')
}

/** Backend page that carries OpenGraph tags for social previews, then redirects humans to the SPA. */
export const shareUrl = (kind: 't' | 'm', id: string) => `${API_BASE}/share/${kind}/${id}/`
