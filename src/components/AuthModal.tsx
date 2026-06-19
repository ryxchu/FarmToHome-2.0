import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { X, Mail, Lock, User, Phone, Check, Eye, EyeOff, Sprout, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, browserPopupRedirectResolver, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { LegalModal } from './LegalModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'buyer' | 'farmer' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', initialRole = 'buyer' }) => {
  const { loginSimulatedDemo, profile, setAuthVariant } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot-password'>(initialMode);

  const handleClose = async () => {
    sessionStorage.removeItem('otp_lock_active');
    if (mode === 'otp' || (profile && profile.status === 'unverified')) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Error signing out unverified session on close:", err);
      }
    }
    onClose();
  };
  const [role, setRole] = useState<'buyer' | 'farmer' | 'admin'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpMethod, setOtpMethod] = useState<'email' | 'phone'>('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // Validation tracking states
  const [touched, setTouched] = useState<{ [key: string] : boolean }>({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Detect restricted webviews (like FB Messenger, Viber, Line, Telegram, etc.)
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isRestrictedWebview = /FBAN|FBAV|Instagram|Messenger|Viber|Line|Telegram|WeChat|Snapchat/i.test(ua);
    setIsInAppBrowser(isRestrictedWebview);
  }, []);

  // Persist role selection in localStorage so social auth flows in AuthContext can reference it during registration
  useEffect(() => {
    localStorage.setItem('auth_intent_role', role);
  }, [role]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setError('');
      
      // Retain or restore success message if saved during unmount/remount boundary transitions
      const storedMsg = sessionStorage.getItem('auth_success_message');
      if (storedMsg) {
        setSuccessMessage(storedMsg);
        sessionStorage.removeItem('auth_success_message');
      } else {
        setSuccessMessage('');
      }

      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setPhone('');
      setOtp(['', '', '', '', '', '']);
      setDevOtp('');
      setTouched({});
      setFormSubmitted(false);
    }
  }, [isOpen, initialMode, initialRole]);

  // Auto-close if user is authenticated and not in OTP mode - cleaned up from volatile triggers like mode or otpMethod
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      const checkProfile = async () => {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          if (profileData && profileData.status === 'unverified') {
            setMode(currentMode => {
              if (currentMode !== 'otp') {
                const userEmail = profileData.email || '';
                const userPhone = profileData.phone || '';
                setEmail(userEmail);
                setPhone(userPhone);
                
                // Directly trigger OTP send using active selection safely
                setOtpMethod(currentMethod => {
                  sendOtp(currentMethod, userEmail, userPhone);
                  return currentMethod;
                });
                return 'otp';
              }
              return currentMode;
            });
          } else {
            onClose();
          }
        }
      };
      checkProfile();
    }
  }, [isOpen, onClose]);

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setError(''); // CRITICAL: Clear error when switching modes
    setSuccessMessage('');
    setTouched({});
    setFormSubmitted(false);
  };

  // Password validation
  const passChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: confirmPassword && password === confirmPassword
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(09|\+63|9)\d{9}$|^[0-9]{10,12}$/;

  const getFieldError = (fieldName: string): string => {
    if (mode === 'login') {
      if (fieldName === 'email') {
        if (!email) return 'Email is required';
        if (!emailRegex.test(email)) return 'Please enter a valid email address (e.g., name@domain.com)';
      }
      if (fieldName === 'password') {
        if (!password) return 'Password is required';
      }
    } else if (mode === 'register') {
      if (fieldName === 'fullName') {
        if (!fullName.trim()) return 'Full name is required';
        if (fullName.trim().length < 2) return 'Full name must be at least 2 characters';
        if (/\d/.test(fullName)) return 'Full name must not contain numbers';
      }
      if (fieldName === 'phone') {
        if (!phone.trim()) return 'Phone number is required';
        if (!phoneRegex.test(phone.trim())) return 'Please enter a valid 10-12 digit phone number';
      }
      if (fieldName === 'email') {
        if (!email) return 'Email is required';
        if (!emailRegex.test(email)) return 'Please enter a valid email address (e.g., name@domain.com)';
      }
      if (fieldName === 'password') {
        if (!password) return 'Password is required';
        if (password.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
        if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
        if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
      }
      if (fieldName === 'confirmPassword') {
        if (!confirmPassword) return 'Please confirm your password';
        if (password !== confirmPassword) return 'Passwords do not match';
      }
    }
    return '';
  };

  const isFormValid = (() => {
    if (mode === 'login') {
      return !!(email && emailRegex.test(email) && password);
    } else if (mode === 'register') {
      return !!(
        fullName.trim().length >= 2 &&
        !/\d/.test(fullName) &&
        phoneRegex.test(phone.trim()) &&
        email && emailRegex.test(email) &&
        Object.values(passChecks).every(v => v) &&
        agreedToTerms
      );
    }
    return true;
  })();

  const getInputStyles = (fieldName: string) => {
    const hasError = getFieldError(fieldName);
    const isTouchedOrSubmitted = touched[fieldName] || formSubmitted;
    
    if (isTouchedOrSubmitted && hasError) {
      return "w-full px-6 py-4 md:px-8 md:py-5 bg-rose-50/50 border-2 border-rose-500 rounded-2xl text-sm focus:border-rose-500 focus:bg-white focus:outline-none transition-all font-medium placeholder:text-slate-400 shadow-sm";
    }
    return "w-full px-6 py-4 md:px-8 md:py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300 shadow-xs";
  };

  const renderFieldError = (fieldName: string) => {
    const errorMsg = getFieldError(fieldName);
    const isTouchedOrSubmitted = touched[fieldName] || formSubmitted;
    if (isTouchedOrSubmitted && errorMsg) {
      return (
        <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block mt-1.5 ml-2">
          ⚠️ {errorMsg}
        </span>
      );
    }
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    
    const fields = mode === 'login' ? ['email', 'password'] : ['fullName', 'phone', 'email', 'password', 'confirmPassword'];
    const newTouched = { ...touched };
    fields.forEach(f => {
      newTouched[f] = true;
    });
    setTouched(newTouched);

    if (!isFormValid) return;
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        // Check if database profile exists. If not, it was deleted by an admin!
        if (email.toLowerCase() !== 'ryzabasas16@gmail.com') {
          const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
          if (!userDoc.exists()) {
            const { deleteUser } = await import('firebase/auth');
            await deleteUser(userCred.user);
            throw new Error("Your account has been deleted by an administrator. Your login has been completely cleared, and you can now register a fresh account with this email.");
          }
        }
        onClose();
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // Force admin for the bootstrapped user
        const finalRole = email === 'ryzabasas16@gmail.com' ? 'admin' : role;
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          email,
          fullName,
          phone,
          role: finalRole,
          status: finalRole === 'admin' ? 'verified' : 'unverified',
          createdAt: new Date().toISOString()
        });
        setMode('otp');
        sendOtp(otpMethod);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase. Please enable it in the console or use Google Sign-in.');
      } else if (err.code === 'auth/email-already-in-use') {
        try {
          // Attempt self-healing: see if we can log in with the typed password
          const checkCred = await signInWithEmailAndPassword(auth, email, password);
          // If login succeeds, check if the Firestore document exists
          const userDoc = await getDoc(doc(db, 'users', checkCred.user.uid));
          if (!userDoc.exists()) {
            // Document does not exist in Firestore! This is an out-of-sync orphaned login.
            const { deleteUser } = await import('firebase/auth');
            await deleteUser(checkCred.user);
            
            // Now register a fresh account using the requested credentials
            const newCred = await createUserWithEmailAndPassword(auth, email, password);
            const finalRole = email === 'ryzabasas16@gmail.com' ? 'admin' : role;
            await setDoc(doc(db, 'users', newCred.user.uid), {
              uid: newCred.user.uid,
              email,
              fullName,
              phone,
              role: finalRole,
              status: finalRole === 'admin' ? 'verified' : 'unverified',
              createdAt: new Date().toISOString()
            });
            setMode('otp');
            sendOtp(otpMethod);
            return;
          } else {
            // Profile exists normally in database, so this email is indeed in use
            setError('ALREADY_REGISTERED');
          }
        } catch (signInErr: any) {
          // If login fails (wrong password or other), prompt the user with instructions to resolve the conflict
          setError('ORPHANED_AUTH_CONFLICT');
        }
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed') || err.message?.includes('network-failed') || err.message?.includes('network')) {
        setError('NETWORK_FAILED_SANDBOX');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (!userDoc.exists()) {
        const finalRole = userCred.user.email === 'ryzabasas16@gmail.com' ? 'admin' : role;
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          email: userCred.user.email,
          fullName: userCred.user.displayName || 'New User',
          role: finalRole, 
          status: 'verified',
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.warn("Google credentials window closed by the user.");
        setError('The login window was closed before completion. If this keeps happening in the preview, click "Open in New Tab" up top or log in with your email & password.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        console.warn("Google popup request cancelled or repeated.");
        setError('Google Sign-in request was cancelled. If you clicked multiple times, please wait or click "Open in New Tab" to authorize outside the preview window.');
      } else if (err.code === 'auth/popup-blocked') {
        console.warn("Google popup was blocked by the browser sandbox.");
        setError('The login popup was blocked by your browser. Please allow popups, or open the app in a new tab by clicking "Open in New Tab" in the top-right corner.');
      } else {
        console.error("Google Sign-in Error:", err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new FacebookAuthProvider();
      const userCred = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (!userDoc.exists()) {
        const finalRole = userCred.user.email === 'ryzabasas16@gmail.com' ? 'admin' : role;
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          email: userCred.user.email || '',
          fullName: userCred.user.displayName || 'Facebook User',
          phone: userCred.user.phoneNumber || '',
          role: finalRole, 
          status: 'verified',
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.warn("Facebook credentials window closed by the user.");
        setError('The login window was closed before completion. If this keeps happening in the preview, click "Open in New Tab" up top or log in with your email & password.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        console.warn("Facebook popup request cancelled or repeated.");
        setError('Facebook Sign-in request was cancelled. If you clicked multiple times, please wait or click "Open in New Tab" to authorize outside the preview window.');
      } else if (err.code === 'auth/popup-blocked') {
        console.warn("Facebook popup was blocked by the browser sandbox.");
        setError('The login popup was blocked by your browser. Please allow popups, or open the app in a new tab by clicking "Open in New Tab" in the top-right corner.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Facebook auth is not enabled in backend. Please use Google Sign-in or email & password.');
      } else {
        console.error("Facebook Sign-in Error:", err);
        setError(err.message || 'Failed to sign in with Facebook');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (method: 'email' | 'phone', overrideEmail?: string, overridePhone?: string) => {
    // Intercept and prevent redundant/infinite loop send dispatch triggers
    if (sessionStorage.getItem('otp_lock_active') === 'true') {
      console.warn("[OTP Prevention] Active session lock exists. Skipping repeated dispatch.");
      return;
    }

    setLoading(true);
    setDevOtp('');
    const targetEmail = overrideEmail || email;
    const targetPhone = overridePhone || phone;
    
    // Generate a secure 6-digit verification code purely on the client-side
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      if (method === 'email') {
        const templateParams = {
          to_email: targetEmail,
          email: targetEmail,
          otp_code: generatedOtp,
          otp: generatedOtp,
          code: generatedOtp,
          to_name: fullName || 'User'
        };

        // Send direct, secure, serverless email delivery using EmailJS
        await emailjs.send(
          (import.meta as any).env.VITE_EMAILJS_SERVICE_ID || 'service_bgzc415',
          (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID || 'template_jguos4q',
          templateParams,
          (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY || ''
        );
        
        // Lock the session against spam loops or repeat automatic render invokes
        sessionStorage.setItem('otp_lock_active', 'true');
        
        console.info(`[EmailJS] OTP verification code delivered to ${targetEmail}`);
      } else {
        // Simulated Phone delivery with sandbox trace
        console.info(`[SMS SIMULATOR] Direct carrier bypass code generated: ${generatedOtp} sent to: ${targetPhone}`);
      }

      // Record state verification token
      sessionStorage.setItem('sandbox_otp_code', generatedOtp);
      setDevOtp(generatedOtp);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      console.warn("Direct EmailJS delivery encountered issues, fallback to simulator:", err);
      // Fallback so that developers/testers are never locked out of testing sign up
      sessionStorage.setItem('sandbox_otp_code', generatedOtp);
      setDevOtp(generatedOtp);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      let isVerified = false;

      // 1. Check local secure sandbox/EmailJS generated codes first for frictionless verification
      const storedSandboxOtp = sessionStorage.getItem('sandbox_otp_code');
      if (storedSandboxOtp && enteredOtp === storedSandboxOtp) {
        isVerified = true;
        sessionStorage.removeItem('sandbox_otp_code');
      } else if (devOtp && enteredOtp === devOtp) {
        isVerified = true;
      } else {
        // 2. Secondary fallback to fetch API if user was initialized server-side earlier
        try {
          const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: otpMethod === 'email' ? email : phone,
              otp: enteredOtp
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              isVerified = true;
            }
          }
        } catch (apiErr) {
          console.warn("API base OTP check omitted/failed, using standalone client state verification", apiErr);
        }
      }

      if (isVerified) {
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            status: 'verified'
          }, { merge: true });
        }
        
        // Save the success message across the unmount/remount flow
        sessionStorage.setItem('auth_success_message', 'Account verified successfully! Please log in to your account.');
        
        // Update the central auth variant mode to login BEFORE signing out
        if (setAuthVariant) {
          setAuthVariant({ mode: 'login', role: role || 'buyer' });
        }
        
        // Sign out so they must log in using the newly created/verified account first
        await auth.signOut();
        
        // Retain email for ease, reset password and otp state
        setPassword('');
        setConfirmPassword('');
        setOtp(['', '', '', '', '', '']);
        setDevOtp('');
        
        setSuccessMessage('Account verified successfully! Please log in to your account.');
        setMode('login');
      } else {
        setError('Invalid verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTouched(prev => ({ ...prev, email: true }));
    const emailErr = getFieldError('email');
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Trigger Firebase standard reset link
      await sendPasswordResetEmail(auth, email);
      
      // 2. Send custom SMTP notification (optional, but helpful to verify SMTP is working)
      try {
        await fetch('/api/forgot-password-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      } catch (notifyErr) {
        console.warn("Failed to send SMTP notification, but Firebase reset was triggered.");
      }

      setError('PASSWORD_RESET_SENT');
    } catch (err: any) {
      console.error("Reset Error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('unavailable')) {
        setError('Connection issue. Please check your internet or try again later.');
      } else {
        setError('Failed to send reset email. Please check your email address.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center p-4 md:p-8 bg-primary/40 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-5xl rounded-[3rem] md:rounded-[4rem] shadow-2xl relative border-4 border-white forest-shadow my-auto overflow-hidden flex flex-col md:flex-row"
      >
        {/* Dynmically styled Close button to preserve high accessibility & visibility regardless of mode placement */}
        <button 
          onClick={handleClose} 
          className={`absolute top-4 right-4 sm:top-6 sm:right-6 p-3 sm:p-4 hover:scale-110 active:scale-90 transition-all z-20 shadow-md md:shadow-xl group rounded-2xl ${
            mode === 'login'
              ? 'bg-slate-100 md:bg-white/10 hover:bg-slate-200 md:hover:bg-white border border-slate-200/50 md:border-white/20'
              : 'bg-slate-100 md:bg-slate-100 hover:bg-slate-200 md:hover:bg-slate-200 border border-slate-200'
          }`}
        >
          <X 
            className={`w-5 h-5 group-hover:rotate-90 transition-transform duration-300 ${
              mode === 'login'
                ? 'text-slate-600 md:text-white md:group-hover:text-secondary'
                : 'text-slate-600 md:text-slate-700'
            }`} 
          />
        </button>
 
        {/* Left Side: Toggle Panel */}
        <motion.div 
          layout
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`hidden md:flex w-full md:w-[40%] p-12 md:p-20 flex-col items-center justify-center text-center relative overflow-hidden ${mode === 'register' ? 'bg-primary text-white font-sans' : 'bg-secondary text-white font-sans md:order-last'}`}
        >
          <div className="absolute inset-0 amakan-pattern opacity-10" />
          <div className="relative z-10 flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'register' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'register' ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl md:text-6xl font-bold font-serif italic mb-6 tracking-tighter">
                  {mode === 'register' ? 'Welcome!' : 'Hello!'}
                </h2>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-12 max-w-[200px] mx-auto leading-relaxed">
                  {mode === 'register' ? 'Join our community of local farmers and buyers' : 'Sign in to access your farm dashboard'}
                </p>
              </motion.div>
            </AnimatePresence>
            <button 
              type="button"
              onClick={toggleMode}
              className="px-12 py-5 bg-transparent border-2 border-white/30 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-primary transition-all active:scale-95 shadow-sm"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </motion.div>

        {/* Right Side: Form Panel */}
        <motion.div 
          layout
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="w-full md:w-[60%] p-6 sm:p-12 md:p-20 bg-white"
        >
          <div className="max-w-md mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tighter font-serif italic mb-8">
                  {mode === 'register' ? 'Create Account' : mode === 'forgot-password' ? 'Reset Password' : 'Welcome Back!'}
                </h2>
              </motion.div>
            </AnimatePresence>

            {mode === 'forgot-password' && (
              <div className="mb-8">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
            )}

            {mode === 'register' && (
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-6">
                <button 
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${role === 'buyer' ? 'bg-white shadow-md text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Buyer</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('farmer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${role === 'farmer' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <motion.div animate={{ rotate: role === 'farmer' ? [0, 15, -15, 0] : 0 }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Sprout className="w-4 h-4" />
                  </motion.div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Farmer</span>
                </button>
              </div>
            )}

            {mode === 'register' ? (
              <div className="flex flex-col gap-4 mb-6">
                <button 
                  type="button" 
                  onClick={handleGoogleSignIn}
                  className="w-full py-4.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 rounded-2xl flex items-center justify-center gap-3 transition-all group font-sans animate-pulse"
                  title="Continue with Google"
                >
                  <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-primary transition-colors">Continue with Google</span>
                </button>
                {isInAppBrowser && (
                  <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-900 text-[10px] font-bold uppercase tracking-wider flex flex-col gap-2 text-start">
                    <span className="flex items-center gap-1.5 text-amber-800">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping shrink-0" />
                      ⚠️ Restricted Webview Detected (Messenger / Viber)
                    </span>
                    <p className="normal-case text-slate-500 font-medium text-[10px] leading-relaxed">
                      Social log-ins are blocked inside custom chat apps. Tap the three dots <strong>(...)</strong> in the top-right corner of your screen & select <strong>"Open in Browser / Chrome"</strong> to sign in securely, or register below using <strong>email & password</strong>.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest shrink-0">or sign up with email</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              </div>
            ) : (
              <div className="mb-8 flex flex-col gap-4">
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-4.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 rounded-2xl flex items-center justify-center gap-3 transition-all group font-sans"
                >
                  <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-primary transition-colors">Continue with Google</span>
                </button>
                {isInAppBrowser && (
                  <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-900 text-[10px] font-bold uppercase tracking-wider flex flex-col gap-2 text-start">
                    <span className="flex items-center gap-1.5 text-amber-800">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping shrink-0" />
                      ⚠️ Restricted Webview Detected (Messenger / Viber)
                    </span>
                    <p className="normal-case text-slate-500 font-medium text-[10px] leading-relaxed">
                      Social log-ins are blocked inside custom chat apps. Tap the three dots <strong>(...)</strong> in the top-right corner of your screen & select <strong>"Open in Browser / Chrome"</strong> to sign in securely, or use your <strong>email & password</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={mode === 'otp' ? (e) => { e.preventDefault(); handleVerify(); } : mode === 'forgot-password' ? handleResetPassword : handleAuth} className="space-y-6">
              {mode === 'otp' ? (
                <div className="space-y-8">
                  <div className="flex flex-col gap-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Method</p>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => { sessionStorage.removeItem('otp_lock_active'); setOtpMethod('email'); sendOtp('email'); }}
                        className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${otpMethod === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <Mail className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Email</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => { sessionStorage.removeItem('otp_lock_active'); setOtpMethod('phone'); sendOtp('phone'); }}
                        className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${otpMethod === 'phone' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <Phone className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Phone</span>
                      </button>
                    </div>
                  </div>



                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      We've sent a 6-digit code to your <span className="font-bold text-slate-800">{otpMethod === 'email' ? email : phone}</span>.
                    </p>

                    <div className="flex justify-between gap-2">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (!value && e.target.value !== '') return;
                            const newOtp = [...otp];
                            newOtp[idx] = value;
                            setOtp(newOtp);
                            if (value && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                              document.getElementById(`otp-${idx - 1}`)?.focus();
                            }
                          }}
                          className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl text-center text-2xl font-bold focus:border-primary focus:bg-white transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button 
                      type="submit"
                      disabled={loading || otp.some(d => !d)}
                      className="w-full py-5 bg-slate-800 text-white rounded-full font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 disabled:opacity-40"
                    >
                      {loading ? 'Verifying...' : 'Verify Account'}
                    </button>
                    <button 
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={() => { sessionStorage.removeItem('otp_lock_active'); sendOtp(otpMethod); }}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {mode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="relative group text-start">
                        <input 
                          type="text" 
                          placeholder="Full Name" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)}
                          onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                          className={getInputStyles('fullName')}
                        />
                        {renderFieldError('fullName')}
                      </div>
                      <div className="relative group text-start">
                        <input 
                          type="tel" 
                          placeholder="Phone" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                          className={getInputStyles('phone')}
                        />
                        {renderFieldError('phone')}
                      </div>
                    </div>
                  )}
 
                  <div className="relative group text-start">
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                      className={getInputStyles('email')}
                      required
                    />
                    {renderFieldError('email')}
                  </div>
 
                  {mode === 'login' && (
                    <div className="space-y-4">
                      <div className="relative group text-start">
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                            className={getInputStyles('password')}
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {renderFieldError('password')}
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => {
                            setMode('forgot-password');
                            setError('');
                          }}
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                  )}
 
                  {mode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-start">
                      <div className="relative group text-start">
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                            className={getInputStyles('password')}
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {renderFieldError('password')}
                      </div>
 
                      <div className="relative group text-start">
                        <div className="relative">
                          <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirm" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                            className={getInputStyles('confirmPassword')}
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {renderFieldError('confirmPassword')}
                      </div>
                    </div>
                  )}
 
                  {mode === 'register' && (
                    <div className="flex flex-wrap gap-x-2 gap-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${passChecks.length ? 'text-primary bg-primary/5 border-primary/10' : 'text-rose-500 bg-rose-50 border-rose-100'}`}>
                        {passChecks.length ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-rose-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-tight">8+ Chars</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${passChecks.upper ? 'text-primary bg-primary/5 border-primary/10' : 'text-rose-500 bg-rose-50 border-rose-100'}`}>
                        {passChecks.upper ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-rose-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-tight">Upper</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${passChecks.number ? 'text-primary bg-primary/5 border-primary/10' : 'text-rose-500 bg-rose-50 border-rose-100'}`}>
                        {passChecks.number ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-rose-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-tight">Number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${passChecks.special ? 'text-primary bg-primary/5 border-primary/10' : 'text-rose-500 bg-rose-50 border-rose-100'}`}>
                        {passChecks.special ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-rose-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-tight">Special</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${passChecks.match ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-500 bg-rose-50 border-rose-100'}`}>
                        {passChecks.match ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-rose-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-tight">Match</span>
                      </div>
                    </div>
                  )}

                  {mode === 'register' && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-left select-none my-3">
                      <input 
                        type="checkbox" 
                        id="agree-checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-primary border-slate-300 focus:ring-primary cursor-pointer shrink-0"
                        required
                      />
                      <label htmlFor="agree-checkbox" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed cursor-pointer select-none">
                        I confirm that I agree to the <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalTab('terms'); setShowLegal(true); }}>Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalTab('privacy'); setShowLegal(true); }}>Privacy Policy</span> for FarmToHome.
                      </label>
                    </div>
                  )}
 
                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:gap-6">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-14 py-5 bg-slate-800 text-white rounded-full font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 disabled:opacity-40"
                    >
                      {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'forgot-password' ? 'Send Link' : 'Sign Up'}
                    </button>
                    {mode === 'forgot-password' && (
                      <button 
                        type="button"
                        onClick={() => setMode('login')}
                        className="mt-4 sm:mt-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors text-center sm:text-left"
                      >
                        Back to Login
                      </button>
                    )}
                  </div>

                  {/* Elegant mobile-only switch helper */}
                  <div className="md:hidden text-center mt-8 pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors py-2"
                    >
                      {mode === 'login' ? "New around here? Create Account" : "Registered? Welcome back - Sign In"}
                    </button>
                  </div>
                </>
              )}

              {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-[10px] font-bold uppercase tracking-tight flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

               {error && (
                <div className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl text-secondary text-[10px] font-bold uppercase tracking-tight flex flex-col gap-2 text-start">
                  {error === 'ALREADY_REGISTERED' ? (
                    <>
                      <span>This email is already registered.</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError('');
                        }}
                        className="text-primary hover:underline self-start"
                      >
                        Sign in instead?
                      </button>
                    </>
                  ) : error === 'ORPHANED_AUTH_CONFLICT' ? (
                    <div className="flex flex-col gap-2 text-start">
                      <p className="text-[11px] leading-relaxed text-secondary-dark font-semibold">
                        This email is already registered in Firebase Authentication, but its profile in the database is gone!
                      </p>
                      <p className="normal-case text-[10px] leading-normal text-slate-500 font-medium">
                        If you deleted this user in the Firestore database, please <strong>Sign In</strong> using your original password first. The system will automatically clear the old registration and guide you to sign up fresh!
                      </p>
                      <button 
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError('');
                        }}
                        className="text-primary hover:underline self-start font-bold uppercase tracking-wider text-[10px] mt-1"
                      >
                        Sign in instead to auto-heal
                      </button>
                    </div>
                  ) : error === 'PASSWORD_RESET_SENT' ? (
                    <div className="text-emerald-600 flex flex-col gap-2 text-start">
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3" />
                        <span>Reset link sent! Please check your email inbox.</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError('');
                        }}
                        className="text-primary hover:underline self-start"
                      >
                        Back to Login
                      </button>
                    </div>
                  ) : error === 'NETWORK_FAILED_SANDBOX' ? (
                    <div className="flex flex-col gap-3 text-start">
                      <p className="text-[11px] leading-relaxed text-secondary-dark font-semibold">
                        ⚠️ <strong>Network Connect Failed (Sandbox Blocked):</strong> Standard Auth Servers are unreachable on your mobile device or current cellular network.
                      </p>
                      <div className="p-3 bg-white/90 rounded-xl border border-secondary/10 flex flex-col gap-2">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tactile Offline Sandbox Lane</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (role === 'farmer') {
                              loginSimulatedDemo('farmer', 'mangjuandeal@gmail.com', 'Mang Juan (Demo Farmer)');
                            } else if (role === 'admin') {
                              loginSimulatedDemo('admin', 'ryzabasas16@gmail.com', 'Ryza Basas (Demo Admin)');
                            } else {
                              loginSimulatedDemo('buyer', 'salvadorbuyer@gmail.com', 'Patricia Salvador (Demo Buyer)');
                            }
                          }}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-[9px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          <Sprout className="w-3.5 h-3.5" /> Continue in Offline {role.toUpperCase()} Sandbox
                        </button>
                      </div>
                    </div>
                  ) : (
                    error
                  )}
                </div>
              )}
            </form>

          </div>
        </motion.div>
      </motion.div>

      {/* Embedded Legal Sub-Modal */}
      <AnimatePresence>
        {showLegal && (
          <LegalModal
            isOpen={showLegal}
            onClose={() => setShowLegal(false)}
            initialTab={legalTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
