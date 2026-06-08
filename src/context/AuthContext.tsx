'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react'
import { Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { setAccessToken } from '@/lib/auth-token'

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
  const profileRequestId = useRef(0)

  const applySession = useCallback((next: Session | null) => {
    setSession(next)
    setAccessToken(next?.access_token ?? null)
  }, [])

  const syncProfile = useCallback((next: Session | null) => {
    const requestId = ++profileRequestId.current

    if (!next?.access_token) {
      setUser(null)
      return Promise.resolve()
    }

    return fetchProfile(next.access_token).then((profile) => {
      if (requestId !== profileRequestId.current) return
      setUser(profile)
    })
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (!mounted) return
      applySession(initial)
      await syncProfile(initial)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      // Defer async work — awaiting inside this callback can deadlock getSession().
      setTimeout(() => {
        if (!mounted) return
        applySession(next)
        void syncProfile(next).finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [applySession, syncProfile])

  const login = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const next = data.session
    if (!next?.access_token) throw new Error('Sign-in succeeded but no session was returned')

    applySession(next)
    const profile = await fetchProfile(next.access_token)
    if (!profile) {
      await supabase.auth.signOut()
      applySession(null)
      setUser(null)
      throw new Error(
        'Your login is valid but this account is not set up in the dashboard. Contact an admin.',
      )
    }

    setUser(profile)
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
    applySession(null)
    setUser(null)
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
