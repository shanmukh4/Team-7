import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { action, email, role, name } = await req.json()

    if (action === 'create') {
      // Generate sessionId using Date.now()
      const sessionId = `session_${Date.now()}`
      const loginTime = new Date().toISOString()

      const session = {
        sessionId,
        email,
        role,
        name,
        loginTime,
        isActive: true
      }

      return NextResponse.json({
        success: true,
        sessionId,
        session
      })
    }

    if (action === 'destroy') {
      return NextResponse.json({
        success: true,
        message: 'Session ended'
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[SESSION API] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      sessions: []
    })
  } catch (error) {
    console.error('[SESSION API] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
