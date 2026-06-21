'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'
import { supagateSchema } from '@/lib/supagate/admin-client'
import {
  assertCurrentUserIsAdmin,
  ensureSupagateMember,
  logSupagateAuditEvent,
  memberHasAppAccess,
} from '@/lib/supagate/policy'
import type { SupagateApp, SupagateMember } from '@/lib/supagate/types'

/** Reject repeat submissions from the same member within this window. */
const REQUEST_RATE_LIMIT_SECONDS = 30

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '')
}

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { code?: string }).code === '23505'
  )
}

async function requireMember(): Promise<SupagateMember> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Authentication required.')
  return await ensureSupagateMember(user)
}

async function requireAdmin(): Promise<SupagateMember> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Authentication required.')
  return await assertCurrentUserIsAdmin(user)
}

function revalidateRequests() {
  revalidatePath('/workspace/admin')
  revalidatePath('/workspace/admin/requests')
  revalidatePath('/workspace/admin/audit')
}

/**
 * Member-facing: record a pending access request for a restricted app the
 * member currently cannot reach. Idempotent — a duplicate pending request is
 * silently treated as success (deduped by the partial unique index), and
 * submissions are rate-limited to prevent spam.
 */
export async function requestSupagateAppAccess(formData: FormData) {
  const member = await requireMember()
  const appId = z.string().uuid().parse(formString(formData, 'app_id'))
  const note = formString(formData, 'note').trim() || null

  const db = supagateSchema()

  const { data: app, error: appError } = await db
    .from('apps')
    .select('*')
    .eq('id', appId)
    .eq('enabled', true)
    .maybeSingle()

  if (appError) throw appError

  // Never create a request for an app the member can already reach, or for a
  // disabled member, or an unknown/disabled app.
  if (!app || member.status !== 'active') return
  if (await memberHasAppAccess(member, app as SupagateApp)) return

  // Lightweight rate limit: ignore if this member submitted very recently.
  const since = new Date(Date.now() - REQUEST_RATE_LIMIT_SECONDS * 1000).toISOString()
  const { data: recent, error: recentError } = await db
    .from('access_requests')
    .select('id')
    .eq('user_id', member.user_id)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle()

  if (recentError) throw recentError
  if (recent) return

  const { error: insertError } = await db.from('access_requests').insert({
    app_id: appId,
    user_id: member.user_id,
    status: 'pending',
    note,
  })

  if (insertError) {
    // Existing pending request — treat as success.
    if (isUniqueViolation(insertError)) return
    throw insertError
  }

  await logSupagateAuditEvent({
    eventType: 'access.request.created',
    actorUserId: member.user_id,
    appId,
    host: (app as SupagateApp).host,
    message: `Requested access to ${(app as SupagateApp).name}.`,
    metadata: { note },
  })

  revalidateRequests()
}

/** Member-facing: cancel one's own pending request. */
export async function cancelSupagateAccessRequest(formData: FormData) {
  const member = await requireMember()
  const id = z.string().uuid().parse(formString(formData, 'id'))

  const { data: updated, error } = await supagateSchema()
    .from('access_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', member.user_id)
    .eq('status', 'pending')
    .select('app_id')
    .maybeSingle()

  if (error) throw error
  if (!updated) return

  await logSupagateAuditEvent({
    eventType: 'access.request.cancelled',
    actorUserId: member.user_id,
    appId: updated.app_id as string,
    message: 'Cancelled own access request.',
  })

  revalidateRequests()
}

/**
 * Admin: approve a pending request. Grants direct access via app_user_access
 * (the authoritative grant) and marks the request approved. Re-approval is
 * safe — the grant insert ignores conflicts and the request row is never the
 * grant itself.
 */
export async function approveSupagateAccessRequest(formData: FormData) {
  const actor = await requireAdmin()
  const id = z.string().uuid().parse(formString(formData, 'id'))
  const db = supagateSchema()

  const { data: req, error: readError } = await db
    .from('access_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle()

  if (readError) throw readError
  if (!req) return

  const appId = req.app_id as string
  const userId = req.user_id as string

  // Authoritative direct grant. onConflict ignore so re-approval is idempotent.
  const { error: grantError } = await db
    .from('app_user_access')
    .upsert({ app_id: appId, user_id: userId }, { onConflict: 'app_id,user_id', ignoreDuplicates: true })

  if (grantError) throw grantError

  const { error: updateError } = await db
    .from('access_requests')
    .update({
      status: 'approved',
      decided_by: actor.user_id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) throw updateError

  await logSupagateAuditEvent({
    eventType: 'access.request.approved',
    actorUserId: actor.user_id,
    targetUserId: userId,
    appId,
    message: 'Approved access request and granted direct app access.',
    metadata: { requestId: id },
  })

  revalidateRequests()
}

/** Admin: deny a pending request. No grant is created. */
export async function denySupagateAccessRequest(formData: FormData) {
  const actor = await requireAdmin()
  const id = z.string().uuid().parse(formString(formData, 'id'))

  const { data: updated, error } = await supagateSchema()
    .from('access_requests')
    .update({
      status: 'denied',
      decided_by: actor.user_id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('app_id, user_id')
    .maybeSingle()

  if (error) throw error
  if (!updated) return

  await logSupagateAuditEvent({
    eventType: 'access.request.denied',
    actorUserId: actor.user_id,
    targetUserId: updated.user_id as string,
    appId: updated.app_id as string,
    message: 'Denied access request.',
    metadata: { requestId: id },
  })

  revalidateRequests()
}
