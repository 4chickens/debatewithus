import nodemailer from 'nodemailer';

/**
 * DEBATE_ME // MAIL SERVICE
 * Handles sending verification emails using Gmail SMTP.
 */

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ''), // Clean any accidental spaces from Railway UI
  },
});

export const sendVerificationEmail = async (email: string, code: string) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // Always log the code to console so user can check Railway logs if email fails
  console.log('--------------------------------------------------');
  console.log(`[AUTH_SYSTEM] VERIFICATION CODE FOR ${email}: ${code}`);
  console.log('--------------------------------------------------');

  if (!gmailUser || !gmailPass) {
    console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD missing in env.');
    return true; // Return true to allow unblocked flow during dev
  }

  try {
    await transporter.sendMail({
      from: `"DEBATEWITHUS" <${gmailUser}>`,
      to: email,
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
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
  }
};
