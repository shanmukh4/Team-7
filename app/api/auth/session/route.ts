import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/session"

export async function GET(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ success: false, message: "Session not found" }, { status: 401 })
  }
  return NextResponse.json({ success: true, session })
}
