import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MailIcon, RotateCcw } from "lucide-react";


import Link from "next/link";
import { signInWithMagicLink } from '@/actions/auth';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {

  const { email } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-4">
            <MailIcon className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-center space-y-4">
            <p className="">Check your email:</p>
            <p className="">{email}</p>
            </CardTitle>
          <CardDescription className="text-center mt-4">
            We&apos;ve sent you an email with a verification link. Please check your inbox and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className=" text-center">
          <p>Didn&apos;t receive an email? Check your spam folder or try signing up again.</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" > <Link href="/login" className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back to login</Link></Button>
          <form>
            <Button 
            variant="secondary" 
            className="flex items-center gap-2" 
            type="submit"
            formAction={signInWithMagicLink}>
              <RotateCcw className="w-4 h-4 mr-2" />Resend email
            </Button>
            <input type="hidden" name="email" value={email} />
            </form>
        </CardFooter>
      </Card>
    </div>
  );}
