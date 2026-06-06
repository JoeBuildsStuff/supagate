import { cookies } from 'next/headers'

import { getSharedCookieDomain } from '@/utils/cookie-domain'
import { sanitizeRedirectTarget } from '@/utils/safe-redirect'

const COOKIE_NAME = 'supagate-auth-next'
const MAX_AGE_SECONDS = 60 * 10

function redirectCookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    domain: getSharedCookieDomain(),
  }
}

/** Remember where to send the user after OAuth/magic-link (Supabase rejects query params on redirect URLs). */
export async function setPostAuthRedirect(next: string | null | undefined) {
  const cookieStore = await cookies()
  await clearPostAuthRedirect()

  if (!next?.trim()) return

  const target = sanitizeRedirectTarget(next.trim())
  cookieStore.set(COOKIE_NAME, target, redirectCookieOptions(MAX_AGE_SECONDS))
}

export async function consumePostAuthRedirect(): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value ?? null
  await clearPostAuthRedirect()
  return value
}

export async function clearPostAuthRedirect() {
  const cookieStore = await cookies()
  const expired = redirectCookieOptions(0)

  cookieStore.set(COOKIE_NAME, '', expired)

  const domain = getSharedCookieDomain()
  if (domain) {
    cookieStore.set(COOKIE_NAME, '', { ...expired, domain })
  }
}
