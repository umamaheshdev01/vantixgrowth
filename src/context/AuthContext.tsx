'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Role = 'admin' | 'employee'
type Status = 'active' | 'inactive'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: Status
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfile(accessToken: string): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.data as User) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.access_token) {
        const profile = await fetchProfile(session.access_token)
        setUser(profile)
      }
      setLoading(false)
    })

    // Keep auth state in sync
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.access_token) {
        const profile = await fetchProfile(session.access_token)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A56DB]" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
