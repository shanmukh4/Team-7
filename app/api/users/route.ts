import { NextResponse } from "next/server"
import { createUser, deleteUserById, getAllUsers } from "@/lib/userStore"
import { getSessionFromRequest } from "@/lib/session"

function isAdminSession(request: Request) {
  const session = getSessionFromRequest(request)
  return session?.role === "admin"
}

export async function GET(request: Request) {
  try {
    if (!isAdminSession(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
    }

    const users = await getAllUsers()
    return NextResponse.json({ success: true, users })
  } catch (err) {
    console.error("[USERS API] GET Error:", err)
    return NextResponse.json({ success: false, users: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdminSession(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
    }

    const { name, email, password, role = "Financial" } = await request.json()
    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: "Name, email and password are required" }, { status: 400 })
    }

    const user = await createUser({ name, email, password, role })
    return NextResponse.json({ success: true, user })
  } catch (err) {
    console.error("[USERS API] POST Error:", err)
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Could not add user" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAdminSession(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 })
    }

    await deleteUserById(String(id))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[USERS API] DELETE Error:", err)
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Could not delete user" },
      { status: 500 }
    )
  }
}
