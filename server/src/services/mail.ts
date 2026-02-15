import nodemailer from 'nodemailer';

/**
 * DEBATE_ME // MAIL SERVICE
 * Handles sending verification emails using Gmail SMTP.
 */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendVerificationEmail = async (email: string, code: string) => {
  // If no credentials, log to console for safety
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD missing. Logging code to console:');
    console.log(`[AUTH] Code for ${email}: ${code}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"DEBATEWITHUS" <${process.env.GMAIL_USER}>`,
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
    // Even if it fails, we log it locally so user isn't stuck during setup
    console.log(`[DEBUG] Backup code for ${email}: ${code}`);
    return false;
  }
};
