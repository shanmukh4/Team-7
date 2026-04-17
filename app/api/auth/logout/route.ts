import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const cookieOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }

  response.cookies.set('gs_session', '', { ...cookieOptions, maxAge: 0 })
  response.cookies.set('gs_role', '', { ...cookieOptions, maxAge: 0 })
  response.cookies.set('gs_email', '', { ...cookieOptions, maxAge: 0 })

  return response
}
