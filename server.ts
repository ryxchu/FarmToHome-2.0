import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory OTP storage (for demo purposes, use a database in production)
const otps = new Map<string, string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "FarmToHome API is running" });
  });

  // OTP Email endpoint
  app.post("/api/send-otp", async (req, res) => {
    const { email, phone, type } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = type === 'email' ? email : phone;
    
    otps.set(identifier, otp);
    console.log(`[OTP] Generated for ${identifier}: ${otp}`);

    const smtpUser = process.env.SMTP_USER || 'farmtohomee11@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'welt gieb tlom kpxe';

    if (type === 'email') {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"FarmToHome" <${smtpUser}>`,
          to: email,
          subject: "Your FarmToHome Verification Code",
          text: `Your verification code is: ${otp}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #10b981;">FarmToHome Verification</h2>
              <p>Your 6-digit verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #0f172a; padding: 15px; background: #f8fafc; border-radius: 8px; display: inline-block; letter-spacing: 5px;">
                ${otp}
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">This code will expire in 10 minutes.</p>
            </div>
          `,
        });
        res.json({ success: true, message: "OTP sent to email" });
      } catch (error: any) {
        console.error("Failed to send email:", error);
        let message = "Failed to send verification email.";
        if (error.message?.includes('Invalid login') || error.message?.includes('auth')) {
          message = "SMTP Authentication failed. Please check your App Password.";
        }
        res.status(500).json({ success: false, message });
      }
    } else {
      // For phone, we just simulate it
      console.log(`[SMS] Sending OTP ${otp} to ${phone}`);
      res.json({ success: true, message: "OTP sent to phone (Simulated)", dev: true, otp });
    }
  });

  // Dedicated endpoint for Forgot Password notification (to ensure custom SMTP is used)
  app.post("/api/forgot-password-notify", async (req, res) => {
    const { email } = req.body;
    const smtpUser = process.env.SMTP_USER || 'farmtohomee11@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'welt gieb tlom kpxe';

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"FarmToHome Support" <${smtpUser}>`,
        to: email,
        subject: "Password Reset Requested",
        text: `A password reset was requested for your FarmToHome account. If you didn't request this, please ignore it. Otherwise, look for the official Firebase reset email in your inbox.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #10b981;">Password Reset Requested</h2>
            <p>You requested to reset your password for FarmToHome.</p>
            <p><strong>Please check your inbox for an official password reset link from Google/Firebase.</strong></p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from your custom SMTP relay.</p>
          </div>
        `,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Forgot pass notify error:", error);
      res.status(500).json({ success: false });
    }
  });

  // Contact Us endpoint
  app.post("/api/contact-us", async (req, res) => {
    const { name, email, phone, message } = req.body;
    const smtpUser = process.env.SMTP_USER || 'farmtohomee11@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'welt gieb tlom kpxe';

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"FarmToHome Contact Form" <${smtpUser}>`,
        to: 'farmtohomee11@gmail.com',
        replyTo: email,
        subject: `[Contact Form] Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981; margin-top: 0;">New Contact Form Submission</h2>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
            </div>
            <p style="font-size: 14px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px;">Message:</p>
            <div style="background-color: #fff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 15px; color: #1e293b; line-height: 1.6;">
              ${message}
            </div>
            <p style="margin-top: 25px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
              This email was sent from the FarmToHome platform contact page.
            </p>
          </div>
        `,
      });

      res.json({ success: true, message: "Thank you for contacting us! We've received your message." });
    } catch (error: any) {
      console.error("Failed to process contact message:", error);
      res.status(500).json({ success: false, message: "Failed to send message. Please try again later." });
    }
  });

  app.post("/api/verify-otp", (req, res) => {
    const { identifier, otp } = req.body;
    const storedOtp = otps.get(identifier);

    if (storedOtp && storedOtp === otp) {
      otps.delete(identifier);
      res.json({ success: true, message: "OTP verified" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
