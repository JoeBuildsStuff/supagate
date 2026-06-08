import { createClient } from '@/utils/supabase/server'
import { getOriginalRequestUrl } from '@/utils/forward-auth-url'
import { getSiteUrl } from '@/utils/site-url'
import {
  decideForwardAuthAccess,
  logSupagateAuditEvent,
} from '@/lib/supagate/policy'
import { NextResponse, type NextRequest } from 'next/server'

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
