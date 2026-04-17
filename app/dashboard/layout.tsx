"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/dashboard/navbar"
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        const data = await res.json()
        if (!data.success || !data.session) {
          router.push('/')
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("[DASHBOARD LAYOUT] Failed to check session:", error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pr-[380px]">{children}</main>
      <ChatbotWidget />
    </div>
  )
}
