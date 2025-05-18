// TODO: Add a password reset page

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { signInWithMagicLink } from "@/actions/auth";

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { error, message, email } = await searchParams

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
            <Link href="/login" className="text-sm text-muted-foreground flex flex-row items-center gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              back to passwordless options
            </Link>
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email to reset your password
          </CardDescription>
        </CardHeader>

        {/* card content */}
        <CardContent className="space-y-4">

            <form>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" placeholder="m@example.com" type="email" name="email" required />
                    </div>

                    <div className="flex flex-row gap-2 w-full">
                <Button 
                  type="submit" 
                  variant="default"
                  className="flex-1"
                
                >
                  Reset Password
                </Button>
                <Button 
                  type="submit" 
                  variant="default"
                  className="flex-1"
                  formAction={signInWithMagicLink}
                >
                  Send Magic Link
                </Button>
                </div>
                </div>

            </form>

            <Alert variant={"default"} className="border-none">
          <Mail className="" />
          <AlertTitle className="text-sm">One Time Link</AlertTitle>
          <AlertDescription className="pt-2 space-y-2">
          <span>
            We&apos;ll email you a one time link to access your account.
          </span>
          </AlertDescription>
        </Alert>

                {/* no account sign up link */}
                <div className="text-center text-sm text-muted-foreground flex flex-row items-center justify-center gap-2">
          No account? {' '}
          <Link href="/signup" className="text-primary underline hover:text-primary/80 transition-colors">
            Sign up
          </Link>
        </div>
        </CardContent>

        {error && message && (
        <CardFooter>
            <Alert variant={"destructive"} className="">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">{error === "rate_limit" ? "Slow down there!" : "Uh oh!"}</AlertTitle>
              <AlertDescription className="pt-2 space-y-2">
                {typeof message === 'string' ? <span>{decodeURIComponent(message)}</span> : 'An unexpected error occurred.'}
                {error === "rate_limit" && typeof email === 'string' && (
                  <>
                    <span className=""> Please wait before trying again with:</span>
                    <p className="font-bold">{decodeURIComponent(email)}</p>
                  </>
                )}
              </AlertDescription>
            </Alert>
        </CardFooter>   
        )}
      </Card>

    </div>
  )
}