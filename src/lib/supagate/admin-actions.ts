'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'
import { supagateSchema } from '@/lib/supagate/admin-client'
import {
  assertCurrentUserIsAdmin,
  logSupagateAuditEvent,
  normalizeHost,
} from '@/lib/supagate/policy'

const appSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  host: z.string().trim().min(1),
  description: z.string().trim().optional(),
  access_mode: z.enum(['universal', 'restricted']),
  enabled: z.boolean(),
})

const groupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
})

async function requireActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Authentication required.')
  return await assertCurrentUserIsAdmin(user)
}

function checkboxValue(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on'
}

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '')
}

function revalidateAdmin() {
  revalidatePath('/workspace/admin')
  revalidatePath('/workspace/admin/apps')
  revalidatePath('/workspace/admin/members')
  revalidatePath('/workspace/admin/groups')
  revalidatePath('/workspace/admin/audit')
}

export async function saveSupagateApp(formData: FormData) {
  const actor = await requireActor()
  const parsed = appSchema.parse({
    id: formString(formData, 'id') || undefined,
    name: formString(formData, 'name'),
    host: normalizeHost(formString(formData, 'host')),
    description: formString(formData, 'description') || undefined,
    access_mode: formString(formData, 'access_mode'),
    enabled: checkboxValue(formData, 'enabled'),
  })

  const db = supagateSchema()
  const payload = {
    name: parsed.name,
    host: parsed.host,
    description: parsed.description ?? null,
    access_mode: parsed.access_mode,
    enabled: parsed.enabled,
  }

  const result = parsed.id
    ? await db.from('apps').update(payload).eq('id', parsed.id).select('id').single()
    : await db.from('apps').insert(payload).select('id').single()

  if (result.error) throw result.error

  await logSupagateAuditEvent({
    eventType: parsed.id ? 'app.updated' : 'app.created',
    actorUserId: actor.user_id,
    appId: result.data.id,
    host: parsed.host,
    message: `${parsed.id ? 'Updated' : 'Created'} app ${parsed.name}.`,
    metadata: payload,
  })

  revalidateAdmin()
}

export async function deleteSupagateApp(formData: FormData) {
  const actor = await requireActor()
  const id = z.string().uuid().parse(formString(formData, 'id'))
  const name = formString(formData, 'name') || id

  const { error } = await supagateSchema().from('apps').delete().eq('id', id)
  if (error) throw error

  await logSupagateAuditEvent({
    eventType: 'app.deleted',
    actorUserId: actor.user_id,
    message: `Deleted app ${name}.`,
    metadata: { appId: id },
  })

  revalidateAdmin()
}

export async function updateSupagateAppAccess(formData: FormData) {
  const actor = await requireActor()
  const appId = z.string().uuid().parse(formString(formData, 'app_id'))
  const userIds = formData.getAll('user_ids').map(String)
  const groupIds = formData.getAll('group_ids').map(String)
  const db = supagateSchema()

  const [{ error: deleteUsersError }, { error: deleteGroupsError }] = await Promise.all([
    db.from('app_user_access').delete().eq('app_id', appId),
    db.from('app_group_access').delete().eq('app_id', appId),
  ])
  if (deleteUsersError) throw deleteUsersError
  if (deleteGroupsError) throw deleteGroupsError

  if (userIds.length > 0) {
    const { error } = await db
      .from('app_user_access')
      .insert(userIds.map(userId => ({ app_id: appId, user_id: userId })))
    if (error) throw error
  }

  if (groupIds.length > 0) {
    const { error } = await db
      .from('app_group_access')
      .insert(groupIds.map(groupId => ({ app_id: appId, group_id: groupId })))
    if (error) throw error
  }

  await logSupagateAuditEvent({
    eventType: 'app.access.updated',
    actorUserId: actor.user_id,
    appId,
    message: 'Updated restricted app access grants.',
    metadata: { userIds, groupIds },
  })

  revalidateAdmin()
}

export async function updateSupagateMember(formData: FormData) {
  const actor = await requireActor()
  const userId = z.string().uuid().parse(formString(formData, 'user_id'))
  const role = z.enum(['admin', 'member']).parse(formString(formData, 'role'))
  const status = z.enum(['active', 'disabled']).parse(formString(formData, 'status'))

  const { error } = await supagateSchema()
    .from('members')
    .update({ role, status })
    .eq('user_id', userId)

  if (error) throw error

  await logSupagateAuditEvent({
    eventType: 'member.updated',
    actorUserId: actor.user_id,
    targetUserId: userId,
    message: 'Updated member role or status.',
    metadata: { role, status },
  })

  revalidateAdmin()
}

export async function saveSupagateGroup(formData: FormData) {
  const actor = await requireActor()
  const parsed = groupSchema.parse({
    id: formString(formData, 'id') || undefined,
    name: formString(formData, 'name'),
    description: formString(formData, 'description') || undefined,
  })
  const db = supagateSchema()
  const payload = {
    name: parsed.name,
    description: parsed.description ?? null,
  }

  const result = parsed.id
    ? await db.from('groups').update(payload).eq('id', parsed.id).select('id').single()
    : await db.from('groups').insert(payload).select('id').single()

  if (result.error) throw result.error

  await logSupagateAuditEvent({
    eventType: parsed.id ? 'group.updated' : 'group.created',
    actorUserId: actor.user_id,
    message: `${parsed.id ? 'Updated' : 'Created'} group ${parsed.name}.`,
    metadata: { groupId: result.data.id, ...payload },
  })

  revalidateAdmin()
}

export async function deleteSupagateGroup(formData: FormData) {
  const actor = await requireActor()
  const id = z.string().uuid().parse(formString(formData, 'id'))
  const name = formString(formData, 'name') || id

  const { error } = await supagateSchema().from('groups').delete().eq('id', id)
  if (error) throw error

  await logSupagateAuditEvent({
    eventType: 'group.deleted',
    actorUserId: actor.user_id,
    message: `Deleted group ${name}.`,
    metadata: { groupId: id },
  })

  revalidateAdmin()
}

export async function updateSupagateGroupMembers(formData: FormData) {
  const actor = await requireActor()
  const groupId = z.string().uuid().parse(formString(formData, 'group_id'))
  const userIds = formData.getAll('user_ids').map(String)
  const db = supagateSchema()

  const { error: deleteError } = await db.from('group_members').delete().eq('group_id', groupId)
  if (deleteError) throw deleteError

  if (userIds.length > 0) {
    const { error } = await db
      .from('group_members')
      .insert(userIds.map(userId => ({ group_id: groupId, user_id: userId })))
    if (error) throw error
  }

  await logSupagateAuditEvent({
    eventType: 'group.members.updated',
    actorUserId: actor.user_id,
    message: 'Updated group membership.',
    metadata: { groupId, userIds },
  })

  revalidateAdmin()
}

