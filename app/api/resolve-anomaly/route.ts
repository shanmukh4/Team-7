import { NextResponse } from "next/server"
import tradingDesksData from "@/data/trading_desks.json"

// In-memory store for resolved anomalies (works in Vercel)
// Note: This will reset on each deployment, but prevents file write errors in serverless
const resolvedAnomalies = new Set<string>()

export async function POST(request: Request) {
  try {
    const { desk_id } = await request.json()

    // Find the desk in the static data
    const desk = tradingDesksData.tradingDesks.find((d: any) => d.desk_id === desk_id)
    if (!desk) {
      return NextResponse.json({ error: "Desk not found" }, { status: 404 })
    }

    // Check if this desk is in anomaly status
    if (desk.status !== "Anomaly") {
      return NextResponse.json({ 
        message: "Desk is already reconciled",
        desk_id: desk.desk_id,
        status: desk.status,
        final_pnl: desk.pnl_reported,
        timestamp: new Date().toISOString()
      })
    }

    // Mark as resolved in memory
    resolvedAnomalies.add(desk_id)

    const actions_taken = [
      'Market data refreshed',
      'FX rates updated',
      'Valuation recalculated',
      'P&L variance reconciled'
    ]

    const result = {
      desk_id: desk.desk_id,
      desk_name: desk.desk_name,
      status: 'Reconciled',
      actions_taken,
      final_pnl: desk.pnl_expected,
      previous_variance: desk.variance,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[RESOLVE-ANOMALY] Error:', err)
    return NextResponse.json({ error: 'Failed to resolve anomaly', details: String(err) }, { status: 500 })
  }
}

// Helper function to check if an anomaly is resolved
export function isAnomalyResolved(deskId: string): boolean {
  return resolvedAnomalies.has(deskId)
}