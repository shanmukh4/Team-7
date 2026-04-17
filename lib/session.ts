import { NextResponse } from "next/server"

export interface SessionPayload {
  sessionId: string
  userId: string
  email: string
  name: string
  role: string
  createdAt: string
}

const SESSION_COOKIE_NAME = "gs_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, cookie) => {
      const divider = cookie.indexOf("=")
      if (divider === -1) return acc
      const name = cookie.slice(0, divider).trim()
      const value = cookie.slice(divider + 1).trim()
      acc[name] = decodeURIComponent(value)
      return acc
    }, {})
}

export function createSessionResponse(user: {
  id: string
  email: string
  name: string
  role: string
}) {
  const session: SessionPayload = {
    sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
  }

  const response = NextResponse.json({ success: true, session })
  response.cookies.set(SESSION_COOKIE_NAME, encodeURIComponent(JSON.stringify(session)), COOKIE_OPTIONS)
  return response
}

export function destroySessionResponse() {
  const response = NextResponse.json({ success: true, message: "Session ended" })
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  })
  return response
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return null
  }

  const cookies = parseCookies(cookieHeader)
  const rawValue = cookies[SESSION_COOKIE_NAME]
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as SessionPayload
  } catch {
    return null
  }
}
