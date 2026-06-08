import {
  deleteSupagateApp,
  saveSupagateApp,
  updateSupagateAppAccess,
} from '@/lib/supagate/admin-actions'
import {
  listAppAccessIds,
  listSupagateApps,
  listSupagateGroups,
  listSupagateMembers,
} from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default async function SupagateAppsPage() {
  if (!isSupagateAdminConfigured()) return null

  const [apps, members, groups, accessByApp] = await Promise.all([
    listSupagateApps(),
    listSupagateMembers(),
    listSupagateGroups(),
    listAppAccessIds(),
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add App</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSupagateApp} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-app-name">Name</Label>
              <Input id="new-app-name" name="name" placeholder="Changedetection" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-app-host">Host</Label>
              <Input id="new-app-host" name="host" placeholder="changedetection.joe-taylor.me" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-app-access-mode">Access</Label>
              <select
                id="new-app-access-mode"
                name="access_mode"
                defaultValue="universal"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="universal">Universal</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-7 text-sm font-medium">
              <input type="checkbox" name="enabled" defaultChecked />
              Enabled
            </label>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="new-app-description">Description</Label>
              <Textarea id="new-app-description" name="description" placeholder="What this app protects" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Add app</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {apps.map(app => {
          const access = accessByApp[app.id] ?? { userIds: [], groupIds: [] }

          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{app.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{app.host}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={app.enabled ? 'default' : 'secondary'}>
                      {app.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant={app.access_mode === 'restricted' ? 'outline' : 'secondary'}>
                      {app.access_mode}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form action={saveSupagateApp} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="id" value={app.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`name-${app.id}`}>Name</Label>
                    <Input id={`name-${app.id}`} name="name" defaultValue={app.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`host-${app.id}`}>Host</Label>
                    <Input id={`host-${app.id}`} name="host" defaultValue={app.host} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`access-${app.id}`}>Access</Label>
                    <select
                      id={`access-${app.id}`}
                      name="access_mode"
                      defaultValue={app.access_mode}
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    >
                      <option value="universal">Universal</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-7 text-sm font-medium">
                    <input type="checkbox" name="enabled" defaultChecked={app.enabled} />
                    Enabled
                  </label>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`description-${app.id}`}>Description</Label>
                    <Textarea
                      id={`description-${app.id}`}
                      name="description"
                      defaultValue={app.description ?? ''}
                    />
                  </div>
                  <div className="flex gap-2 md:col-span-2">
                    <Button type="submit">Save app</Button>
                  </div>
                </form>

                <form action={updateSupagateAppAccess} className="space-y-4 border-t pt-5">
                  <input type="hidden" name="app_id" value={app.id} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="font-medium">Direct user access</h3>
                      <div className="space-y-2">
                        {members.map(member => (
                          <label key={member.user_id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="user_ids"
                              value={member.user_id}
                              defaultChecked={access.userIds.includes(member.user_id)}
                            />
                            <span>{member.email}</span>
                          </label>
                        ))}
                        {members.length === 0 && (
                          <p className="text-sm text-muted-foreground">No members yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-medium">Group access</h3>
                      <div className="space-y-2">
                        {groups.map(group => (
                          <label key={group.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="group_ids"
                              value={group.id}
                              defaultChecked={access.groupIds.includes(group.id)}
                            />
                            <span>{group.name}</span>
                          </label>
                        ))}
                        {groups.length === 0 && (
                          <p className="text-sm text-muted-foreground">No groups yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button type="submit" variant="outline">Save access grants</Button>
                </form>

                <form action={deleteSupagateApp}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="name" value={app.name} />
                  <Button type="submit" variant="destructive">Delete app</Button>
                </form>
              </CardContent>
            </Card>
          )
        })}
        {apps.length === 0 && (
          <p className="text-sm text-muted-foreground">No apps registered yet. Unknown hosts are denied until added here.</p>
        )}
      </div>
    </div>
  )
}
