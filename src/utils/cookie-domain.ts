import { type CookieOptions } from '@supabase/ssr'

export function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('localhost')
  )
}

/** Parent domain (e.g. `.joe-taylor.me`) so sessions work across homelab subdomains. */
export function getSharedCookieDomain(hostname?: string): string | undefined {
  if (hostname && isLocalDevHostname(hostname)) {
    return undefined
  }

  const configured = process.env.COOKIE_DOMAIN?.trim()
  if (configured) {
    return configured.startsWith('.') ? configured : `.${configured}`
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) return undefined

  try {
    const host = new URL(siteUrl).hostname
    if (isLocalDevHostname(host)) return undefined

    const parts = host.split('.')
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join('.')}`
    }
  } catch {
    return undefined
  }

  return undefined
}

export function enhanceCookieOptions(
  options: CookieOptions,
  hostname?: string
): CookieOptions {
  const isLocalDev = hostname
    ? isLocalDevHostname(hostname)
    : process.env.NODE_ENV === 'development'

  return {
    ...options,
    domain: isLocalDev
      ? undefined
      : (options.domain ?? getSharedCookieDomain(hostname)),
    path: options.path || '/',
    secure: isLocalDev ? false : (options.secure ?? true),
    sameSite: options.sameSite || 'lax',
  }
}

export function formatBrowserCookie(
  name: string,
  value: string,
  options: CookieOptions,
  hostname?: string
): string {
  const enhanced = enhanceCookieOptions(options, hostname)
  const parts = [
    `${name}=${value}`,
    `path=${enhanced.path || '/'}`,
    enhanced.sameSite ? `samesite=${enhanced.sameSite}` : 'samesite=lax',
  ]

  if (enhanced.domain) {
    parts.push(`domain=${enhanced.domain}`)
  }

  if (options.maxAge === 0 || value === '') {
    parts.push('max-age=0')
    parts.push('expires=Thu, 01 Jan 1970 00:00:00 GMT')
  } else if (enhanced.maxAge !== undefined) {
    parts.push(`max-age=${enhanced.maxAge}`)
  }

  if (enhanced.secure) {
    parts.push('secure')
  }

  return parts.join('; ')
}
