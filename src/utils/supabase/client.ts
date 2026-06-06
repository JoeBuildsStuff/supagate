import { createBrowserClient } from '@supabase/ssr'
import { formatBrowserCookie } from '@/utils/cookie-domain'

export function createClient() {
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : undefined

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie
            .split(';')
            .map(c => c.trim())
            .filter(Boolean)
            .map(c => {
              const [name, ...v] = c.split('=')
              return { name, value: v.join('=') }
            })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = formatBrowserCookie(
              name,
              value,
              options ?? {},
              hostname
            )
          })
        },
      },
    }
  )
}