import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import {
  assertCurrentUserIsAdmin,
  ensureSupagateMember,
  getAdminEmailSet,
} from '@/lib/supagate/policy'
import { supagateSchema } from '@/lib/supagate/admin-client'
import { errorToMessage } from '@/lib/supagate/errors'
import type {
  SupagateAccessRequest,
  SupagateAccessRequestView,
  SupagateApp,
  SupagateAuditEvent,
  SupagateGroup,
  SupagateMember,
} from './types'

export const requireSupagateAdmin = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  try {
    return await assertCurrentUserIsAdmin(user)
  } catch {
    redirect('/workspace')
  }
})

export const getSupagateAdminAccess = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      state: 'signed_out' as const,
      user: null,
      member: null,
      adminEmailMatched: false,
      error: null,
    }
  }

  try {
    const member = await ensureSupagateMember(user)
    const adminEmailMatched = user.email
      ? getAdminEmailSet().has(user.email.toLowerCase())
      : false

    if (member.status === 'active' && member.role === 'admin') {
      return {
        state: 'admin' as const,
        user,
        member,
        adminEmailMatched,
        error: null,
      }
    }

    return {
      state: 'denied' as const,
      user,
      member,
      adminEmailMatched,
      error: null,
    }
  } catch (error) {
    return {
      state: 'error' as const,
      user,
      member: null,
      adminEmailMatched: false,
      error: errorToMessage(error),
    }
  }
})

export async function listSupagateApps(): Promise<SupagateApp[]> {
  const { data, error } = await supagateSchema()
    .from('apps')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as SupagateApp[]
}

export async function listSupagateMembers(): Promise<SupagateMember[]> {
  const { data, error } = await supagateSchema()
    .from('members')
    .select('*')
    .order('email', { ascending: true })

  if (error) throw error
  return (data ?? []) as SupagateMember[]
}

export async function listSupagateGroups(): Promise<SupagateGroup[]> {
  const { data, error } = await supagateSchema()
    .from('groups')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as SupagateGroup[]
}

export async function listSupagateAuditEvents(): Promise<SupagateAuditEvent[]> {
  const { data, error } = await supagateSchema()
    .from('audit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data ?? []) as SupagateAuditEvent[]
}

const ACCESS_REQUEST_STATUS_ORDER: Record<string, number> = {
  pending: 0,
  approved: 1,
  denied: 2,
  cancelled: 3,
}

/** Access requests enriched with app + member display fields, pending first. */
export async function listSupagateAccessRequests(): Promise<SupagateAccessRequestView[]> {
  const db = supagateSchema()

  const { data: requests, error } = await db
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  const rows = (requests ?? []) as SupagateAccessRequest[]
  if (rows.length === 0) return []

  const appIds = [...new Set(rows.map(row => row.app_id))]
  const userIds = [...new Set(rows.map(row => row.user_id))]

  const [{ data: apps, error: appsError }, { data: members, error: membersError }] =
    await Promise.all([
      db.from('apps').select('id, name, host').in('id', appIds),
      db.from('members').select('user_id, email').in('user_id', userIds),
    ])

  if (appsError) throw appsError
  if (membersError) throw membersError

  const appMap = new Map((apps ?? []).map(app => [app.id as string, app]))
  const memberMap = new Map((members ?? []).map(m => [m.user_id as string, m]))

  return rows
    .map(row => {
      const app = appMap.get(row.app_id)
      const member = memberMap.get(row.user_id)
      return {
        ...row,
        app_name: (app?.name as string) ?? null,
        app_host: (app?.host as string) ?? null,
        member_email: (member?.email as string) ?? null,
      }
    })
    .sort((a, b) => {
      const order =
        (ACCESS_REQUEST_STATUS_ORDER[a.status] ?? 99) -
        (ACCESS_REQUEST_STATUS_ORDER[b.status] ?? 99)
      if (order !== 0) return order
      return b.created_at.localeCompare(a.created_at)
    })
}

/** Count of pending access requests, used for the admin nav badge. */
export async function countPendingSupagateAccessRequests(): Promise<number> {
  const { count, error } = await supagateSchema()
    .from('access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw error
  return count ?? 0
}

export async function listGroupMemberIds(): Promise<Record<string, string[]>> {
  const { data, error } = await supagateSchema()
    .from('group_members')
    .select('group_id, user_id')

  if (error) throw error

  return (data ?? []).reduce<Record<string, string[]>>((acc, row) => {
    const groupId = row.group_id as string
    const userId = row.user_id as string
    acc[groupId] = [...(acc[groupId] ?? []), userId]
    return acc
  }, {})
}

export async function listAppAccessIds(): Promise<
  Record<string, { userIds: string[]; groupIds: string[] }>
> {
  const db = supagateSchema()
  const [{ data: users, error: usersError }, { data: groups, error: groupsError }] =
    await Promise.all([
      db.from('app_user_access').select('app_id, user_id'),
      db.from('app_group_access').select('app_id, group_id'),
    ])

  if (usersError) throw usersError
  if (groupsError) throw groupsError

  const access: Record<string, { userIds: string[]; groupIds: string[] }> = {}

  for (const row of users ?? []) {
    const appId = row.app_id as string
    access[appId] ??= { userIds: [], groupIds: [] }
    access[appId].userIds.push(row.user_id as string)
  }

  for (const row of groups ?? []) {
    const appId = row.app_id as string
    access[appId] ??= { userIds: [], groupIds: [] }
    access[appId].groupIds.push(row.group_id as string)
  }

  return access
}
