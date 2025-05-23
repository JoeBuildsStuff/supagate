import SignupConfirmation from '@/components/email/signup-confirmation';
import { Resend } from 'resend';

export async function POST() {
  try {
    // Initialize Resend only when the API is called, not during build
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'No-Reply <no-reply@joe-taylor.me>',
      to: ['josephataylor@gmail.com'],
      subject: 'Welcome to the app',
      react: SignupConfirmation(),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}