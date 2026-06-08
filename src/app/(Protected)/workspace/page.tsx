import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WorkspacePage() {
  return (
    <div className="space-y-6 p-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="text-muted-foreground">
          Manage your account and Supagate access policies.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Update your personal account settings.
            </p>
            <Button asChild variant="outline">
              <Link href="/workspace/profile">Open profile settings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Admins can configure protected apps, groups, members, and audit events.
            </p>
            <Button asChild>
              <Link href="/workspace/admin">Open Supagate admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
