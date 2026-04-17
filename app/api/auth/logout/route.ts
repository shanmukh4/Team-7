import { destroySessionResponse } from "@/lib/session"

export async function POST() {
  return destroySessionResponse()
}
