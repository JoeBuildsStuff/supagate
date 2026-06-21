import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, Ban, ClockFading, Lock } from 'lucide-react'

import { createClient } from '@/utils/supabase/server'
import { supagateSchema } from '@/lib/supagate/admin-client'
import { ensureSupagateMember, memberHasAppAccess } from '@/lib/supagate/policy'
import {
  cancelSupagateAccessRequest,
  requestSupagateAppAccess,
} from '@/lib/supagate/access-request-actions'
import { sanitizeRedirectTarget } from '@/utils/safe-redirect'
import { signOut } from '@/actions/auth'
import type { SupagateApp } from '@/lib/supagate/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type DenialReason =
  | 'restricted_app'
  | 'disabled_member'
  | 'unknown_host'
  | 'missing_host'

const REASON_PARAMS = new Set<DenialReason>([
  'restricted_app',
  'disabled_member',
  'unknown_host',
  'missing_host',
])

function parseReasonParam(value: string | undefined): DenialReason | null {
  return value && REASON_PARAMS.has(value as DenialReason)
    ? (value as DenialReason)
    : null
}

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const reasonParam = parseReasonParam(
    typeof params.reason === 'string' ? params.reason : undefined
  )
  const appIdParam = typeof params.app === 'string' ? params.app : null

  // Authoritative identity: always from the server session, never the query.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated visitors are never shown restricted app details.
  if (!user) redirect('/login')

  const member = await ensureSupagateMember(user)
  const homeHref = sanitizeRedirectTarget(null)

  // Re-derive the real situation server-side; the query string is only a hint.
  let reason: DenialReason
  let app: SupagateApp | null = null
  let pendingRequestId: string | null = null

  if (member.status !== 'active') {
    reason = 'disabled_member'
  } else if (!appIdParam) {
    reason = reasonParam === 'missing_host' ? 'missing_host' : 'unknown_host'
  } else {
    const db = supagateSchema()
    const { data: appRow } = await db
      .from('apps')
      .select('*')
      .eq('id', appIdParam)
      .eq('enabled', true)
      .maybeSingle()

    if (!appRow) {
      reason = 'unknown_host'
    } else {
      app = appRow as SupagateApp
      // If the member can actually reach the app, there is nothing to deny.
      if (await memberHasAppAccess(member, app)) {
        redirect(homeHref)
      }
      reason = 'restricted_app'

      const { data: pending } = await db
        .from('access_requests')
        .select('id')
        .eq('app_id', app.id)
        .eq('user_id', member.user_id)
        .eq('status', 'pending')
        .maybeSingle()
      pendingRequestId = (pending?.id as string) ?? null
    }
  }

  const recovery = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={homeHref}>Go to your workspace</Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Use a different account
        </Button>
      </form>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        {reason === 'restricted_app' &&
          (pendingRequestId ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  Request submitted
                </CardTitle>
                <CardDescription className="text-center">
                  Your request to access{' '}
                  <span className="font-medium text-foreground">
                    {app?.name ?? 'this application'}
                  </span>{' '}
                  is now waiting for an administrator&apos;s approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* identity / target block — styled like verify-otp */}
                  <div className="bg-secondary/50 p-6 rounded-lg">
                    <div className="flex justify-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <ClockFading className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mb-1">
                      Requested as:
                    </p>
                    <p className="text-center font-medium mb-4">{member.email}</p>
                    <p className="text-center text-sm text-muted-foreground mb-1">
                      For access to:
                    </p>
                    <p className="text-center font-medium">
                      {app?.name ?? 'this application'}
                    </p>
                  </div>

                  <form action={cancelSupagateAccessRequest}>
                    <input type="hidden" name="id" value={pendingRequestId} />
                    <Button type="submit" variant="secondary" className="w-full">
                      Cancel request
                    </Button>
                  </form>
                </div>
              </CardContent>
              <CardFooter>{recovery}</CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  Access required
                </CardTitle>
                <CardDescription className="text-center">
                  This app is restricted and an administrator hasn&apos;t granted
                  you access yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* identity / target block — styled like verify-otp */}
                  <div className="bg-secondary/50 p-6 rounded-lg">
                    <div className="flex justify-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <Lock className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mb-1">
                      Signed in as:
                    </p>
                    <p className="text-center font-medium mb-4">{member.email}</p>
                    <p className="text-center text-sm text-muted-foreground mb-1">
                      Attempting to access:
                    </p>
                    <p className="text-center font-medium">
                      {app?.name ?? 'this application'}
                    </p>
                  </div>

                  {app && (
                    <form action={requestSupagateAppAccess}>
                      <input type="hidden" name="app_id" value={app.id} />
                      <Button type="submit" className="w-full">
                        Request access
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
              <CardFooter>{recovery}</CardFooter>
            </>
          ))}

        {reason === 'disabled_member' && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Account disabled
              </CardTitle>
              <CardDescription className="text-center">
                Your account has been disabled by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="bg-secondary/50 p-6 rounded-lg">
                  <div className="flex justify-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                      <Ban className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mb-1">
                    Signed in as:
                  </p>
                  <p className="text-center font-medium">{member.email}</p>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Contact an administrator if you believe this is a mistake.
                </p>
              </div>
            </CardContent>
          </>
        )}

        {(reason === 'unknown_host' || reason === 'missing_host') && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Page not found
              </CardTitle>
              <CardDescription className="text-center">
                This address isn&apos;t configured for access through this gateway.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary/50 p-6 rounded-lg">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  If you think it should be accessible, contact an administrator.
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
