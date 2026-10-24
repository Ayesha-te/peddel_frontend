import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import PublicLayout from '@/layouts/PublicLayout'
import './index.css'

const Directory = lazy(() => import('@/features/public-tournaments/DirectoryPage'))
const Tournament = lazy(() => import('@/features/public-tournaments/TournamentPage'))
const Match = lazy(() => import('@/features/matches/MatchPage'))

const fallback = <div className="mx-auto max-w-6xl px-4 py-10"><div className="skeleton h-40 w-full rounded-2xl" /></div>
const S = ({ children }: { children: React.ReactNode }) => <Suspense fallback={fallback}>{children}</Suspense>

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/public-tournaments" replace /> },
      { path: 'public-tournaments', element: <S><Directory /></S> },
      { path: 'public-tournaments/:slug', element: <S><Tournament /></S> },
      { path: 'matches/:publicId', element: <S><Match /></S> },
      { path: '*', element: <Navigate to="/public-tournaments" replace /> },
    ],
  },
])

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
