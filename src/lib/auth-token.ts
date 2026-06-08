// In-memory access token kept in sync by AuthContext.
// Avoids calling supabase.auth.getSession() during onAuthStateChange callbacks,
// which can deadlock in Supabase JS v2.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessTokenSync(): string | null {
  return accessToken
}
