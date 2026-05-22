import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, Check, Eye, EyeOff, Sprout, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'buyer' | 'farmer' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', initialRole = 'buyer' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot-password'>(initialMode);
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setError('');
      setSuccessMessage('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setPhone('');
      setOtp(['', '', '', '', '', '']);
      setDevOtp('');
    }
  }, [isOpen, initialMode, initialRole]);

  // Auto-close if user is authenticated and not in OTP mode
  useEffect(() => {
    if (isOpen && auth.currentUser && mode !== 'otp') {
      // Check if profile exists before closing to ensure they have the role set
      const checkProfile = async () => {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          if (profileData && profileData.status === 'unverified') {
            setMode('otp');
            sendOtp(otpMethod);
          } else {
            onClose();
          }
        }
      };
      checkProfile();
    }
  }, [isOpen, mode, onClose, otpMethod]);

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setError(''); // CRITICAL: Clear error when switching modes
    setSuccessMessage('');
  };

  // Password validation
  const passChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: confirmPassword && password === confirmPassword
  };

  const isFormValid = mode === 'login' ? (email && password) : (email && fullName && phone && Object.values(passChecks).every(v => v));

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
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
        setError('ALREADY_REGISTERED');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
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

  const sendOtp = async (method: 'email' | 'phone') => {
    setLoading(true);
    setDevOtp('');
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          type: method
        })
      });
      const data = await response.json();
      if (data.success) {
        setResendCooldown(60);
        setOtp(['', '', '', '', '', '']);
        if (data.dev) {
          console.info(`[DEV] OTP sent: ${data.otp}`);
          setDevOtp(data.otp);
        }
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError('Failed to send verification code. Please try again.');
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
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: otpMethod === 'email' ? email : phone,
          otp: enteredOtp
        })
      });
      const data = await response.json();

      if (data.success) {
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            status: 'verified'
          }, { merge: true });
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
        setError(data.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
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
        <button onClick={onClose} className="absolute top-6 right-6 p-4 bg-white/10 backdrop-blur-md hover:bg-white hover:scale-110 active:scale-90 transition-all z-20 border border-white/20 shadow-xl group rounded-2xl">
          <X className="w-5 h-5 text-white md:text-slate-400 group-hover:rotate-90 transition-transform duration-300" />
        </button>
 
        {/* Left Side: Toggle Panel */}
        <motion.div 
          layout
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`w-full md:w-[40%] p-12 md:p-20 flex flex-col items-center justify-center text-center relative overflow-hidden ${mode === 'register' ? 'bg-primary text-white font-sans' : 'bg-secondary text-white font-sans md:order-last'}`}
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
          className="w-full md:w-[60%] p-12 md:p-20 bg-white"
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
              <div className="flex items-center gap-4 mb-6">
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => alert('Facebook sign-in/up is not configured in this environment.')} 
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 hover:bg-white hover:shadow-lg transition-all group"
                    title="Continue with Facebook"
                  >
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs">f</div>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleGoogleSignIn}
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 hover:bg-white hover:shadow-lg transition-all group"
                    title="Continue with Google"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                </div>
                <div className="h-px flex-1 bg-slate-100 ml-2" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or use email</span>
              </div>
            ) : (
              <div className="mb-8 p-1.5 bg-slate-50 rounded-[2rem] flex items-center gap-3 border border-slate-100">
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex-1 py-3.5 px-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center gap-3 group hover:scale-[1.02] transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Google</span>
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Facebook sign-in/up is not configured in this environment.')}
                  className="flex-1 py-3.5 px-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center gap-3 group hover:scale-[1.02] transition-all"
                >
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs">f</div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Facebook</span>
                </button>
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
                        onClick={() => { setOtpMethod('email'); sendOtp('email'); }}
                        className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${otpMethod === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <Mail className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Email</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setOtpMethod('phone'); sendOtp('phone'); }}
                        className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${otpMethod === 'phone' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <Phone className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Phone</span>
                      </button>
                    </div>
                  </div>

                  {devOtp && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col items-center justify-center gap-1 text-center shadow-lg shadow-emerald-500/5 mb-4"
                    >
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Localhost Dev Mode Active</span>
                      <p className="text-[11px] font-semibold text-emerald-600/90 leading-relaxed">
                        Verification code is <strong className="text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-sm text-sm font-bold ml-1">{devOtp}</strong> (Enter this code below to proceed!)
                      </p>
                    </motion.div>
                  )}

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
                      onClick={() => sendOtp(otpMethod)}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {mode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <input 
                      type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                    />
                  </div>
                  <div className="relative group">
                    <input 
                      type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                    />
                  </div>
                </div>
              )}

              <div className="relative group">
                <input 
                  type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                  required
                />
              </div>

              {mode === 'login' && (
                <div className="space-y-4">
                  <div className="relative group text-start">
                    <input 
                      type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
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
                <div className="grid grid-cols-2 gap-4 text-start">
                  <div className="relative group text-start">
                    <input 
                      type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
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

                  <div className="relative group text-start">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} placeholder="Confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
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
                </div>
              )}

              {mode === 'register' && password && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className={`flex items-center gap-1.5 ${passChecks.length ? 'text-primary' : 'text-slate-200'}`}>
                    <Check className={`w-2.5 h-2.5 ${passChecks.length ? 'opacity-100' : 'opacity-20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">8+ Chars</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.upper ? 'text-primary' : 'text-slate-200'}`}>
                    <Check className={`w-2.5 h-2.5 ${passChecks.upper ? 'opacity-100' : 'opacity-20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Upper</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.number ? 'text-primary' : 'text-slate-200'}`}>
                    <Check className={`w-2.5 h-2.5 ${passChecks.number ? 'opacity-100' : 'opacity-20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.special ? 'text-primary' : 'text-slate-200'}`}>
                    <Check className={`w-2.5 h-2.5 ${passChecks.special ? 'opacity-100' : 'opacity-20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Special</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.match ? 'text-emerald-500' : 'text-slate-200'}`}>
                    <Check className={`w-2.5 h-2.5 ${passChecks.match ? 'opacity-100' : 'opacity-20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Match</span>
                  </div>
                </div>
              )}

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={loading || !isFormValid}
                      className="w-full sm:w-auto px-14 py-5 bg-slate-800 text-white rounded-full font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 disabled:opacity-40"
                    >
                      {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'forgot-password' ? 'Send Link' : 'Sign Up'}
                    </button>
                    {mode === 'forgot-password' && (
                      <button 
                        type="button"
                        onClick={() => setMode('login')}
                        className="ml-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        Back to Login
                      </button>
                    )}
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
                <div className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl text-secondary text-[10px] font-bold uppercase tracking-tight flex flex-col gap-2">
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
                  ) : error === 'PASSWORD_RESET_SENT' ? (
                    <div className="text-emerald-600 flex flex-col gap-2">
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
                  ) : (
                    error
                  )}
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
