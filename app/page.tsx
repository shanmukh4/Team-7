"use client"

import React, { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.message || 'Invalid credentials')
        setLoading(false)
        return
      }

      const role = String(data.session?.role || '').toLowerCase()
      if (role === 'admin') {
        router.push('/dashboard/admin')
      } else if (role.includes('financial')) {
        router.push('/dashboard/financial')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }

  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#080808] to-gray-900 text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image 
              src="/Goldman Sachs.jpg" 
              alt="Goldman Sachs Logo" 
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">Goldman Sachs — Enterprise Access</h1>
          <p className="text-sm text-gray-400">Secure sign in</p>
        </div>

        <div className="glass-card p-6 rounded-xl backdrop-blur-md bg-black/40 border border-gray-800 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-red-900/60 text-red-300 p-2 rounded">{error}</div>}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-[#0b0b0b] border border-gray-700 p-3 outline-none focus:ring-2 focus:ring-amber-400 transition"
                type="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-[#0b0b0b] border border-gray-700 p-3 outline-none focus:ring-2 focus:ring-amber-400 transition"
                type="password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
