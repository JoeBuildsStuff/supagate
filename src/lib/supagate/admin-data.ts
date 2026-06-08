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
