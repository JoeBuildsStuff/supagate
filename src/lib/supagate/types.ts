export type SupagateRole = 'admin' | 'member'
export type SupagateMemberStatus = 'active' | 'disabled'
export type SupagateAppAccessMode = 'universal' | 'restricted'

export interface SupagateMember {
  user_id: string
  email: string
  role: SupagateRole
  status: SupagateMemberStatus
  created_at: string
  updated_at: string
}

export interface SupagateGroup {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface SupagateApp {
  id: string
  name: string
  host: string
  description: string | null
  access_mode: SupagateAppAccessMode
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface SupagateAuditEvent {
  id: string
  event_type: string
  actor_user_id: string | null
  target_user_id: string | null
  app_id: string | null
  host: string | null
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface SupagateAppAccessSnapshot {
  userIds: string[]
  groupIds: string[]
}

