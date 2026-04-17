"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Sparkles, Bot, Zap, AlertCircle, Lock, Mic, Globe } from "lucide-react"
import { ComparisonChart } from "./comparison-chart"
import { useChatbot } from "./chatbot-provider"
import { anomalyStateService } from "@/components/anomaly-state.service"
import { isFinancialQuery } from "@/app/api/utils/simple-rbac"

interface ComparisonData {
  companies: string[]
  metrics: Array<{
    name: string
    [key: string]: string | number
  }>
}

interface ErrorResponse {
  error?: string
  message?: string
  details?: string
}

export function ChatbotWidget() {
  const [input, setInput] = useState("")
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [resolving, setResolving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentAnomalyId, setCurrentAnomalyId] = useState<string | null>(null)
  const [isAnomalyMode, setIsAnomalyMode] = useState(false)
  const [error, setError] = useState<ErrorResponse | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'en-US'>('en-IN')
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { pendingAnomaly, setPendingAnomaly, onAnomalyResolved } = useChatbot()
  const pathname = usePathname()

  // Helper function to clean duplicate phrases
  const cleanDuplicatePhrases = (text: string): string => {
    // Remove repeated words like "this is this is" -> "this is"
    const words = text.split(' ')
    const cleaned: string[] = []
    
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i].toLowerCase()
      const nextWord = words[i + 1]?.toLowerCase()
      
      // Skip if this word is the same as the next word (simple duplicate detection)
      if (currentWord === nextWord && currentWord.length > 2) {
        continue
      }
      
      cleaned.push(words[i])
    }
    
    return cleaned.join(' ')
  }

  // Helper function to auto-capitalize first letter
  const capitalizeFirstLetter = (text: string): string => {
    if (!text) return text
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  // Get user role and session from localStorage on mount
  useEffect(() => {
    const fetchUserData = () => {
      try {
        const userStr = localStorage.getItem('gs_user')
        if (userStr) {
          const user = JSON.parse(userStr)
          setUserRole(user.role)
          console.log("[CHATBOT] User role from storage:", user.role)
        } else {
          console.log("[CHATBOT] No user data found")
        }

        const sessId = localStorage.getItem('gs_session_id')
        if (sessId) {
          setSessionId(sessId)
          console.log("[CHATBOT] Session ID from storage:", sessId)
        }
      } catch (error) {
        console.error("[CHATBOT] Failed to load user data:", error)
      }
    }

    fetchUserData()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = speechLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      setRecording(true)
      inputRef.current?.focus()
    }

    recognition.onresult = (event: any) => {
      // Use only the latest result to prevent duplication
      const resultIndex = event.resultIndex
      const result = event.results[resultIndex]
      
      if (result && result[0]) {
        const transcript = result[0].transcript.trim()
        const confidence = result[0].confidence || 0
        
        // Only use results with reasonable confidence
        if (confidence > 0.5 || transcript.length > 0) {
          // Clean duplicates and capitalize first letter
          const cleanedTranscript = cleanDuplicatePhrases(transcript)
          const capitalizedTranscript = capitalizeFirstLetter(cleanedTranscript)
          
          setInput((current) => {
            // If there's existing text, append with space
            // If empty, use the transcript directly
            return current ? `${current} ${capitalizedTranscript}` : capitalizedTranscript
          })
        }
      }
    }

    recognition.onend = () => {
      setRecording(false)
      // Small delay before focusing to prevent interference
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }

    recognition.onerror = (event: any) => {
      console.error("[CHATBOT] Speech recognition error:", event)
      setRecording(false)
      recognition.stop?.()
    }

    recognitionRef.current = recognition
    setSpeechSupported(true)
  }, [speechLanguage])

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      console.error("[CHATBOT] Speech recognition not initialized")
      return
    }

    if (recording) {
      recognitionRef.current.stop()
      setRecording(false)
      return
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error("[CHATBOT] Speech recognition start error:", error)
      setRecording(false)
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  /**
   * Parse error response from API
   * Handles both structured error objects and plain error messages
   */
  const parseErrorResponse = (error: any): ErrorResponse => {
    // If it's already a structured error object
    if (error?.error || error?.message) {
      return {
        error: error.error,
        message: error.message,
        details: error.details,
      }
    }

    // If it's a string, try to parse as JSON
    if (typeof error === "string") {
      try {
        const parsed = JSON.parse(error)
        if (parsed?.error || parsed?.message) {
          return {
            error: parsed.error || "Error",
            message: parsed.message || String(parsed),
            details: parsed.details,
          }
        }
      } catch {}
      // If not JSON, return as generic message
      return {
        error: "Error",
        message: error,
      }
    }

    // If the error object has a message but no explicit error type, normalize it
    if (error?.message) {
      return {
        error: error.error || "Error",
        message: error.message,
        details: error.details,
      }
    }

    // Fallback
    return {
      error: "Error",
      message: "An unexpected error occurred",
    }
  }

  const isFinancial = pathname.includes('/financial')
  const api = isFinancial ? '/api/chat-financial' : '/api/chat'

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api,
    }),
    headers: {
      'x-user-role': userRole || 'unknown',
      'x-session-id': sessionId || '',
    },
    onError: (error) => {
      console.error("[CHATBOT] Error:", error)
      // Try to extract the error response from the error object
      const errorData = (error as any)?.data || error
      const parsedError = parseErrorResponse(errorData)
      setError(parsedError)
    },
    onFinish: (result) => {
      console.log("[CHATBOT] Message finished")
      const text = ((result.message as any).parts || [])
        .filter((part: any) => part?.type === "text" || part?.type === "reasoning")
        .map((part: any) => part.text || "")
        .join("")

      if (text.includes("COMPARISON_DATA:")) {
        try {
          const jsonMatch = text.match(/COMPARISON_DATA:([\s\S]*?)END_COMPARISON/)
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1])
            setComparisonData(data)
          }
        } catch {}
      }
    },
  })

  // Custom submit handler with frontend RBAC check
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const normalizedRole = userRole?.toLowerCase()

    // 🔒 FRONTEND RBAC: Block financial queries for sales users BEFORE sending to backend
    if (normalizedRole === "sales" && isFinancialQuery(input)) {
      console.warn(`[CHATBOT] Frontend RBAC: Sales user blocked from financial query: "${input}"`)
      setError({
        error: "Access Restricted",
        message: "🔒 You do not have permission to view financial data."
      })
      setInput("") // Clear input
      return
    }

    // ✅ Safe to send - not a financial query or user has permission
    setComparisonData(null)
    setError(null)
    sendMessage({ text: input })
    setInput("")
  }

  const isLoading = status === "streaming" || status === "submitted"

  const isUserNearBottom = () => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  useEffect(() => {
    if (isUserNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Handle pending anomaly from financial dashboard
  useEffect(() => {
    if (pendingAnomaly) {
      const normalizedRole = userRole?.toLowerCase()
      if (normalizedRole === "sales") {
        console.warn("[CHATBOT] Sales user blocked from pending anomaly analysis")
        setError({
          error: "Access Restricted",
          message: "🔒 You do not have permission to analyze P&L anomalies."
        })
        return
      }

      console.log("[CHATBOT] Received pending anomaly:", pendingAnomaly)
      setIsAnomalyMode(true)
      setError(null)
      const anomalyMessage = `Please analyze and resolve this P&L anomaly:

**Desk:** ${pendingAnomaly.desk_name}
**Issue:** ${pendingAnomaly.issue}
**Reported P&L:** $${pendingAnomaly.reported_pnl}M
**Expected P&L:** $${pendingAnomaly.expected_pnl}M
**Variance:** $${pendingAnomaly.variance}M
**Severity:** ${pendingAnomaly.severity}

**Root Causes Identified:**
${pendingAnomaly.root_causes.map((cause) => `- ${cause}`).join('\n')}

Please provide a detailed analysis and solution recommendations. After analysis, confirm if you're ready to proceed with automated resolution.`

      setComparisonData(null)
      console.log("[CHATBOT] Sending anomaly message to AI...")
      sendMessage({ text: anomalyMessage })
      // Don't clear pendingAnomaly here - keep it for the resolve button!
    }
  }, [pendingAnomaly, sendMessage])

  const getMessageText = (message: typeof messages[0]) => {
    return (message as any).parts
      ?.filter((part: any) => part?.type === "text" || part?.type === "reasoning")
      .map((part: any) => part.text || "")
      .join("") || ""
  }

  const normalizeChatText = (text: string) => {
    return text
      .replace(/^\s*\*\s+/gm, "- ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*#{1,6}\s*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }

  const formatMessageText = (text: string) => {
    return normalizeChatText(text.replace(/COMPARISON_DATA:[\s\S]*?END_COMPARISON/g, "")).trim()
  }

  const handleResolveAnomaly = async (deskId: string) => {
    if (!pendingAnomaly) return
    
    setResolving(true)
    setCurrentAnomalyId(deskId)
    setProgress(0)

    // 4-5 second progress animation
    const duration = 4500 // 4.5 seconds
    const startTime = Date.now()
    const animateProgress = () => {
      const elapsed = Date.now() - startTime
      const progressPercent = Math.min((elapsed / duration) * 100, 100)
      setProgress(progressPercent)

      if (progressPercent < 100) {
        requestAnimationFrame(animateProgress)
      } else {
        // Resolve complete - call API and refresh
        fetch('/api/resolve-anomaly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ desk_id: deskId })
        }).then(async (response) => {
          // Wait a moment for API to complete
          await new Promise(resolve => setTimeout(resolve, 500))

          try {
            const anomaliesResponse = await fetch('/api/anomalies')
            const anomaliesData = await anomaliesResponse.json()
            anomalyStateService.updateAnomalyCount(anomaliesData.anomalies.length)
          } catch (error) {
            console.error('[CHATBOT] Failed to refresh anomaly count:', error)
          }

          // Call the refresh callback to update dashboard
          if (onAnomalyResolved && typeof onAnomalyResolved === 'function') {
            try {
              await onAnomalyResolved()
            } catch (err) {
              console.error('Error calling onAnomalyResolved:', err)
            }
          }
        }).catch(err => console.error('Failed to resolve:', err))
        
        setResolving(false)
        setCurrentAnomalyId(null)
        setProgress(0)
        setPendingAnomaly(null)
        setIsAnomalyMode(false)
      }
    }

    requestAnimationFrame(animateProgress)
  }

  return (
    <>
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <Card className="fixed top-20 right-0 bottom-0 w-[360px] flex flex-col shadow-2xl z-50 overflow-hidden border-l border-violet-900/30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-violet-900/20 shrink-0 px-4 bg-gradient-to-r from-violet-900/10 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">GSAI Assistant</CardTitle>
                <p className="text-xs text-violet-300/60">Voice-enabled financial AI</p>
              </div>
            </div>
            <div className="text-xs text-violet-300/50 font-medium">Right panel</div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/50 to-slate-950">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-4">
            {error && (
              <div className="bg-gradient-to-br from-red-950/60 to-red-950/40 border border-red-700/40 rounded-lg backdrop-blur-sm overflow-hidden shadow-lg">
                <div className="p-4 space-y-3">
                  {/* Error Header */}
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-200">
                        {error.error || "Error"}
                      </h3>
                    </div>
                  </div>

                  {/* Error Message */}
                  <p className="text-red-300/90 text-sm leading-relaxed pl-8">
                    {error.message || "You don't have permission to access this resource."}
                  </p>

                  {/* Error Details */}
                  {error.details && (
                    <p className="text-red-300/60 text-xs leading-relaxed pl-8 italic">
                      {error.details}
                    </p>
                  )}

                  {/* Action Button */}
                  <div className="flex justify-end gap-2 pt-2 pl-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setError(null)}
                      className="border-red-700/40 text-red-300 hover:bg-red-950/40 hover:text-red-200"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 && !error && (
              <div className="text-center py-12">
                <div className="p-3 bg-gradient-to-br from-violet-900/20 to-purple-900/10 rounded-2xl w-fit mx-auto mb-4 border border-violet-700/20">
                  <Bot className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-sm text-violet-300/70 font-medium">
                  Ask me about clients, comparisons, or insights.
                </p>
                <p className="text-xs text-violet-300/40 mt-2">
                  Data access restricted by role
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const text = formatMessageText(getMessageText(message))
              const isLastMessage = index === messages.length - 1
              const isAssistantMessage = message.role === "assistant"
              const showResolveButton = isLastMessage && isAssistantMessage && isAnomalyMode && pendingAnomaly && !resolving

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`px-4 py-3 rounded-xl text-sm font-medium ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20"
                          : "bg-slate-800/60 border border-slate-700/50 text-slate-200 backdrop-blur-sm"
                      }`}
                    >
                      {text}
                    </div>
                    
                    {showResolveButton && (
                      <Button
                        size="default"
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-500/30"
                        onClick={() => handleResolveAnomaly(pendingAnomaly.desk_id)}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Resolve Anomaly
                      </Button>
                    )}

                    {currentAnomalyId === pendingAnomaly?.desk_id && resolving && (
                      <div className="space-y-2">
                        <div className="w-full bg-slate-700/50 rounded-full overflow-hidden h-3 shadow-lg border border-slate-600/50">
                          <div 
                            className="h-3 transition-all duration-300 rounded-full shadow-md"
                            style={{ 
                              width: `${progress}%`,
                              background: progress < 33 
                                ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' 
                                : progress < 66
                                ? 'linear-gradient(90deg, #06b6d4, #10b981)'
                                : 'linear-gradient(90deg, #10b981, #34d399)',
                            }} 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-300 font-medium">Resolving anomaly...</p>
                          <span className="text-xs font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-violet-950/30 border border-violet-700/30 px-4 py-2 rounded-lg flex gap-1">
                  <span className="animate-bounce text-violet-400">.</span>
                  <span className="animate-bounce delay-150 text-violet-400">.</span>
                  <span className="animate-bounce delay-300 text-violet-400">.</span>
                </div>
              </div>
            )}

            {comparisonData && <ComparisonChart data={comparisonData} />}
            <div ref={bottomRef} />
          </div>

          {/* Language Selector */}
          <div className="px-4 py-1 border-t border-violet-900/20 bg-gradient-to-r from-violet-900/5 to-transparent">
            <div className="flex items-center justify-center gap-1 text-[10px]">
              <Globe className="w-3 h-3 text-violet-400/70" />
              <select
                value={speechLanguage}
                onChange={(e) => setSpeechLanguage(e.target.value as 'en-IN' | 'en-US')}
                className="bg-transparent border-none text-violet-300/70 text-[10px] cursor-pointer focus:outline-none focus:ring-0 hover:text-violet-200"
                disabled={recording}
              >
                <option value="en-IN">IN</option>
                <option value="en-US">US</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-violet-900/30 bg-gradient-to-t from-slate-950 to-slate-900/50 backdrop-blur-sm">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  id="chatbot-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={recording ? "Listening..." : "Ask a question..."}
                  disabled={isLoading}
                  className="w-full text-sm placeholder:text-sm bg-slate-800/60 border-slate-700/50 text-white placeholder-slate-500 focus-visible:ring-violet-500 focus-visible:border-violet-500"
                />
              </div>
              <Button
                type="button"
                onClick={handleVoiceToggle}
                title={recording ? "Stop recording" : "Start voice input"}
                aria-label="Voice input"
                size="icon"
                className={`h-10 w-10 min-w-[2.5rem] rounded-xl border border-pink-500/30 text-white ${recording ? 'bg-pink-500/95 ring ring-pink-400/60 animate-pulse' : 'bg-gradient-to-br from-pink-600 to-violet-600'} hover:from-fuchsia-500 hover:to-violet-500 shadow-lg shadow-pink-500/20 disabled:opacity-50`}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
