import { convertToModelMessages, streamText, UIMessage } from "ai"
import tradingDesks from "@/data/trading_desks.json"
import marketData from "@/data/market_data.json"
import fxRates from "@/data/fx_rates.json"
import { google } from "@ai-sdk/google"
import { getSessionFromRequest } from "@/lib/session"

export const maxDuration = 30

async function getUserRoleFromSession(req: Request): Promise<string> {
  try {
    const session = getSessionFromRequest(req)
    return session?.role || "unknown"
  } catch (error) {
    console.error("[CHAT-FINANCIAL API] Error getting user role:", error)
    return "unknown"
  }
}

function getFinancialContext() {
  return `
## Goldman Sachs Trading & Financial Data

### Trading Desks
${JSON.stringify(tradingDesks, null, 2)}

### Market Data
${JSON.stringify(marketData, null, 2)}

### FX Rates
${JSON.stringify(fxRates, null, 2)}
`
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    // Get user role from session
    const userRole = await getUserRoleFromSession(req)

    console.log(`[CHAT-FINANCIAL API] User Role: ${userRole}`)
    console.log(`[CHAT-FINANCIAL API] Received ${messages.length} messages`)

    // Extract query message
    const lastMsg = messages[messages.length - 1] as any
    const lastMessage =
      lastMsg?.parts?.map((p: any) => p.text || "").join(" ") ||
      lastMsg?.text ||
      ""

    // NOTE: Financial chatbot is NOT restricted - works for all users
    console.log(`[CHAT-FINANCIAL API] Processing query for role: ${userRole}`)

    const systemPrompt = `You are an AI Finance Assistant for Goldman Sachs Daily P&L Reconciliation system. You specialize in analyzing trading desk anomalies, P&L variances, and providing financial insights.

${getFinancialContext()}

Your responsibilities:
1. Analyze P&L variances and identify root causes
2. Provide recommendations for resolution
3. Explain market data and FX rate impacts
4. Help reconcile trading desk positions
5. Assess financial risk and anomalies

Guidelines:
- Be precise with financial data
- Format currency values clearly (e.g., $15.2M)
- Provide actionable recommendations
- Identify root causes systematically
- Use clear, professional language
- When analyzing anomalies, consider market data staleness and FX rate changes

When responding:
- Lead with the key issue
- Explain the root cause
- Recommend specific actions
- Provide impact assessment
- Use plain text format (no markdown)`

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      abortSignal: req.signal,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[CHAT-FINANCIAL API] Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process financial chat request",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
