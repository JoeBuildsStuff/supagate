import { type NextRequest } from 'next/server'
import { getSiteUrl } from '@/utils/site-url'

/** Reconstruct the original URL Traefik was proxying (for login ?next= redirects). */
export function getOriginalRequestUrl(request: NextRequest): string {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ?? 'https'
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0].trim() ??
    request.headers.get('host')?.split(',')[0].trim()
  const uri = request.headers.get('x-forwarded-uri') ?? '/'

  if (host) {
    return `${proto}://${host}${uri.startsWith('/') ? uri : `/${uri}`}`
  }

  return getSiteUrl(request)
}
