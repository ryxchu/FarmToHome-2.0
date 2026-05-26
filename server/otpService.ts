import nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  otp: string;
}

/**
 * Sends a beautifully designed HTML Email containing a 6-digit OTP verification code.
 * Connects securely using credentials from environment variables:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 * - NODE_ENV
 */
export async function sendOtpEmail({ to, subject, otp }: MailOptions): Promise<void> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'pixelsakk10@gmail.com';
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    throw new Error('SMTP_PASS is not defined in the environment variables.');
  }

  console.log(`[SMTP] Preparing secure connection to ${host}:${port} as ${user}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // True for port 465 SSL, false for 587 TLS
    auth: {
      user,
      pass,
    },
    // Production safety checks
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log('[SMTP] Transport verification succeeded! Connection is secure.');
  } catch (error: any) {
    console.error('[SMTP] Transport configuration/handshake failed:', error.message);
    throw new Error(`SMTP Secure Handshake Failed: ${error.message}`);
  }

  // Beautifully designed HTML Email matching FarmToHome theme
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FarmToHome Verification Code</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          color: #334155;
        }
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f8fafc;
          padding: 40px 0;
        }
        .container {
          max-width: 540px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #1b4332; /* Rich Forest Green matching FarmToHome */
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -1px;
          font-family: 'Georgia', serif;
          font-style: italic;
        }
        .header p {
          color: #d8f3dc;
          margin: 8px 0 0 0;
          font-size: 11px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .body {
          padding: 40px 32px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
        }
        .desc {
          font-size: 14px;
          line-height: 1.6;
          color: #475569;
          margin: 0 0 32px 0;
        }
        .otp-container {
          background-color: #f0fdf4; /* Light fresh green background */
          border: 2px dashed #b7e4c7;
          border-radius: 18px;
          padding: 24px;
          margin: 0 auto 32px auto;
          display: inline-block;
          min-width: 260px;
        }
        .otp-code {
          font-size: 42px;
          font-weight: 800;
          color: #1b4332;
          margin: 0;
          letter-spacing: 10px;
          text-indent: 10px; /* Aligns characters correctly by offsets */
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        .warning-badge {
          background-color: #fff1f2;
          color: #be123c;
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 32px;
        }
        .divider {
          height: 1px;
          background-color: #f1f5f9;
          margin: 32px 0;
        }
        .footer {
          padding: 32px;
          background-color: #fcfdfd;
          text-align: center;
          border-top: 1px solid #f1f5f9;
        }
        .footer-logo {
          color: #1b4332;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .footer-text {
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
        }
        .footer-disclaimer {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 16px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>FarmToHome</h1>
            <p>COMMUNITY AGRI CO-OP</p>
          </div>
          <div class="body">
            <div class="greeting font-serif">Security Verification</div>
            <p class="desc">
              To complete your sign-in process or verify your account changes, please use the 6-digit verification code below. This protects your farm purchases and farmer profile from unauthorized access.
            </p>
            <div class="otp-container">
              <h2 class="otp-code">${otp}</h2>
            </div>
            <div>
              <div class="warning-badge">
                <span>⏰</span> Code expires in 10 minutes
              </div>
            </div>
            <p class="desc" style="font-size: 12.5px; color: #64748b; margin-bottom: 0;">
              If you did not make this request or sign up for an account, please disregard this email. Your credentials remain safe and secure.
            </p>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div class="footer-logo">🌾 FarmToHome Marketplace</div>
            <div class="footer-text">Connecting local farmers directly to community tables for a fresher, fairer agricultural trade.</div>
            <div class="footer-disclaimer">
              This is a secure system email. Responses to this mailbox are unattended.<br>
              © 2026 FarmToHome Alliance. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"FarmToHome Support" <${user}>`,
    to,
    subject,
    text: `Your FarmToHome verification code is ${otp}. This code is valid for 10 minutes.`,
    html: htmlTemplate,
  });

  console.log(`[SMTP] Successfully dispatched secure OTP email to ${to}`);
}
