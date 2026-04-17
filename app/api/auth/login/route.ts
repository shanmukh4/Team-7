import { NextResponse } from "next/server"

const ADMIN_EMAIL = "admin@goldmansachs.com"
const ADMIN_PASSWORD = "admin123"

// Mock users data for production compatibility
const mockUsers = [
  {
    id: "1776087332479",
    email: "pranav@goldmansachs.com",
    password: "1234567",
    role: "Sales",
    name: "Pranav",
    department: "Sales"
  },
  {
    id: "1776079762829",
    email: "shannu@goldmansachs.com",
    password: "1234",
    role: "Sales",
    name: "Shanmuk",
    department: "Sales"
  },
  {
    id: "1776079746337",
    email: "aswini@goldmansachs.com",
    password: "1234",
    role: "Financial",
    name: "Aswini",
    department: "Trading"
  }
]

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Hardcoded admin path
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true, isAdmin: true })
      const cookieOptions = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      }

      response.cookies.set('gs_session', 'valid_admin_session', cookieOptions)
      response.cookies.set('gs_role', 'admin', cookieOptions)
      response.cookies.set('gs_email', ADMIN_EMAIL, cookieOptions)

      return response
    }

    // Find user in mock data
    const user = mockUsers.find((u: any) => u.email === email && u.password === password)

    if (user) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      })
    }

    return NextResponse.json({ success: false, message: "Invalid email or password" }, { status: 401 })
  } catch (err) {
    console.error("[AUTH LOGIN] Error:", err)
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
