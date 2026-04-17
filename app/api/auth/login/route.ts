import { findUserByEmail } from "@/lib/userStore"
import { createSessionResponse } from "@/lib/session"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, message: "Email and password are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const user = await findUserByEmail(String(email))
    if (!user || user.password !== String(password)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    return createSessionResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (err) {
    console.error("[AUTH LOGIN] Error:", err)
    return new Response(
      JSON.stringify({ success: false, message: "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
