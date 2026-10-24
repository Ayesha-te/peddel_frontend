import { useEffect } from 'react'

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

/** Client-side SEO + social tags (crawlers use the backend /share/ pages, which carry the same data). */
export function usePageMeta(title: string, description?: string, image?: string | null) {
  useEffect(() => {
    const full = title ? `${title} · Padel Tournaments` : 'Padel Tournaments'
    document.title = full
    setMeta('property', 'og:title', full)
    setMeta('name', 'twitter:title', full)
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    if (image) setMeta('property', 'og:image', image)
  }, [title, description, image])
}
