import fs from "fs/promises"
import path from "path"

export type UserRole = "admin" | "Financial" | "Sales"

export interface AppUser {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  createdAt: string
}

declare global {
  // allow module-level store persistence across server instances when available
  var gsUserStore: { users: AppUser[] } | undefined
}

const DEFAULT_ADMIN: AppUser = {
  id: "admin-1",
  name: "Administrator",
  email: "admin@goldmansachs.com",
  password: "admin123",
  role: "admin",
  createdAt: new Date().toISOString(),
}

const store = globalThis.gsUserStore ?? { users: [] }
globalThis.gsUserStore = store

function normalizeRole(role: string): UserRole {
  const normalized = role?.toString().trim().toLowerCase()
  if (normalized === "admin") return "admin"
  if (normalized === "sales") return "Sales"
  return "Financial"
}

async function loadInitialUsers(): Promise<AppUser[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "users.json"), "utf8")
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed?.users)) {
      return []
    }

    return parsed.users.map((user: any) => ({
      id: String(user.id ?? Date.now().toString()),
      name: String(user.name ?? "").trim(),
      email: String(user.email ?? "").trim().toLowerCase(),
      password: String(user.password ?? ""),
      role: normalizeRole(String(user.role ?? "Sales")),
      createdAt: String(user.createdAt ?? new Date().toISOString()),
    }))
  } catch {
    return []
  }
}

let initialized = false
async function ensureInitialized() {
  if (initialized) return
  initialized = true

  if (store.users.length === 0) {
    const initialUsers = await loadInitialUsers()
    store.users = initialUsers
  }

  if (!store.users.some((user) => user.email === DEFAULT_ADMIN.email)) {
    store.users.unshift(DEFAULT_ADMIN)
  }
}

export async function getAllUsers(): Promise<AppUser[]> {
  await ensureInitialized()
  return store.users
}

export async function findUserByEmail(email: string): Promise<AppUser | undefined> {
  await ensureInitialized()
  const normalized = email.trim().toLowerCase()
  return store.users.find((user) => user.email === normalized)
}

export async function findUserById(id: string): Promise<AppUser | undefined> {
  await ensureInitialized()
  return store.users.find((user) => user.id === id)
}

export async function createUser({
  name,
  email,
  password,
  role,
}: {
  name: string
  email: string
  password: string
  role: string
}): Promise<AppUser> {
  await ensureInitialized()
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !password || !name) {
    throw new Error("Missing required user fields")
  }

  if (store.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("User already exists")
  }

  const newUser: AppUser = {
    id: Date.now().toString(),
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: normalizeRole(role),
    createdAt: new Date().toISOString(),
  }

  store.users.unshift(newUser)
  return newUser
}

export async function deleteUserById(id: string): Promise<void> {
  await ensureInitialized()
  const index = store.users.findIndex((user) => user.id === id)
  if (index === -1) {
    throw new Error("User not found")
  }
  store.users.splice(index, 1)
}
