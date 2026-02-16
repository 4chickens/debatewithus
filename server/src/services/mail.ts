import { Resend } from 'resend';

/**
 * DEBATEWITHUS // MAIL SERVICE
 * Uses Resend (HTTP API) instead of SMTP to bypass Railway's port blocking.
 *
 * Required env var: RESEND_API_KEY
 * Get one free at https://resend.com (100 emails/day)
 */

export const sendVerificationEmail = async (email: string, code: string) => {
  const apiKey = process.env.RESEND_API_KEY;

  console.log(`[MAIL] Attempting to send verification to ${email}`);
  console.log(`[MAIL] RESEND_API_KEY configured: ${!!apiKey}`);

  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY missing in env. Get one at https://resend.com');
    console.log(`[AUTH_FALLBACK] CODE FOR ${email}: ${code}`);
    return true;
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'DEBATEWITHUS <onboarding@resend.dev>',
      to: [email],
      subject: 'debatewithus // VERIFICATION CODE',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #FF007F;">WELCOME TO DEBATEWITHUS</h2>
          <p>Your authentication code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This code expires in 15 minutes. If you didn't request this, just ignore it.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      console.log(`[AUTH_FALLBACK] CODE FOR ${email}: ${code}`);
      return false;
    }

    console.log(`✅ Verification email sent to ${email} (id: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    console.log(`[AUTH_FALLBACK] CODE FOR ${email}: ${code}`);
    return false;
  }
};
