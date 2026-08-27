import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export type GitHubSignInOptions = {
  redirect?: string
}

export const useSupabase = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      signInWithGitHub: async (_options?: GitHubSignInOptions) => { throw new Error('Supabase环境变量未配置') },
      getUser: async () => null,
      signOut: async () => {},
      enabled: false
    }
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }

  const signInWithGitHub = async ({ redirect = '/home' }: GitHubSignInOptions = {}) => {
    const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/home'
    const configuredOrigin = String(import.meta.env.VITE_PUBLIC_APP_ORIGIN || '').trim()
    const appOrigin = configuredOrigin || window.location.origin
    const callback = new URL('/auth/github-callback', appOrigin)
    callback.searchParams.set('redirect', safeRedirect)
    const { data, error } = await supabaseInstance!.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: callback.toString()
      }
    })
    if (error) throw error
    return data
  }

  const getUser = async () => {
    const client = supabaseInstance!
    let { data: { session } } = await client.auth.getSession()

    // Implicit OAuth returns tokens in the URL hash. Explicitly hydrate the
    // client so the callback page does not race Supabase's URL detector.
    if (!session && typeof window !== 'undefined' && window.location.hash) {
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        const result = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (result.error) throw result.error
        session = result.data.session
      }
    }

    if (!session && typeof window !== 'undefined') {
      const deadline = Date.now() + 8000
      while (Date.now() < deadline && !session) {
        await new Promise(resolve => window.setTimeout(resolve, 100))
        session = (await client.auth.getSession()).data.session
      }
    }
    if (!session) return null

    const { data: { user }, error } = await client.auth.getUser()
    if (error) throw error
    return user
  }

  const signOut = async () => {
    const { error } = await supabaseInstance!.auth.signOut()
    if (error) throw error
  }

  return {
    signInWithGitHub,
    getUser,
    signOut,
    enabled: true
  }
}
