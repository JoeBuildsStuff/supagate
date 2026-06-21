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

export type SupagateAccessRequestStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'cancelled'

export interface SupagateAccessRequest {
  id: string
  app_id: string
  user_id: string
  status: SupagateAccessRequestStatus
  note: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

/** Access request enriched with app + member display fields for admin/UX views. */
export interface SupagateAccessRequestView extends SupagateAccessRequest {
  app_name: string | null
  app_host: string | null
  member_email: string | null
}

