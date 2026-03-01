'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'

type PageAccentContextValue = {
  accentColor: string | null
  setAccentColor: (color: string | null) => void
}

const PageAccentContext = createContext<PageAccentContextValue | null>(null)

const DEFAULT_ACCENT = '#f87171' // Tailwind red-400

/** Darken a hex color by reducing luminance (simple approximation). */
function darkenHex(hex: string, amount = 0.15): string {
  const match = hex.replace(/^#/, '').match(/.{2}/g)
  if (!match) return hex
  const [r, g, b] = match.map((x) => Math.max(0, Math.min(255, parseInt(x, 16) * (1 - amount))))
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export function PageAccentProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState<string | null>(null)
  const setAccentColor = useCallback((color: string | null) => {
    setAccentColorState(color)
  }, [])

  const value = useMemo(
    () => ({ accentColor, setAccentColor }),
    [accentColor, setAccentColor]
  )

  const effective = accentColor ?? DEFAULT_ACCENT
  const style = {
    ['--page-accent' as string]: effective,
    ['--page-accent-hover' as string]: darkenHex(accentColor ?? DEFAULT_ACCENT),
  } as React.CSSProperties

  return (
    <PageAccentContext.Provider value={value}>
      <div className="flex flex-col h-screen min-h-0 overflow-hidden" style={style}>
        {children}
      </div>
    </PageAccentContext.Provider>
  )
}

export function usePageAccent() {
  const ctx = useContext(PageAccentContext)
  if (!ctx) {
    throw new Error('usePageAccent must be used within PageAccentProvider')
  }
  return ctx
}
