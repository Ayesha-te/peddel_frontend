import { Link, Outlet } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/public-tournaments" className="flex items-center gap-2.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ball-400 font-black text-ink-900">P</span>
            <span className="text-base font-extrabold tracking-tight">Padel Tournaments</span>
          </Link>
          <nav aria-label="Main"><Link to="/public-tournaments" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">Tournaments</Link></nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Live scores and results · Updated in real time
      </footer>
    </div>
  )
}
