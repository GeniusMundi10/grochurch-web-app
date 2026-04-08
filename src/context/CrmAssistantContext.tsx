"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"

interface CrmAssistantContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CrmAssistantContext = createContext<CrmAssistantContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function CrmAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <CrmAssistantContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </CrmAssistantContext.Provider>
  )
}

export function useCrmAssistant() {
  return useContext(CrmAssistantContext)
}
