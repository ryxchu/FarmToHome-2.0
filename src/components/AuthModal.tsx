import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'buyer' | 'farmer' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', initialRole = 'buyer' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setError('');
      setPassword('');
      setConfirmPassword('');
      setOtp(['', '', '', '', '', '']);
    }
  }, [isOpen, initialMode, initialRole]);

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
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase. Please enable it in the console or use Google Sign-in.');
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
      console.error("Google Sign-in Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('The login window was closed before completion. Please try again and complete the sign-in. If this persists, try opening the app in a new tab.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('A previous login request is still pending. Please wait or refresh the page.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('The login popup was blocked by your browser. Please allow popups for this site or try opening the app in a new tab.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp !== '123456') {
      setError('Invalid verification code. Please try 123456 for testing.');
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          status: 'verified'
        }, { merge: true });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center p-4 md:p-8 bg-primary/40 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] md:rounded-[4rem] shadow-2xl relative border-4 border-white forest-shadow my-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 md:p-4 bg-accent-light hover:bg-white hover:scale-110 active:scale-90 transition-all z-10 border border-primary/5 shadow-inner group rounded-2xl">
          <X className="w-5 h-5 md:w-6 md:h-6 text-primary group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="p-8 md:p-16">
          <div className="text-center mb-8 md:mb-14 flex flex-col items-center">
            <div className="h-24 mb-6">
              <img 
                src="/logo.png" 
                alt="FarmToHome Logo" 
                className="h-full w-auto object-contain" 
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tighter font-serif italic mb-4">
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Security Verification'}
            </h2>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] max-w-xs mx-auto leading-relaxed">
              {mode === 'login' 
                ? 'Sign in to your account' 
                : mode === 'register' 
                  ? 'Join our community of farmers and buyers' 
                  : `We've sent a 6-digit confirmation code to ${email || phone}. Please check your inbox or messages.`}
            </p>
          </div>

          {mode !== 'otp' ? (
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-accent-light rounded-[2rem] md:rounded-[2.5rem] md:mb-10 border border-primary/5 shadow-inner">
                <button 
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`py-3.5 rounded-[2rem] text-[10px] font-bold transition-all uppercase tracking-widest active:scale-95 ${role === 'buyer' ? 'bg-white shadow-xl text-primary border border-primary/5 scale-105' : 'text-slate-400 hover:text-primary hover:bg-white/50'}`}
                >
                  Buyer
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('farmer')}
                  className={`py-3.5 rounded-[2rem] text-[10px] font-bold transition-all uppercase tracking-widest active:scale-95 ${role === 'farmer' ? 'bg-white shadow-xl text-primary border border-primary/5 scale-105' : 'text-slate-400 hover:text-primary hover:bg-white/50'}`}
                >
                  Farmer
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-3.5 rounded-[2rem] text-[10px] font-bold transition-all uppercase tracking-widest active:scale-95 ${role === 'admin' ? 'bg-white shadow-xl text-primary border border-primary/5 scale-105' : 'text-slate-400 hover:text-primary hover:bg-white/50'}`}
                >
                  Admin
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'register' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-accent-light border border-transparent rounded-3xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-accent-light border border-transparent rounded-3xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                )}

              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-accent-light border border-transparent rounded-3xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-16 py-5 bg-accent-light border border-transparent rounded-3xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {mode === 'register' && (
                <>
                  <div className="relative group">
                    <Check className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-14 pr-16 py-5 bg-accent-light border border-transparent rounded-3xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 px-2">
                    <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest ${passChecks.length ? 'text-primary' : 'text-slate-200'}`}>
                      <Check className="w-3.5 h-3.5" /> 8 Characters Min
                    </div>
                    <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest ${passChecks.upper ? 'text-primary' : 'text-slate-200'}`}>
                      <Check className="w-3.5 h-3.5" /> Uppercase Letter
                    </div>
                    <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest ${passChecks.number ? 'text-primary' : 'text-slate-200'}`}>
                      <Check className="w-3.5 h-3.5" /> One Number
                    </div>
                    <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest ${passChecks.special ? 'text-primary' : 'text-slate-200'}`}>
                      <Check className="w-3.5 h-3.5" /> Special Character
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="p-6 bg-secondary/5 border-2 border-secondary/10 rounded-[2rem] flex items-start gap-4 text-secondary text-[11px] font-bold uppercase tracking-tight">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-bold font-serif text-xl shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
              </button>

              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-4 text-slate-300 font-bold tracking-[0.4em]">Or continue with</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-5 bg-white border-2 border-border rounded-[2.5rem] font-bold text-slate-600 flex items-center justify-center gap-4 hover:border-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 text-[11px] uppercase tracking-widest"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Google Login
              </button>

              <p className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest pt-6">
                {mode === 'login' ? "No account?" : "Already have an account?"}{' '}
                <button 
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-primary hover:text-secondary transition-colors underline decoration-2 underline-offset-4"
                >
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </form>
          </div>
          ) : (
            <div className="space-y-12">
              <div className="flex justify-between gap-3">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newOtp = [...otp];
                      newOtp[idx] = e.target.value;
                      setOtp(newOtp);
                      if (e.target.value && idx < 5) {
                        const next = e.target.nextElementSibling as HTMLInputElement;
                        next?.focus();
                      }
                    }}
                    className="w-14 h-16 bg-accent-light border-2 border-transparent rounded-[1.5rem] text-center text-2xl font-bold font-serif text-primary focus:border-primary focus:bg-white focus:outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {error && (
                <div className="p-6 bg-secondary/5 border-2 border-secondary/10 rounded-[2rem] flex items-start gap-4 text-secondary text-[11px] font-bold uppercase tracking-tight">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button 
                onClick={handleVerify}
                disabled={loading}
                className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-bold font-serif text-xl shadow-2xl shadow-primary/20 disabled:opacity-40 animate-pulse-slow"
              >
                {loading ? 'Confirming...' : 'Verify Code'}
              </button>
              <div className="text-center space-y-6">
                <button 
                  onClick={() => setMode('login')}
                  className="text-[10px] font-bold text-slate-300 hover:text-primary transition-colors tracking-[0.5em] uppercase hover:underline"
                >
                  Back to Login
                </button>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setError('');
                      alert(`A new code has been sent to ${email}`);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors tracking-[0.4em] uppercase"
                  >
                    Resend to Email
                  </button>
                  {phone && (
                    <button 
                      onClick={() => {
                        setError('');
                        alert(`A new code has been sent to ${phone}`);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors tracking-[0.4em] uppercase"
                    >
                      Resend to Phone SMS
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
