import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';


export default async function VerifyOTPPage({   searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {

  const { email } = await searchParams

  async function verifyOTP(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const token = formData.get('token') as string
    
    const { error } = await supabase.auth.verifyOtp({
      email: email as string,
      token,
      type: 'email'
    })

    if (error) {
      console.log("otp-verification-error", error)
      redirect('/error')
    }

    redirect('/')
  }

  async function resendOTP() {
    'use server'
    console.log("Resend OTP to:", email)
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <Link href="/login" className="text-sm text-muted-foreground flex flex-row items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            back to login
          </Link>
          <CardTitle className="text-2xl font-bold text-center">
            Verify OTP
          </CardTitle>
          <CardDescription className="text-center">
            Enter the code we sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="">
          <div className="flex flex-col gap-4">
          <div className="bg-secondary/50 p-6 rounded-lg">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <KeyRound className="h-6 w-6" />
              </div>
            </div>
            <p className="text-center mb-2">Enter the 6-digit code sent to:</p>
            <p className="text-center font-medium mb-4">{email}</p>
            <p className="text-center text-xs text-muted-foreground px-6">
                Didn&apos;t receive a code? The code will expire in 10 minutes.
              </p>
          </div>
          <form>
            <div className="space-y-4">
              <div className="flex justify-center mb-8 mt-4">
                <InputOTP maxLength={6} name="token">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-border" />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                formAction={verifyOTP}
              >
                Verify Code
              </Button>
            </div>
          </form>
          <form action={resendOTP} className="">
            <Button 
              type="submit" 
              variant="outline"
              className="w-full"
            >
              Resend Code
            </Button>
          </form>
          </div>
        </CardContent>
        <CardFooter className="flex flex-row items-center justify-center">
          <div className="text-center text-sm text-muted-foreground flex flex-row items-center justify-center gap-2">
            Need help?{' '}
            <Link href="/support" className="text-primary underline hover:text-primary/80 transition-colors">
              Contact support
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}