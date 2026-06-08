import Link from 'next/link'

import {
  listSupagateApps,
  listSupagateAuditEvents,
  listSupagateMembers,
} from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function SupagateAdminPage() {
  if (!isSupagateAdminConfigured()) return null

  const [apps, members, auditEvents] = await Promise.all([
    listSupagateApps(),
    listSupagateMembers(),
    listSupagateAuditEvents(),
  ])

  const restrictedApps = apps.filter(app => app.access_mode === 'restricted')
  const disabledMembers = members.filter(member => member.status === 'disabled')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Apps</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{apps.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{restrictedApps.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{members.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Disabled</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{disabledMembers.length}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/workspace/admin/apps">Manage apps</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/workspace/admin/members">Review members</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/workspace/admin/groups">Manage groups</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditEvents.slice(0, 8).map(event => (
              <div key={event.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{event.message}</p>
                  <p className="text-sm text-muted-foreground">{event.event_type}</p>
                </div>
                <time className="shrink-0 text-sm text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </time>
              </div>
            ))}
            {auditEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
