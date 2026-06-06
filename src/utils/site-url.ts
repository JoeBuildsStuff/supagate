import { type NextRequest } from 'next/server'

export function getSiteUrl(request?: Request | NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (configured) return configured

  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost.split(',')[0].trim()}`
    }
    return new URL(request.url).origin
  }

  return 'http://localhost:3000'
}
