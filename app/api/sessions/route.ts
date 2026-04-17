import { NextRequest, NextResponse } from "next/server"
import { destroySessionResponse, getSessionFromRequest } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json()
    if (action === "destroy" || action === "delete") {
      return destroySessionResponse()
    }

    return NextResponse.json(
      { success: false, message: "Use /api/auth/login to create a session" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[SESSION API] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 401 })
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error("[SESSION API] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
