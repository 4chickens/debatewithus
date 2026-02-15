/**
 * DEBATE_ME // MAIL SERVICE
 * Handles sending verification emails.
 * Mock implementation that logs to console if no API KEY is present.
 */

export const sendVerificationEmail = async (email: string, code: string) => {
    console.log('==========================================');
    console.log(`SECURE MAIL TO: ${email}`);
    console.log(`VERIFICATION CODE: ${code}`);
    console.log('==========================================');

    // In production, you would integrate Resend or SendGrid here
    // Example for Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'DEBATE_ME // VERIFICATION CODE',
      html: `<p>Your code is <strong>${code}</strong></p>`
    });
    */

    return true;
};
