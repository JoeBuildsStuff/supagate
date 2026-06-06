import { createClient } from '@/utils/supabase/server'
import { getOriginalRequestUrl } from '@/utils/forward-auth-url'
import { getSiteUrl } from '@/utils/site-url'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return NextResponse.json(
      { authenticated: true, userId: user.id },
      { status: 200, headers: { 'X-User-Id': user.id } }
    )
  }

  const loginUrl = new URL('/login', getSiteUrl(request))
  loginUrl.searchParams.set('next', getOriginalRequestUrl(request))

  return NextResponse.redirect(loginUrl.toString(), { status: 302 })
} 