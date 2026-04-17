import { NextResponse } from "next/server"
import { getAllUsers } from "@/lib/userStore"

const ADMIN_EMAIL = "admin@goldmansachs.com"
const ADMIN_PASSWORD = "goldmansachs_admin"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true, isAdmin: true })
    }

    const users = await getAllUsers()
    const user = users.find((u) => u.email === email && u.password === password)

    if (user) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || (user.role === "Financial" ? "Trading" : "Sales"),
        },
      })
    }

    return NextResponse.json({ success: false, message: "Invalid email or password" }, { status: 401 })
  } catch (err) {
    console.error("[AUTH LOGIN] Error:", err)
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
