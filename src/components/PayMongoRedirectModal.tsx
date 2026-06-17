import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ExternalLink, Lock, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface PayMongoRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  total: number;
  onRedirect: () => void;
}

export const PayMongoRedirectModal: React.FC<PayMongoRedirectModalProps> = ({
  isOpen,
  onClose,
  checkoutUrl,
  total,
  onRedirect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col font-sans"
      >
        {/* Secure Head Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/80"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1.5 mb-2">
            <span className="bg-white/15 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
              Official Gateway
            </span>
            <span className="text-white/80 text-xs font-semibold uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> PayMongo Secure
            </span>
          </div>

          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-none">Order Invoice Total</p>
          <h2 className="text-3xl font-black mt-1 text-white">₱{total.toLocaleString()}</h2>
        </div>

        {/* Informational core body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
              Launch Secure Window to Pay
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              To guarantee your digital transaction safety, payment gateways do not run inside sandboxed frames. Tap below to settle this harvest payment securely:
            </p>
          </div>

          {/* Secure details badges */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 text-[11px] text-slate-600 font-semibold tracking-wide">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>GCash, Maya, & Visa/Mastercard certified protection</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>256-bit Secure Sockets Layer (SSL) processing</span>
            </div>
          </div>

          {/* Core Call to Action */}
          <div className="space-y-3 pt-1">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onRedirect();
                onClose();
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-all cursor-pointer hover:translate-y-[-1px] active:translate-y-0"
            >
              Open Secure Portal <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              type="button"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-[0.05em] transition-all"
            >
              Cancel Payment Settle
            </button>
          </div>
        </div>

        {/* Footer info branding */}
        <div className="bg-slate-50/50 border-t border-slate-100 py-3.5 px-6 text-center text-[10px] text-slate-400 font-mono tracking-wide flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-slate-300" /> Authorized payment provider for FarmToHome Ph
        </div>
      </motion.div>
    </div>
  );
};
