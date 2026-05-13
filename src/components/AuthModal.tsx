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
        className="bg-white w-full max-w-5xl rounded-[3rem] md:rounded-[4rem] shadow-2xl relative border-4 border-white forest-shadow my-auto overflow-hidden flex flex-col md:flex-row"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-4 bg-white/10 backdrop-blur-md hover:bg-white hover:scale-110 active:scale-90 transition-all z-20 border border-white/20 shadow-xl group rounded-2xl">
          <X className="w-5 h-5 text-white md:text-slate-400 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Left Side: Toggle Panel */}
        <div className={`w-full md:w-[40%] p-12 md:p-20 flex flex-col items-center justify-center text-center transition-all duration-700 relative overflow-hidden ${mode === 'register' ? 'bg-primary text-white' : 'bg-secondary text-white md:order-last'}`}>
          <div className="absolute inset-0 amakan-pattern opacity-10" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold font-serif italic mb-6 tracking-tighter">
              {mode === 'register' ? 'Welcome Back!' : 'Create an Account'}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-12 max-w-[200px] mx-auto leading-relaxed">
              {mode === 'register' ? 'Sign in to access your farm dashboard' : 'Join our community of local farmers and buyers'}
            </p>
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="px-10 py-4 bg-transparent border-2 border-white/40 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-primary transition-all active:scale-95"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-full md:w-[60%] p-12 md:p-20 bg-white">
          <div className="max-w-md mx-auto">
            <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic mb-8">
              {mode === 'register' ? 'Create an Account' : 'Welcome Back!'}
            </h2>

            {mode === 'register' && (
              <div className="flex gap-4 mb-10">
                <button className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-black text-sm">f</div>
                </button>
                <button className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="w-6 h-6 bg-blue-400 rounded flex items-center justify-center text-white font-black text-sm italic">in</div>
                </button>
                <button className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white font-black text-sm">𝕏</div>
                </button>
              </div>
            )}

            {mode === 'register' && (
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-8">or use your email for registration</p>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              {mode === 'register' && (
                <div className="relative group">
                  <input 
                    type="text" placeholder="Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              <div className="relative group">
                <input 
                  type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                  required
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center opacity-40 group-focus-within:opacity-100 transition-opacity">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:border-primary focus:bg-white transition-all font-medium placeholder:text-slate-300"
                  required
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center opacity-40 group-focus-within:opacity-100 transition-opacity">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl text-secondary text-[11px] font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading || !isFormValid}
                className="px-14 py-5 bg-slate-800 text-white rounded-full font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 disabled:opacity-40"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
