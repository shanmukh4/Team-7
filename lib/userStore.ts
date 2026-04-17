import fs from "fs/promises"
import path from "path"

export type User = {
  id: string
  email: string
  password: string
  role: string
  name: string
  department?: string
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json")

const defaultUsers: User[] = [
  {
    id: "1776087332479",
    email: "pranav@goldmansachs.com",
    password: "1234567",
    role: "Sales",
    name: "Pranav",
    department: "Sales",
  },
  {
    id: "1776079762829",
    email: "shannu@goldmansachs.com",
    password: "1234",
    role: "Sales",
    name: "Shanmuk",
    department: "Sales",
  },
  {
    id: "1776079746337",
    email: "aswini@goldmansachs.com",
    password: "1234",
    role: "Financial",
    name: "Aswini",
    department: "Trading",
  },
  {
    id: "1776079374870",
    email: "abhinav@goldmansachs.com",
    password: "1234",
    role: "Financial",
    name: "Abhinav",
    department: "Risk Management",
  },
]

let cachedUsers: User[] | null = null
let usersLoaded = false

async function loadUsersFromFile(): Promise<User[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.users)) {
      return parsed.users
    }
  } catch (error) {
    console.warn("[USER STORE] Could not read users.json, using fallback users.", error)
  }

  return defaultUsers
}

async function persistUsersToFile(users: User[]) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8")
  } catch (error) {
    console.warn("[USER STORE] Could not persist users.json. Changes will remain in memory for this instance.", error)
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (!usersLoaded) {
    cachedUsers = await loadUsersFromFile()
    usersLoaded = true
  }
  return cachedUsers ?? [...defaultUsers]
}

export async function addUser(userData: Omit<User, "id">): Promise<User> {
  const users = await getAllUsers()
  const exists = users.some((user) => user.email === userData.email)
  if (exists) {
    throw new Error("User already exists")
  }

  const newUser: User = {
    id: Date.now().toString(),
    ...userData,
  }

  cachedUsers = [newUser, ...users]
  await persistUsersToFile(cachedUsers)
  return newUser
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getAllUsers()
  const nextUsers = users.filter((user) => user.id !== id)
  if (nextUsers.length === users.length) {
    return false
  }

  cachedUsers = nextUsers
  await persistUsersToFile(cachedUsers)
  return true
}
