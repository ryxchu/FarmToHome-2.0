import { Router } from 'express';
import { sendOtpEmail } from './otpService';
import { rateLimitMiddleware } from './rateLimit';

const router = Router();

// In-memory OTP storage structure
// Key: email (standardized to lowercase)
// Value: { otp: string, expiresAt: number }
export const secureEmailOtps = new Map<string, { otp: string; expiresAt: number }>();

/**
 * 1. Express API Route (/api/auth/send-otp)
 * Generates a random 6-digit numeric verification code, saves it style with expiration, and dispatches.
 */
router.post('/send-otp', rateLimitMiddleware(5, 60000), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_EMAIL_FIELD',
        message: 'The email address field is required to issue verification.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check basic email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL_FORMAT',
        message: 'The provided email address does not match a valid structural format (e.g. user@example.com).'
      });
    }

    // Generate reliable random 6-digit verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set 10 minutes expiration timestamp (using absolute epoch milliseconds)
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const expiresAt = Date.now() + TEN_MINUTES_MS;

    // Save temporary state in secure memory
    secureEmailOtps.set(cleanEmail, { otp, expiresAt });
    console.log(`[OTP Storage] Code generated for ${cleanEmail}: ${otp} (Expires: ${new Date(expiresAt).toISOString()})`);

    // Fire email dispatcher
    await sendOtpEmail({
      to: cleanEmail,
      subject: '🔑 Your FarmToHome Secure Verification Code',
      otp
    });

    // Return production-safe success payload (do not expose OTP in production)
    return res.status(200).json({
      success: true,
      message: 'A secure 6-digit verification code has been successfully dispatched to your email.',
      payload: {
        email: cleanEmail,
        expiresInSeconds: 600,
        expiresAt: new Date(expiresAt).toISOString()
      }
    });

  } catch (error: any) {
    console.error('[OTP ROUTE CRITICAL ERROR]:', error);

    // Precise error details mapped carefully to assist panel presentations debugging
    const errMsg = error.message || '';
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let userMsg = 'Our capstone verification service encountered an internal exception. Please verify your SMTP details and try again.';

    if (errMsg.includes('SMTP_PASS') || errMsg.includes('not defined')) {
      statusCode = 500;
      errorCode = 'SMTP_CONFIG_MISSING';
      userMsg = 'Setup incomplete: SMTP credentials are not configured inside the server environment.';
    } else if (errMsg.includes('Secure Handshake Failed') || errMsg.includes('connection') || errMsg.includes('ENOTFOUND')) {
      statusCode = 503;
      errorCode = 'SMTP_GATEWAY_UNREACHABLE';
      userMsg = 'Unable to connect to the SMTP server. Please check SMTP host, port, and security rules.';
    }

    return res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: userMsg,
      debug: {
        errorClass: error.constructor.name,
        errorDetails: errMsg,
        systemNodeEnv: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 2. Express API Route (/api/auth/verify-otp)
 * Validates the provided code from the user against the temporary storage and expiry timestamp.
 */
router.post('/verify-otp', rateLimitMiddleware(10, 60000), async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'REQUIRED_FIELDS_MISSING',
        message: 'Both email address and the 6-digit OTP code are required for verification.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Query in-memory record
    const record = secureEmailOtps.get(cleanEmail);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'OTP_NOT_FOUND',
        message: 'No active verification code was requested for this email. Please request a new code.'
      });
    }

    // Enforce Expiration limit
    if (Date.now() > record.expiresAt) {
      // Discard expired record
      secureEmailOtps.delete(cleanEmail);
      return res.status(410).json({
        success: false,
        error: 'OTP_CODE_EXPIRED',
        message: 'The verification code has expired (exceeded 10-minute limit). Please prompt a new request.'
      });
    }

    // Match code
    if (record.otp !== cleanOtp) {
      return res.status(401).json({
        success: false,
        error: 'OTP_MISMATCH',
        message: 'The entered verification code is incorrect. Please check and try again.'
      });
    }

    // SUCCESS: Discard used OTP to prevent replay attacks
    secureEmailOtps.delete(cleanEmail);
    console.log(`[OTP Verification] Successfully verified and cleared OTP record for ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully. Access granted.'
    });

  } catch (error: any) {
    console.error('[OTP VERIFY CRITICAL ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_SYSTEM_ERROR',
      message: 'Failed to process authentication verification. Contact support.',
      debug: {
        errorClass: error.constructor.name,
        errorDetails: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
