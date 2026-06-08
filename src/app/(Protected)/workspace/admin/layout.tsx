import Link from 'next/link'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { getSupagateAdminAccess } from '@/lib/supagate/admin-data'
import { isSupagateAdminConfigured } from '@/lib/supagate/admin-client'
import { Separator } from '@/components/ui/separator'
import { SupagateAdminDenied, SupagateSetupRequired } from './setup-required'

const adminNavItems = [
  { href: '/workspace/admin', label: 'Overview' },
  { href: '/workspace/admin/apps', label: 'Apps' },
  { href: '/workspace/admin/members', label: 'Members' },
  { href: '/workspace/admin/groups', label: 'Groups' },
  { href: '/workspace/admin/audit', label: 'Audit' },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupagateAdminConfigured()) {
    return <SupagateSetupRequired />
  }

  const access = await getSupagateAdminAccess()

  if (access.state === 'signed_out') {
    redirect('/login')
  }

  if (access.state !== 'admin') {
    return (
      <SupagateAdminDenied
        email={access.user?.email ?? null}
        member={access.member}
        adminEmailMatched={access.adminEmailMatched}
        error={access.error}
      />
    )
  }

  return (
    <div className="space-y-6 p-10 pb-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Supagate Admin</h1>
        <p className="text-muted-foreground">
          Manage protected app access, members, groups, and policy changes.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {adminNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
