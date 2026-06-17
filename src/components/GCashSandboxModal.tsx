import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Smartphone, ArrowRight, CheckCircle2, Lock, X } from 'lucide-react';

interface GCashSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  phone: string;
  name: string;
  onSuccess: () => void;
}

export const GCashSandboxModal: React.FC<GCashSandboxModalProps> = ({
  isOpen,
  onClose,
  total,
  phone,
  name,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputPhone, setInputPhone] = useState(phone || '09170000000');
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);

  useEffect(() => {
    if (step === 2 && otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer(p => p - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, otpTimer]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(prev => (prev + 1) as any);
    }, 1200);
  };

  const handleConfirmPay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(4);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#fafbfd] w-full max-w-sm rounded-[2rem] shadow-2xl border border-blue-100 overflow-hidden flex flex-col font-sans"
      >
        {/* GCash Iconic Blue Header */}
        <div className="bg-[#0051cc] p-6 text-white relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white text-[#0051cc] text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
              Sandbox App
            </span>
            <span className="text-white/60 text-xs font-semibold uppercase tracking-widest flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> GCash Sauté Secure
            </span>
          </div>

          <p className="text-[11px] uppercase font-black text-white/70 tracking-widest leading-none">Merchant Name</p>
          <h3 className="text-lg font-bold font-serif italic tracking-tight text-white mb-4">FarmToHome Co-op</h3>

          <div className="flex justify-between items-end border-t border-white/10 pt-4 mt-2">
            <div>
              <p className="text-[10px] uppercase font-black text-white/75 tracking-widest leading-tight">Amount to Settle</p>
              <h2 className="text-3xl font-black tracking-tight mt-1 text-white">₱{total.toLocaleString()}</h2>
            </div>
            <div className="text-right text-[10px] text-white/70 font-semibold uppercase tracking-widest">
              PHP Currency
            </div>
          </div>
        </div>

        {/* Content Flow */}
        <div className="p-6 flex-grow flex flex-col justify-between min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-phone"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Enter GCash Mobile Number
                  </label>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    Link your mobile payment ledger to authorize instant checkout directly from your GCash wallet balance.
                  </p>
                  
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 font-bold text-sm select-none">+63</span>
                    <input
                      type="text"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, '').substring(0, 11))}
                      placeholder="9XX XXX XXXX"
                      className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl outline-none text-slate-800 font-bold text-base tracking-wide"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-xs text-blue-800 leading-relaxed">
                  <Smartphone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold uppercase tracking-wide">Developer Sandbox Mode</strong>
                    <p className="text-slate-600 mt-0.5 mt-1">
                      No real GCash load or balance will be deducted. Add <strong>PAYMONGO_SECRET_KEY</strong> to process real transactions on cellular networks.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={inputPhone.length < 9 || loading}
                  className="w-full py-4 bg-[#0051cc] hover:bg-[#0041b3] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Next Step <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Enter authentication code
                  </label>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    A mock 6-digit verification code was deployed to <strong>+63 {inputPhone}</strong>. Enter it below to match credentials:
                  </p>

                  <input
                    type="text"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit Code"
                    className="w-full py-4 text-center bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl outline-none text-slate-800 font-extrabold text-2xl tracking-[0.3em]"
                  />
                  
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2.5">
                    <span>Didn't receive code?</span>
                    {otpTimer > 0 ? (
                      <span className="text-blue-600">Resend in {otpTimer}s</span>
                    ) : (
                      <button 
                        onClick={() => { setOtpTimer(60); }} 
                        className="text-blue-600 hover:underline"
                        type="button"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={otp.length !== 6 || loading}
                  className="w-full py-4 bg-[#0051cc] hover:bg-[#0041b3] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify OTP <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-mpin"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Enter 4-Digit MPIN
                  </label>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    Secure your wallet transaction by keying in your 4-digit personal authentication PIN.
                  </p>

                  <div className="relative">
                    <input
                      type="password"
                      value={mpin}
                      maxLength={4}
                      onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full py-4 text-center bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl outline-none text-slate-800 font-extrabold text-3xl tracking-[0.6em]"
                    />
                    <Lock className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl">
                  <span>Current Wallet Available Balance:</span>
                  <span className="text-slate-800">₱45,980.50</span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmPay}
                  disabled={mpin.length !== 4 || loading}
                  className="w-full py-4 bg-[#0051cc] hover:bg-[#0041b3] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirm & Pay (₱{total.toLocaleString()})
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-6 px-2 space-y-5"
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-emerald-500/15 border-4 border-white animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full inline-block">
                    Payment Verified
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 font-serif italic">Mabuhay! Receipt Cleared</h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed max-w-[240px] mx-auto">
                    Your GCash transaction was processed successfully. We are returning you back to FarmToHome workspace...
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] font-mono text-slate-400 w-full text-center">
                  Ref Code: GC-SBOX-{Math.random().toString(36).substring(3, 9).toUpperCase()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
