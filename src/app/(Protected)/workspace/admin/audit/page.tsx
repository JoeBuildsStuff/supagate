import { listSupagateAuditEvents } from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function SupagateAuditPage() {
  if (!isSupagateAdminConfigured()) return null

  const events = await listSupagateAuditEvents()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Audit Events</h2>
        <p className="text-sm text-muted-foreground">
          Supagate records denied access attempts and admin policy changes.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map(event => (
            <TableRow key={event.id}>
              <TableCell>{new Date(event.created_at).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={event.event_type === 'access.denied' ? 'destructive' : 'outline'}>
                  {event.event_type}
                </Badge>
              </TableCell>
              <TableCell>{event.host ?? '-'}</TableCell>
              <TableCell className="whitespace-normal">{event.message}</TableCell>
            </TableRow>
          ))}
          {events.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No audit events recorded yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
