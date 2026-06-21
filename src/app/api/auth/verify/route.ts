import { createClient } from '@/utils/supabase/server'
import { getOriginalRequestUrl } from '@/utils/forward-auth-url'
import { getSiteUrl } from '@/utils/site-url'
import { isBrowserNavigation } from '@/utils/request-kind'
import {
  decideForwardAuthAccess,
  logSupagateAuditEvent,
} from '@/lib/supagate/policy'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Traefik forward-auth endpoint.
 *
 * Response contract (see docs/restricted-access-denial-ux.md):
 * - Allowed request           → 200 with X-User-* identity headers.
 * - Unauthenticated request   → 302 redirect to /login?next=<original url>.
 * - Authenticated but denied:
 *     - Browser navigation     → 302 redirect to /access-denied (friendly page).
 *     - API / non-browser      → 403 JSON { authenticated, authorized, reason }.
 *
 * "Browser navigation" is determined by isBrowserNavigation() — Sec-Fetch
 * metadata, Accept, and an explicit `X-Supagate-Client: api` opt-in. The
 * access-denied query string is a hint only; that page re-derives the member,
 * app, and reason server-side and never trusts these params for any decision.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const decision = await decideForwardAuthAccess(request, user)

    if (!decision.allowed) {
      await logSupagateAuditEvent({
        eventType: 'access.denied',
        actorUserId: decision.member.user_id,
        appId: decision.app?.id ?? null,
        host: decision.host,
        message: `Denied access: ${decision.reason}.`,
        metadata: {
          reason: decision.reason,
          email: decision.member.email,
        },
      })

      if (isBrowserNavigation(request)) {
        const deniedUrl = new URL('/access-denied', getSiteUrl(request))
        deniedUrl.searchParams.set('reason', decision.reason)
        if (decision.app?.id) {
          deniedUrl.searchParams.set('app', decision.app.id)
        }

        return NextResponse.redirect(deniedUrl.toString(), { status: 302 })
      }

      return NextResponse.json(
        { authenticated: true, authorized: false, reason: decision.reason },
        { status: decision.status }
      )
    }

    return NextResponse.json(
      { authenticated: true, authorized: true, userId: user.id },
      {
        status: 200,
        headers: {
          'X-User-Id': user.id,
          'X-User-Email': decision.member.email,
          'X-Supagate-Role': decision.member.role,
        },
      }
    )
  }

  const loginUrl = new URL('/login', getSiteUrl(request))
  loginUrl.searchParams.set('next', getOriginalRequestUrl(request))

  return NextResponse.redirect(loginUrl.toString(), { status: 302 })
}
