import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const useSupabase = () => {
  if (!supabaseInstance) {
    const config = useRuntimeConfig()
    supabaseInstance = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )
  }

  const signInWithGitHub = async () => {
    const { data, error } = await supabaseInstance!.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/github-callback`
      }
    })
    if (error) throw error
    return data
  }

  const getUser = async () => {
    const { data: { user }, error } = await supabaseInstance!.auth.getUser()
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
    signOut
  }
}
