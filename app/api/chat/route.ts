import { convertToModelMessages, streamText, UIMessage } from "ai"
import { cookies } from "next/headers"
import fs from "fs/promises"
import path from "path"
import companies from "@/data/companies.json"
import crm from "@/data/crm.json"
import assetManagement from "@/data/asset_management.json"
import investmentBanking from "@/data/investment_banking.json"
import trading from "@/data/trading.json"
import leadGeneration from "@/data/lead_generation.json"
import riskAnalysis from "@/data/risk_analysis.json"
import relationshipHistory from "@/data/relationship_history.json"
import { google } from "@ai-sdk/google"
import { authorize } from "@/app/api/utils/simple-rbac"

export const maxDuration = 30

async function getUserRoleFromSession(req: Request): Promise<string> {
  try {
    // Try to get session ID from cookie or body
    const cookieStore = await cookies()
    let sessionId = cookieStore.get("gs_session_id")?.value

    // If no cookie, try to extract from request body or headers
    if (!sessionId) {
      const authHeader = req.headers.get("x-session-id")
      if (authHeader) {
        sessionId = authHeader
      }
    }

    if (sessionId) {
      // Read sessions file
      const sessionsFile = path.join(process.cwd(), "data", "sessions.json")
      const data = await fs.readFile(sessionsFile, "utf-8")
      const sessionsData = JSON.parse(data) as { sessions: Array<{ sessionId: string; role: string }> }
      
      const session = sessionsData.sessions.find(s => s.sessionId === sessionId)
      if (session) {
        return session.role
      }
    }

    // Fallback: check x-user-role header
    const userRoleHeader = req.headers.get("x-user-role")
    if (userRoleHeader) {
      return userRoleHeader
    }

    return "unknown"
  } catch (error) {
    console.error("[CHAT API] Error getting user role:", error)
    return "unknown"
  }
}

function getDatabaseContext() {
  return `
## GSAI Client Database

### Companies Overview
${JSON.stringify(companies, null, 2)}

### CRM Data (Contacts & Leadership)
${JSON.stringify(crm, null, 2)}

### Asset Management Data
${JSON.stringify(assetManagement, null, 2)}

### Investment Banking Data
${JSON.stringify(investmentBanking, null, 2)}

### Trading Data
${JSON.stringify(trading, null, 2)}

### Lead Generation Data
${JSON.stringify(leadGeneration, null, 2)}

### Risk Analysis Data
${JSON.stringify(riskAnalysis, null, 2)}

### Relationship History Data
${JSON.stringify(relationshipHistory, null, 2)}
`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages } = body as { messages: UIMessage[] }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get user role from session
    const userRole = await getUserRoleFromSession(req)

    console.log(`[CHAT API] User Role: ${userRole}`)
    console.log(`[CHAT API] Received ${messages.length} messages`)

    // Extract last message for authorization check
    const lastMsg = messages[messages.length - 1] as any
    const lastMessage = lastMsg?.parts?.map((p: any) => p.text || "").join(" ") || lastMsg?.text || ""

    // Perform RBAC authorization before calling LLM
    const auth = authorize({ role: userRole }, lastMessage);

    if (!auth.allowed) {
      console.log(`[CHAT API] Access Denied - Role: ${userRole}, Query: "${lastMessage}"`)
      return new Response(
        JSON.stringify({
          error: "Access Restricted",
          message: auth.message
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    console.log(`[CHAT API] Authorization Successful - Role: ${userRole}`)

    const systemPrompt = `You are GSAI for the Goldman Sachs Trading Platform. You have access to comprehensive trading data including P&L reconciliation, anomaly detection, and trading desk management.

When analyzing P&L anomalies, provide CONCISE analysis in 5-10 lines maximum.

For anomalies, respond with:
1. Brief issue summary (1-2 lines)
2. Root cause (1-2 lines)
3. Resolution steps (2-3 lines)
4. Expected P&L after fix (1 line)
5. Recommendation: "Ready to proceed with automated resolution"

Keep it SHORT and DIRECT. No lengthy explanations.

${getDatabaseContext()}

Guidelines:
- For P&L anomalies: Provide BRIEF expert analysis (max 10 lines)
- For client queries: Use the client database above
- Be concise and professional
- Use plain text only - no Markdown
- Always reference relevant trading desk or desk IDs when applicable`

    console.log(`[CHAT API] Initializing Gemini model...`)
    const model = google("gemini-2.5-flash")
    
    const convertedMessages = await convertToModelMessages(messages)
    console.log(`[CHAT API] Converted ${convertedMessages.length} messages for model`)

    const result = streamText({
      model,
      system: systemPrompt,
      messages: convertedMessages,
      abortSignal: req.signal,
    })

    console.log(`[CHAT API] Stream initiated, returning response...`)
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error(`[CHAT API ERROR]`, error)
    return new Response(
      JSON.stringify({ 
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}