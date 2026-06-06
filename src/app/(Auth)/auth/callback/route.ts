import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { consumePostAuthRedirect } from '@/utils/post-auth-redirect.server'
import { sanitizeRedirectTarget, toRedirectUrl } from '@/utils/safe-redirect'
import { getSiteUrl } from '@/utils/site-url'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const siteUrl = getSiteUrl(request)
  const supabase = await createClient()
  const storedNext = await consumePostAuthRedirect()
  const next = sanitizeRedirectTarget(
    storedNext ?? requestUrl.searchParams.get('next')
  )

  // OAuth callback handling & PKCE code exchange (e.g. password recovery, OAuth)
  const code = requestUrl.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("Code exchange error:", error)
      // Optionally, redirect to a more specific error page or include error info
      return NextResponse.redirect(new URL('/error?source=code_exchange', siteUrl))
    }
    return NextResponse.redirect(toRedirectUrl(next, siteUrl))
  }

  // Other OTP verification handling (e.g., magiclink without PKCE, older signup links if they use token_hash)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null

  if (token_hash && type && (type === 'magiclink' || type === 'recovery' || type === 'signup')) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error(`${type} verification error:`, error)
      return NextResponse.redirect(new URL('/error?source=otp_verify', siteUrl))
    }
    return NextResponse.redirect(toRedirectUrl(next, siteUrl))
  }

  console.warn("Callback received with unhandled parameters:", requestUrl.searchParams.toString())
  return NextResponse.redirect(new URL('/error?source=unknown_callback', siteUrl))
}