import { updateSupagateMember } from '@/lib/supagate/admin-actions'
import { listSupagateMembers } from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
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

export default async function SupagateMembersPage() {
  if (!isSupagateAdminConfigured()) return null

  const members = await listSupagateMembers()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Supabase users are added here automatically when they authenticate through Supagate.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[320px]">Update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(member => (
            <TableRow key={member.user_id}>
              <TableCell className="font-medium">{member.email}</TableCell>
              <TableCell>
                <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={member.status === 'active' ? 'outline' : 'destructive'}>
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <form action={updateSupagateMember} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="user_id" value={member.user_id} />
                  <select
                    name="role"
                    defaultValue={member.role}
                    className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    name="status"
                    defaultValue={member.status}
                    className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <Button type="submit" size="sm">Save</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                No members have authenticated through Supagate yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
