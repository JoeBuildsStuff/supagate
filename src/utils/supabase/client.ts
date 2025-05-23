import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie
            .split(';')
            .map(c => c.trim())
            .map(c => {
              const [name, ...v] = c.split('=')
              return { name, value: v.join('=') }
            })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; path=${options?.path || '/'}; ${
              options?.maxAge ? `max-age=${options.maxAge}` : ''
            }; ${options?.sameSite ? `samesite=${options.sameSite}` : 'samesite=lax'}`
          })
        },
      },
    }
  )
}