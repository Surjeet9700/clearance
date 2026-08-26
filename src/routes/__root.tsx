/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import appCss from '~/styles/app.css?url'
import '~/webmcp/polyfill'
import { seo } from '~/utils/seo'
import { AgentTools } from '~/webmcp/AgentTools'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ...seo({
        title: 'Clearance | Your agent shops. You set the rules.',
        description:
          'An agent-native storefront: your AI agent does the shopping, but spending rules, approval gates, receipts and undo keep you in control.',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-sm text-white">C</span>
              Clearance
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              <Link to="/" className="hover:text-emerald-600">Store</Link>
              <Link to="/cart" className="hover:text-emerald-600">Cart</Link>
              <Link to="/rules" className="hover:text-emerald-600">Rules</Link>
              <Link to="/receipts" className="hover:text-emerald-600">Receipts</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <AgentTools />
        <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-xs text-neutral-500 dark:text-neutral-500">
          WebMCP Challenge entry · your agent shops inside rules you set · every action lands in a tamper-evident receipt ledger
        </footer>
        {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
        <Scripts />
      </body>
    </html>
  )
}
