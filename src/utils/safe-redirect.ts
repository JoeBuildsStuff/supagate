import { getSiteUrl } from '@/utils/site-url'

function getAllowedHostSuffix(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) return null

  try {
    const hostname = new URL(siteUrl).hostname
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    return hostname
  } catch {
    return null
  }
}

/** Validate post-login redirect targets to prevent open redirects. */
export function sanitizeRedirectTarget(
  next: string | null | undefined,
  fallback = '/workspace/profile'
): string {
  if (!next?.trim()) return fallback

  const trimmed = next.trim()

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    const suffix = getAllowedHostSuffix()
    const siteHostname = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
      : null

    if (suffix && (url.hostname === suffix || url.hostname.endsWith(`.${suffix}`))) {
      return url.toString()
    }

    if (siteHostname && url.hostname === siteHostname) {
      return url.toString()
    }
  } catch {
    return fallback
  }

  return fallback
}

export function buildAuthCallbackUrl(): string {
  return new URL('/auth/callback', getSiteUrl()).toString()
}

export function toRedirectUrl(target: string, baseUrl?: string): URL {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return new URL(target)
  }

  return new URL(target, baseUrl ?? getSiteUrl())
}

export function appendNextParam(path: string, next?: string | null): string {
  if (!next?.trim()) return path
  const url = new URL(path, getSiteUrl())
  url.searchParams.set('next', next.trim())
  return `${url.pathname}${url.search}`
}
