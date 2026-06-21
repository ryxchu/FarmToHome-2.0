import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Phone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PhoneAuthVerificationProps {
  /** Optional custom callback to execute upon successful redirection to Sign In */
  onSuccessRedirect?: () => void;
}

export const PhoneAuthVerification: React.FC<PhoneAuthVerificationProps> = ({ 
  onSuccessRedirect 
}) => {
  // 1. Component State Setup
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);

  // Mutable refs to hold the ConfirmationResult and RecaptchaVerifier instances
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // 2. Invisible reCAPTCHA Initialization
  useEffect(() => {
    try {
      // Create the invisible reCAPTCHA verifier bound to the DOM container
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-verifier-container', {
        size: 'invisible',
        callback: () => {
          // Callback triggers when reCAPTCHA validation completes successfully
          console.log('reCAPTCHA solved, authorization proceeding...');
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please request a new verification code.');
        }
      });
    } catch (err: any) {
      console.error('Error initializing RecaptchaVerifier:', err);
      setError('Failed to load secure verification module. Please refresh the page.');
    }

    // Clean up reCAPTCHA verifier instance on unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  // Format Helper: Converts standard Philippine layout (09xxxxxxxx) into international E.164 (+63xxxxxxxx)
  const formatPhilippinePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, ''); // Strip non-digit characters
    if (cleaned.startsWith('0')) {
      return `+63${cleaned.substring(1)}`;
    }
    if (cleaned.startsWith('63')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    return `+63${cleaned}`;
  };

  // 3. Requesting the SMS OTP (Phase A)
  const requestSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setError('Please input a valid phone number (example: 09191234567)');
      setLoading(false);
      return;
    }

    try {
      const formattedNum = formatPhilippinePhoneNumber(phoneNumber);
      const appVerifier = recaptchaVerifierRef.current;

      if (!appVerifier) {
        throw new Error('reCAPTCHA verifier is not fully initialized. Please try again.');
      }

      // Invoke the Firebase SDK to trigger the Phone OTP
      const confirmationResult = await signInWithPhoneNumber(auth, formattedNum, appVerifier);
      
      // Store the confirmation container inside the mutable ref
      confirmationResultRef.current = confirmationResult;
      setVerificationSent(true);
    } catch (err: any) {
      console.error('SMS Delivery Failure:', err);
      setError(err.message || 'Error sending confirmation token. Please check the phone number format.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes across multi-inputs
  const handleDigitChange = (value: string, index: number) => {
    if (/[^0-9]/.test(value)) return; // Allow only digits
    
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Dynamic auto-focus shift to the next or previous inputs
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  // 4. Verification & Backend Registration Handling (Phase B)
  const verifyOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setError('Please complete the 6-digit confirmation code.');
      setLoading(false);
      return;
    }

    try {
      const confirmationResult = confirmationResultRef.current;
      if (!confirmationResult) {
        throw new Error('Verification session has expired. Please request a new code.');
      }

      // Validate the 6-digit token locally with Firebase
      const result = await confirmationResult.confirm(fullCode);
      const firebaseUser = result.user;

      console.log('Firebase user successfully authenticated:', firebaseUser.uid);

      // Async database write: POST user info to your backend repository
      const backendResponse = await fetch('/api/auth/register-farmer-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          isPhoneVerified: true,
          phone: formattedPhoneNumberLabel(phoneNumber)
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.message || 'Failed to synchronize registration state with server database.');
      }

      const dbStatus = await backendResponse.json();

      if (dbStatus.success) {
        console.log('Database verification status verified. Redirecting...');
        
        // Let the outer context trigger success redirects if supplied
        if (onSuccessRedirect) {
          onSuccessRedirect();
        } else {
          // Fallback programmatic redirection directly to the Sign In route
          window.location.href = '/signin';
        }
      } else {
        throw new Error(dbStatus.message || 'Database rejected registration state update.');
      }
    } catch (err: any) {
      console.error('OTP Verification Failure:', err);
      setError(err.message || 'Invalid confirmation code. Please check and try typing again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to standardise display format
  const formattedPhoneNumberLabel = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return cleaned;
    if (cleaned.startsWith('63')) return `0${cleaned.substring(2)}`;
    return cleaned;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl border border-slate-100 shadow-sm font-sans">
      {/* Invisible reCAPTCHA container required by Firebase */}
      <div id="recaptcha-verifier-container" className="hidden"></div>

      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
          <Phone className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Phone Authentication</h2>
        <p className="text-xs text-slate-500 mt-1">
          {!verificationSent 
            ? 'Enter your mobile number to receive a 6-digit confirmation code.' 
            : `6-digit code has been sent to ${phoneNumber}`
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 text-xs text-left animate-in fade-in slide-in-from-top-2 duration-250">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!verificationSent ? (
        /* PHASE A: Requesting the SMS OTP */
        <form onSubmit={requestSmsOtp} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mobile Number
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="Phone Number (e.g. 09191234567)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending SMS...
              </>
            ) : (
              'Send OTP Code'
            )}
          </button>
        </form>
      ) : (
        /* PHASE B: Confirming the 6-Digit Code */
        <form onSubmit={verifyOtpCode} className="space-y-6 text-left">
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Enter Verification Code
            </label>
            <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-digit-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  disabled={loading}
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl text-center text-lg font-bold focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-60"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading || otpCode.some(val => !val)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Account...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Verify & Redirect
                </>
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setVerificationSent(false);
                setOtpCode(Array(6).fill(''));
                setError('');
              }}
              className="w-full py-2.5 text-slate-400 hover:text-emerald-600 text-xs font-semibold text-center mt-1 transition-colors block"
            >
              Back to edit number
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
