import { NextResponse } from "next/server"
import { addUser, deleteUser, getAllUsers } from "@/lib/userStore"

export async function GET() {
  try {
    const users = await getAllUsers()
    return NextResponse.json({ users })
  } catch (err) {
    console.error("[USERS API] Error:", err)
    return NextResponse.json({ users: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, role = "Financial", name = "" } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Missing email or password" }, { status: 400 })
    }

    const user = await addUser({ email, password, role, name })
    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    console.error("[USERS API] Error:", err)
    const message = err?.message || "Could not add user"
    const status = message === "User already exists" ? 409 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 })
    }

    const removed = await deleteUser(id)
    if (!removed) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[USERS API] Error:", err)
    return NextResponse.json({ success: false, message: "Could not delete user" }, { status: 500 })
  }
}
