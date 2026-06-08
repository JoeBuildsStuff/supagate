import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SupagateMember } from '@/lib/supagate/types'

export function SupagateSetupRequired() {
  return (
    <div className="mx-auto max-w-2xl p-10">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Supagate admin is not configured locally</CardTitle>
          <CardDescription>
            The admin UI needs server-only Supabase credentials before it can manage policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> and <code>SUPAGATE_ADMIN_EMAILS</code> to
            your local environment, then restart the dev server.
          </p>
          <p>
            The Supabase migration must be applied and the <code>supagate</code> schema must be
            exposed in Supabase API settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function SupagateAdminDenied({
  email,
  member,
  adminEmailMatched,
  error,
}: {
  email: string | null
  member: SupagateMember | null
  adminEmailMatched: boolean
  error?: string | null
}) {
  const schemaExposureError = error?.includes('PGRST106') || error?.includes('The schema must be one of')

  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Supagate admin access denied</CardTitle>
              <CardDescription>
                Supagate could not confirm this session as an active admin.
              </CardDescription>
            </div>
            <Badge variant="destructive">Blocked</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-muted-foreground">
          <p>
            Signed in as <code>{email ?? 'unknown email'}</code>.
          </p>
          {member ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">Supagate role</dt>
                <dd><code>{member.role}</code></dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Supagate status</dt>
                <dd><code>{member.status}</code></dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Admin email matched</dt>
                <dd><code>{adminEmailMatched ? 'yes' : 'no'}</code></dd>
              </div>
            </dl>
          ) : (
            <p>No Supagate member row could be loaded for this user.</p>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <p className="font-medium">Supabase error</p>
              <p className="mt-1 break-words font-mono text-xs">{error}</p>
            </div>
          )}
          {schemaExposureError && (
            <div className="rounded-md border p-3">
              <p className="font-medium text-foreground">Likely fix</p>
              <p className="mt-1">
                In Supabase API settings, add <code>supagate</code> to the exposed schemas list,
                save the setting, then reload this page. The current API response says the schema
                is still not exposed to PostgREST.
              </p>
            </div>
          )}
          <p>
            To bootstrap admin access, make sure this exact email is included in{' '}
            <code>SUPAGATE_ADMIN_EMAILS</code>, then reload or sign in again.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
