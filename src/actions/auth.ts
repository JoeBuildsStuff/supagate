'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'

// Update schema to only include email
const authSchema = z.object({
  email: z.string().email(),
})

// Add a schema for email and password
const authWithPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, { message: "Password is required" }),
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

export async function signInWithPassword(formData: FormData) {
  'use server'

  const supabase = await createClient()

  const result = authWithPasswordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  const next = formData.get('next') as string | null;

  if (!result.success) {
    console.log("validation-error", result.error)
    // Construct a more user-friendly error message
    const errorMessages = result.error.errors.map(e => e.message).join(', ')
    let redirectUrl = `/login/password?error=validation&message=${encodeURIComponent(errorMessages)}`;
    if (next) {
      redirectUrl += `&next=${encodeURIComponent(next)}`;
    }
    redirect(redirectUrl);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })
  if (error) {
    console.log("password-signin-error", error)
    let redirectUrl = `/login/password?error=auth&message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(result.data.email)}`;
    if (next) {
      redirectUrl += `&next=${encodeURIComponent(next)}`;
    }
    redirect(redirectUrl);
  }

  revalidatePath('/', 'layout')
  if (next) {
    redirect(next);
  } else {
    redirect('/'); // Default redirect if next is not present
  }
}

export async function signUpWithPassword(formData: FormData) {
  'use server'

  const supabase = await createClient()

  const result = authWithPasswordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.success) {
    console.log("validation-error", result.error)
    const errorMessages = result.error.errors.map(e => e.message).join(', ')
    redirect(`/signup/password?error=validation&message=${encodeURIComponent(errorMessages)}`)
  }

  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  })

  if (error) {
    console.log("password-signup-error", error)
    redirect(`/signup/password?error=auth&message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(result.data.email)}`)
  }

  revalidatePath('/', 'layout')
  // Redirect to a page that informs the user to check their email for verification
  redirect(`/verify-email?email=${result.data.email}&type=signup`)
}

export async function requestPasswordReset(formData: FormData) {
  'use server'

  const supabase = await createClient()

  const result = authSchema.safeParse({
    email: formData.get('email'),
  })

  if (!result.success) {
    console.log("validation-error", result.error)
    redirect(`/login/password/reset?error=validation&message=Invalid email format.&email=${encodeURIComponent(formData.get('email') as string || '')}`)
  }

  const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`, // We'll create /update-password page next
  })

  if (error) {
    console.log("password-reset-request-error", error)
    // It's good practice to not confirm if an email address is registered or not during password reset for security.
    // However, Supabase might return specific errors we can handle, like rate limits.
    if (error.code === 'over_email_send_rate_limit' && error.message) {
      redirect(`/login/password/reset?error=rate_limit&message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(result.data.email)}`)
    }
    // To avoid user enumeration, we might want to show the same success message even if the email doesn't exist.
    // For now, we'll redirect to the verify-email page as if successful.
    // redirect(`/login/password/reset?error=auth&message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(result.data.email)}`)
  }

  // Redirect to a page informing the user to check their email for the password reset link.
  redirect(`/update-password/check-email?email=${encodeURIComponent(result.data.email)}`)
}

const updatePasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], // path of error
});

export async function updateUserPassword(formData: FormData) {
  'use server'

  const supabase = await createClient()

  const result = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!result.success) {
    console.log("validation-error", result.error.flatten().fieldErrors)
    const errorMessages = result.error.errors.map(e => e.message).join(', ')
    // It's important to redirect back to the update-password page with the error
    redirect(`/update-password?error=validation_error&message=${encodeURIComponent(errorMessages)}`)
  }

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  })

  if (error) {
    console.log("update-password-error", error)
    redirect(`/update-password?error=update_error&message=${encodeURIComponent(error.message)}`)
  }

  // Password updated successfully, redirect to login or home page
  // It might be good to revalidate path if user details are displayed somewhere that might change upon password update, though less common.
  // revalidatePath('/', 'layout') 
  redirect('/login/password?message=Password updated successfully. Please sign in.')
}