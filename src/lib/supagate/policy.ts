import 'server-only'

import type { User } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'

import { supagateSchema } from '@/lib/supagate/admin-client'
import type {
  SupagateApp,
  SupagateAppAccessSnapshot,
  SupagateMember,
} from '@/lib/supagate/types'

export type AccessDecision =
  | { allowed: true; member: SupagateMember; app: SupagateApp }
  | {
      allowed: false
      status: 403
      reason: 'missing_host' | 'unknown_host' | 'disabled_member' | 'restricted_app'
      member: SupagateMember
      app: SupagateApp | null
      host: string | null
    }

export function getAdminEmailSet(): Set<string> {
  return new Set(
    (process.env.SUPAGATE_ADMIN_EMAILS ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .map(email => email.replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  )
}

export function normalizeHost(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    return url.host
  } catch {
    return trimmed.split('/')[0]
  }
}

export function getForwardAuthHost(request: NextRequest): string | null {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]
  const host = forwardedHost ?? request.headers.get('host')?.split(',')[0]
  const normalized = host ? normalizeHost(host) : ''
  return normalized || null
}

export async function ensureSupagateMember(user: User): Promise<SupagateMember> {
  if (!user.email) {
    throw new Error('Supagate access requires a Supabase user email.')
  }

  const db = supagateSchema()
  const email = user.email.toLowerCase()
  const adminEmails = getAdminEmailSet()
  const shouldBeAdmin = adminEmails.has(email)

  const { data: existing, error: readError } = await db
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (readError) throw readError

  if (!existing) {
    const { data: created, error: createError } = await db
      .from('members')
      .insert({
        user_id: user.id,
        email,
        role: shouldBeAdmin ? 'admin' : 'member',
        status: 'active',
      })
      .select('*')
      .single()

    if (createError) throw createError
    return created as SupagateMember
  }

  const updates: Partial<SupagateMember> = {}
  if (existing.email !== email) updates.email = email
  if (shouldBeAdmin && existing.role !== 'admin') updates.role = 'admin'

  if (Object.keys(updates).length === 0) {
    return existing as SupagateMember
  }

  const { data: updated, error: updateError } = await db
    .from('members')
    .update(updates)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (updateError) throw updateError
  return updated as SupagateMember
}

export async function ensureCurrentSupagateMember(getUser: () => Promise<{
  data: { user: User | null }
}>) {
  const {
    data: { user },
  } = await getUser()

  if (!user) return null
  return await ensureSupagateMember(user)
}

export async function assertCurrentUserIsAdmin(user: User): Promise<SupagateMember> {
  const member = await ensureSupagateMember(user)

  if (member.status !== 'active' || member.role !== 'admin') {
    throw new Error('Supagate admin access requires an active admin member.')
  }

  return member
}

export async function getAppAccessSnapshot(appId: string): Promise<SupagateAppAccessSnapshot> {
  const db = supagateSchema()
  const [{ data: users, error: usersError }, { data: groups, error: groupsError }] =
    await Promise.all([
      db.from('app_user_access').select('user_id').eq('app_id', appId),
      db.from('app_group_access').select('group_id').eq('app_id', appId),
    ])

  if (usersError) throw usersError
  if (groupsError) throw groupsError

  return {
    userIds: (users ?? []).map(row => row.user_id as string),
    groupIds: (groups ?? []).map(row => row.group_id as string),
  }
}

export async function logSupagateAuditEvent(input: {
  eventType: string
  actorUserId?: string | null
  targetUserId?: string | null
  appId?: string | null
  host?: string | null
  message: string
  metadata?: Record<string, unknown>
}) {
  const { error } = await supagateSchema().from('audit_events').insert({
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    target_user_id: input.targetUserId ?? null,
    app_id: input.appId ?? null,
    host: input.host ?? null,
    message: input.message,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.error('Failed to write Supagate audit event:', error)
  }
}

/**
 * Whether a member can reach a restricted app via a direct grant or group
 * membership. Universal apps are always accessible to active members and are
 * reported as accessible here too. Mirrors the access logic inside
 * `decideForwardAuthAccess`; kept as a shared helper so the access-denied page
 * can re-verify denial without duplicating the check.
 */
export async function memberHasAppAccess(
  member: SupagateMember,
  app: SupagateApp
): Promise<boolean> {
  if (app.access_mode === 'universal') return true

  const db = supagateSchema()
  const [{ data: directAccess, error: directError }, { data: memberGroups, error: groupsError }] =
    await Promise.all([
      db
        .from('app_user_access')
        .select('user_id')
        .eq('app_id', app.id)
        .eq('user_id', member.user_id)
        .maybeSingle(),
      db.from('group_members').select('group_id').eq('user_id', member.user_id),
    ])

  if (directError) throw directError
  if (groupsError) throw groupsError

  if (directAccess) return true

  const groupIds = (memberGroups ?? []).map(row => row.group_id as string)

  if (groupIds.length > 0) {
    const { data: groupAccess, error: groupAccessError } = await db
      .from('app_group_access')
      .select('group_id')
      .eq('app_id', app.id)
      .in('group_id', groupIds)
      .limit(1)
      .maybeSingle()

    if (groupAccessError) throw groupAccessError
    if (groupAccess) return true
  }

  return false
}

export async function decideForwardAuthAccess(
  request: NextRequest,
  user: User
): Promise<AccessDecision> {
  const member = await ensureSupagateMember(user)
  const host = getForwardAuthHost(request)

  if (!host) {
    return {
      allowed: false,
      status: 403,
      reason: 'missing_host',
      member,
      app: null,
      host: null,
    }
  }

  const db = supagateSchema()
  const { data: app, error: appError } = await db
    .from('apps')
    .select('*')
    .eq('host', host)
    .eq('enabled', true)
    .maybeSingle()

  if (appError) throw appError

  if (!app) {
    return {
      allowed: false,
      status: 403,
      reason: 'unknown_host',
      member,
      app: null,
      host,
    }
  }

  const supagateApp = app as SupagateApp

  if (member.status !== 'active') {
    return {
      allowed: false,
      status: 403,
      reason: 'disabled_member',
      member,
      app: supagateApp,
      host,
    }
  }

  if (await memberHasAppAccess(member, supagateApp)) {
    return { allowed: true, member, app: supagateApp }
  }

  return {
    allowed: false,
    status: 403,
    reason: 'restricted_app',
    member,
    app: supagateApp,
    host,
  }
}
