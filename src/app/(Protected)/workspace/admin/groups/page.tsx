import {
  deleteSupagateGroup,
  saveSupagateGroup,
  updateSupagateGroupMembers,
} from '@/lib/supagate/admin-actions'
import {
  listGroupMemberIds,
  listSupagateGroups,
  listSupagateMembers,
} from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default async function SupagateGroupsPage() {
  if (!isSupagateAdminConfigured()) return null

  const [groups, members, groupMembers] = await Promise.all([
    listSupagateGroups(),
    listSupagateMembers(),
    listGroupMemberIds(),
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSupagateGroup} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-group-name">Name</Label>
              <Input id="new-group-name" name="name" placeholder="Family" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="new-group-description">Description</Label>
              <Textarea id="new-group-description" name="description" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Add group</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {groups.map(group => {
        const selectedMembers = groupMembers[group.id] ?? []

        return (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form action={saveSupagateGroup} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="id" value={group.id} />
                <div className="space-y-2">
                  <Label htmlFor={`group-name-${group.id}`}>Name</Label>
                  <Input id={`group-name-${group.id}`} name="name" defaultValue={group.name} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`group-description-${group.id}`}>Description</Label>
                  <Textarea
                    id={`group-description-${group.id}`}
                    name="description"
                    defaultValue={group.description ?? ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Save group</Button>
                </div>
              </form>

              <form action={updateSupagateGroupMembers} className="space-y-3 border-t pt-5">
                <input type="hidden" name="group_id" value={group.id} />
                <h3 className="font-medium">Members</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {members.map(member => (
                    <label key={member.user_id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="user_ids"
                        value={member.user_id}
                        defaultChecked={selectedMembers.includes(member.user_id)}
                      />
                      <span>{member.email}</span>
                    </label>
                  ))}
                  {members.length === 0 && (
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                  )}
                </div>
                <Button type="submit" variant="outline">Save group members</Button>
              </form>

              <form action={deleteSupagateGroup}>
                <input type="hidden" name="id" value={group.id} />
                <input type="hidden" name="name" value={group.name} />
                <Button type="submit" variant="destructive">Delete group</Button>
              </form>
            </CardContent>
          </Card>
        )
      })}

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No groups created yet.</p>
      )}
    </div>
  )
}
