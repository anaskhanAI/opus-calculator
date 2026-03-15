import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use implicit flow so password reset tokens arrive as URL hash fragments.
        // signInWithPassword is unaffected — it never uses PKCE or implicit flow.
        flowType: 'implicit',
      },
    }
  )
}
