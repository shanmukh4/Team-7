import { NextResponse } from "next/server"
import tradingDesksData from "@/data/trading_desks.json"
import { isAnomalyResolved } from "@/app/api/resolve-anomaly/route"

export async function GET() {
  try {
    const anomalies = []

    // Filter trading desks for anomalies
    for (const desk of tradingDesksData.tradingDesks) {
      if (desk.status === "Anomaly" && !isAnomalyResolved(desk.desk_id)) {
        const anomaly = {
          desk_id: desk.desk_id,
          desk_name: desk.desk_name,
          issue: "P&L Variance",
          reported_pnl: desk.pnl_reported,
          expected_pnl: desk.pnl_expected,
          variance: desk.variance,
          root_causes: [
            `Variance of $${Math.abs(desk.variance).toFixed(1)}M detected`,
            "Valuation model discrepancy",
            "Market data refresh required"
          ],
          severity: Math.abs(desk.variance) > 10 ? "HIGH" : "MEDIUM"
        }
        anomalies.push(anomaly)
      }
    }

    return NextResponse.json({ anomalies })
  } catch (err) {
    console.error('[ANOMALIES] Error:', err)
    return NextResponse.json({ 
      anomalies: [],
      error: 'Failed to fetch anomalies',
      details: String(err)
    }, { status: 500 })
  }
}