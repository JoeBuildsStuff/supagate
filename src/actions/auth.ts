'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'

// Update schema to only include email
const authSchema = z.object({
  email: z.string().email(),
})

// Replace login and signup with a single magic link function
export async function signInWithMagicLink(formData: FormData) {
  'use server'
  
  const supabase = await createClient()

  // Parse and validate the email
  const result = authSchema.safeParse({
    email: formData.get('email'),
  })

  if (!result.success) {
    console.log("validation-error", result.error)
    redirect('/login?error=validation&message=Invalid email format.')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}`,
    },
  })

  if (error) {
    console.log("magic-link-error", error)
    if (error.code === 'over_email_send_rate_limit' && error.message) {
      redirect(`/login?error=rate_limit&message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(result.data.email)}`)
    }
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect(`/verify-email?email=${result.data.email}`)
}

export async function signInWithGoogle() {
  'use server'

  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  })

  if (error) {
    console.log("google-signin-error", error)
    redirect('/error')
  }

  if (data.url) {
    redirect(data.url)
  }

  revalidatePath('/', 'layout')
}

export async function signInWithGithub() {
  'use server'
  
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  })

  if (error) {
    console.log("github-signin-error", error)
    redirect('/error')
  }

  if (data.url) {
    redirect(data.url)
  }

  revalidatePath('/', 'layout')
}

// Add OTP specific function
export async function signInWithOTP(formData: FormData) {
  'use server'
  
  const supabase = await createClient()

  const result = authSchema.safeParse({
    email: formData.get('email'),
  })

  if (!result.success) {
    console.log("validation-error", result.error)
    redirect('/login?error=validation&message=Invalid email format.')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.log("otp-error", error)
    if (error.code === 'over_email_send_rate_limit' && error.message) {
      redirect(`/login?error=rate_limit&message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(result.data.email)}`)
    }
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect(`/verify-otp?email=${result.data.email}`)
}