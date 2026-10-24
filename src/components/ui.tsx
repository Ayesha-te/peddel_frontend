import clsx from 'clsx'
import { AlertTriangle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Phase } from '@/types'

export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('skeleton h-4 w-full', className)} aria-hidden />

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400"><Inbox className="h-6 w-6" /></div>
      <p className="font-semibold text-slate-800">{title}</p>
      {text && <p className="max-w-sm text-sm text-slate-500">{text}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="rounded-full bg-rose-50 p-3 text-rose-500"><AlertTriangle className="h-6 w-6" /></div>
      <p className="font-semibold text-slate-800">{message ?? 'Something went wrong'}</p>
      {onRetry && <button onClick={onRetry} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Try again</button>}
    </div>
  )
}

const PHASE: Record<Phase, { label: string; cls: string }> = {
  live: { label: 'Live', cls: 'bg-rose-500 text-white' },
  upcoming: { label: 'Upcoming', cls: 'bg-sky-100 text-sky-800' },
  completed: { label: 'Completed', cls: 'bg-slate-200 text-slate-700' },
}
export function PhaseBadge({ phase }: { phase: Phase }) {
  const p = PHASE[phase]
  return (
    <span className={clsx('badge', p.cls)}>
      {phase === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {p.label}
    </span>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}
