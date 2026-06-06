import { cookies } from 'next/headers'

import { getSharedCookieDomain } from '@/utils/cookie-domain'

const expiredCookieOptions = {
  path: '/',
  maxAge: 0,
  secure: true,
  sameSite: 'lax' as const,
}

/** Clear Supabase auth cookies on both shared and host-only domains. */
export async function clearSupabaseAuthCookies() {
  const cookieStore = await cookies()
  const sharedDomain = getSharedCookieDomain()

  for (const { name } of cookieStore.getAll()) {
    if (!name.startsWith('sb-')) continue

    cookieStore.set(name, '', expiredCookieOptions)

    if (sharedDomain) {
      cookieStore.set(name, '', { ...expiredCookieOptions, domain: sharedDomain })
    }
  }
}
