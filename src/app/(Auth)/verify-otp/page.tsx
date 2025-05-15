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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-4">
            <KeyRound className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Enter verification code
          </CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent a verification code to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} name="token">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
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
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="ghost">
            <Link href="/login" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />Back to login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}