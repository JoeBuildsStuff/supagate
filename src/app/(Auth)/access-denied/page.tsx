import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, Ban, ShieldQuestion } from 'lucide-react'

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
import { Badge } from '@/components/ui/badge'

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
        {reason === 'restricted_app' && (
          <>
            <CardHeader className="space-y-1">
              <Badge variant="secondary" className="w-fit">
                <ShieldQuestion className="mr-1 h-3.5 w-3.5" />
                Restricted application
              </Badge>
              <CardTitle className="text-2xl font-bold">Access required</CardTitle>
              <CardDescription>
                You&apos;re signed in as{' '}
                <span className="font-medium text-foreground">{member.email}</span>, but
                you don&apos;t have access to{' '}
                <span className="font-medium text-foreground">
                  {app?.name ?? 'this application'}
                </span>{' '}
                yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your sign-in succeeded — this isn&apos;t a login problem. This app is
                restricted and an administrator hasn&apos;t granted you access. You can
                request access below.
              </p>
              {app &&
                (pendingRequestId ? (
                  <div className="space-y-2 rounded-md border bg-secondary/40 p-3">
                    <p className="text-sm font-medium">Access request pending</p>
                    <p className="text-sm text-muted-foreground">
                      An administrator will review your request. You&apos;ll get access
                      once it&apos;s approved.
                    </p>
                    <form action={cancelSupagateAccessRequest}>
                      <input type="hidden" name="id" value={pendingRequestId} />
                      <Button type="submit" variant="ghost" size="sm">
                        Cancel request
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form action={requestSupagateAppAccess}>
                    <input type="hidden" name="app_id" value={app.id} />
                    <Button type="submit" className="w-full">
                      Request access
                    </Button>
                  </form>
                ))}
            </CardContent>
            <CardFooter>{recovery}</CardFooter>
          </>
        )}

        {reason === 'disabled_member' && (
          <>
            <CardHeader className="space-y-1">
              <Badge variant="destructive" className="w-fit">
                <Ban className="mr-1 h-3.5 w-3.5" />
                Account disabled
              </Badge>
              <CardTitle className="text-2xl font-bold">Account disabled</CardTitle>
              <CardDescription>
                The account{' '}
                <span className="font-medium text-foreground">{member.email}</span> is
                currently disabled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You won&apos;t be able to access protected applications while your account
                is disabled. Please contact an administrator if you believe this is a
                mistake.
              </p>
            </CardContent>
            <CardFooter>{recovery}</CardFooter>
          </>
        )}

        {(reason === 'unknown_host' || reason === 'missing_host') && (
          <>
            <CardHeader className="space-y-1">
              <Badge variant="secondary" className="w-fit">
                <AlertCircle className="mr-1 h-3.5 w-3.5" />
                Unavailable
              </Badge>
              <CardTitle className="text-2xl font-bold">
                This page isn&apos;t available
              </CardTitle>
              <CardDescription>
                We couldn&apos;t route this request to a known application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The address you tried to reach isn&apos;t configured for access through
                this gateway. If you think it should be, contact an administrator.
              </p>
            </CardContent>
            <CardFooter>{recovery}</CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}
