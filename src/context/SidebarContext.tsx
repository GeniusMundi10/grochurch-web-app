"use client"
import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
    expanded: boolean
    setExpanded: (expanded: boolean) => void
    toggleSidebar: () => void
    isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [expanded, setExpanded] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            if (mobile) setExpanded(false)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const toggleSidebar = () => setExpanded(prev => !prev)

    return (
        <SidebarContext.Provider value={{ expanded, setExpanded, toggleSidebar, isMobile }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (context === undefined) {
        return {
            expanded: false,
            setExpanded: () => { },
            toggleSidebar: () => { },
            isMobile: false,
        }
    }
    return context
}
