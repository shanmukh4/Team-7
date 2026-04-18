import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { isAnomalyResolved } from "@/app/api/resolve-anomaly/route"

const TRADING_FILE = path.join(process.cwd(), "data", "trading_desks.json")

export async function GET() {
  const raw = await fs.readFile(TRADING_FILE, "utf8")
  const tradingDesksData = JSON.parse(raw)
  
  // Update status for resolved anomalies
  const updatedTradingDesks = tradingDesksData.tradingDesks.map((desk: any) => {
    if (desk.status === "Anomaly" && isAnomalyResolved(desk.desk_id)) {
      return {
        ...desk,
        status: "Reconciled",
        pnl_reported: desk.pnl_expected, // Update reported P&L to expected after resolution
        variance: 0, // No variance after resolution
        last_updated: new Date().toISOString()
      }
    }
    return desk
  })
  
  // Recalculate summary
  const summary = {
    totalDesks: updatedTradingDesks.length,
    reconciled: updatedTradingDesks.filter((d: any) => d.status === "Reconciled").length,
    pending: updatedTradingDesks.filter((d: any) => d.status === "Pending").length,
    anomalies: updatedTradingDesks.filter((d: any) => d.status === "Anomaly").length
  }
  
  return NextResponse.json({
    tradingDesks: updatedTradingDesks,
    summary
  })
}