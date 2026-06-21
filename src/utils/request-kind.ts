import { type NextRequest } from 'next/server'

/**
 * Decide whether a forward-auth request is an interactive browser navigation
 * (which should be redirected to a friendly page) or a programmatic/API client
 * (which should receive machine-readable JSON).
 *
 * Detection order, mirroring docs/restricted-access-denial-ux.md — we never
 * rely on a broad wildcard `Accept` header alone:
 *
 *   1. Explicit API opt-in wins: `X-Supagate-Client: api`, or an `Accept`
 *      header that is exactly `application/json`. → API
 *   2. Fetch metadata: `Sec-Fetch-Mode: navigate` AND
 *      `Sec-Fetch-Dest: document`. → browser
 *   3. Fallback: `Accept` contains `text/html`. → browser
 *   4. Otherwise → API (safe default: machine-readable, never leaks the page
 *      to non-browser callers).
 */
export function isBrowserNavigation(request: NextRequest): boolean {
  const headers = request.headers

  const client = headers.get('x-supagate-client')?.trim().toLowerCase()
  if (client === 'api') return false

  const accept = headers.get('accept')?.trim().toLowerCase() ?? ''
  if (accept === 'application/json') return false

  const fetchMode = headers.get('sec-fetch-mode')?.trim().toLowerCase()
  const fetchDest = headers.get('sec-fetch-dest')?.trim().toLowerCase()
  if (fetchMode === 'navigate' && fetchDest === 'document') return true

  if (accept.includes('text/html')) return true

  return false
}
