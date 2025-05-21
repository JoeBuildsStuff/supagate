import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is authenticated
    // You can optionally pass user information back to Traefik via headers here if needed
    // For example: return NextResponse.json({ authenticated: true, userId: user.id }, { status: 200, headers: { 'X-User-Id': user.id } });
    return NextResponse.json({ authenticated: true }, { status: 200 })
  } else {
    // User is not authenticated, redirect to login
    const requestHeaders = request.headers
    const originalProto = requestHeaders.get('x-forwarded-proto')
    const originalHost = requestHeaders.get('x-forwarded-host')
    const originalUri = requestHeaders.get('x-forwarded-uri')

    let originalUrl = process.env.NEXT_PUBLIC_SITE_URL || '/' // Default fallback
    if (originalProto && originalHost && originalUri) {
      originalUrl = `${originalProto}://${originalHost}${originalUri}`
    } else {
      // Fallback if headers are not present, though Traefik should send them
      // Redirect to the main page of the site that required auth
      if (originalHost) {
        originalUrl = `${originalProto || 'http'}://${originalHost}/`
      }
    }

    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_SITE_URL)
    loginUrl.searchParams.set('next', originalUrl)

    return NextResponse.redirect(loginUrl.toString(), { status: 302 })
  }
} 