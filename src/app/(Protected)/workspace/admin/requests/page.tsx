import {
  approveSupagateAccessRequest,
  denySupagateAccessRequest,
} from '@/lib/supagate/access-request-actions'
import { listSupagateAccessRequests } from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
import type { SupagateAccessRequestStatus } from '@/lib/supagate/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusBadgeVariant: Record<
  SupagateAccessRequestStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending: 'default',
  approved: 'outline',
  denied: 'destructive',
  cancelled: 'secondary',
}

export default async function SupagateRequestsPage() {
  if (!isSupagateAdminConfigured()) return null

  const requests = await listSupagateAccessRequests()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Access requests</h2>
        <p className="text-sm text-muted-foreground">
          Members who were denied a restricted app can request access here. Approving a
          request grants direct access to that app.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>App</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(request => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                {request.member_email ?? request.user_id}
              </TableCell>
              <TableCell>{request.app_name ?? request.app_id}</TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant[request.status]}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(request.created_at).toLocaleString()}</TableCell>
              <TableCell className="max-w-[220px] truncate text-muted-foreground">
                {request.note ?? '—'}
              </TableCell>
              <TableCell>
                {request.status === 'pending' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={approveSupagateAccessRequest}>
                      <input type="hidden" name="id" value={request.id} />
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={denySupagateAccessRequest}>
                      <input type="hidden" name="id" value={request.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Deny
                      </Button>
                    </form>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {request.decided_at
                      ? new Date(request.decided_at).toLocaleDateString()
                      : '—'}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No access requests yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
