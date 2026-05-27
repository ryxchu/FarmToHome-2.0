import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, HelpCircle, LogOut, Check, X, AlertCircle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'logout';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        ...options,
        resolve,
      });
      setIsOpen(true);
    });
  };

  const handleCancel = () => {
    if (config) {
      config.resolve(false);
    }
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (config) {
      config.resolve(true);
    }
    setIsOpen(false);
  };

  const getContentIcon = () => {
    switch (config?.type) {
      case 'danger':
        return <AlertTriangle className="w-8 h-8 text-rose-500" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-amber-500" />;
      case 'logout':
        return <LogOut className="w-8 h-8 text-emerald-600" />;
      default:
        return <HelpCircle className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && config && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] border border-stone-200 p-8 shadow-2xl z-10 overflow-hidden"
              id="confirm-modal-box"
            >
              {/* Decorative subtle pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -z-10" />

              <div className="flex flex-col items-center text-center">
                {/* Icon Circle */}
                <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100/80 flex items-center justify-center mb-6 shadow-sm">
                  {getContentIcon()}
                </div>

                {/* Typography */}
                <h3 className="text-xl font-black text-slate-850 font-serif italic tracking-tight mb-3">
                  {config.title}
                </h3>
                <p className="text-xs text-slate-450 font-semibold leading-relaxed mb-8">
                  {config.message}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-4 bg-white hover:bg-stone-50 border-2 border-stone-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-sm active:scale-95 select-none"
                    id="confirm-cancel-btn"
                  >
                    {config.cancelText || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`flex-1 py-4 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 select-none ${
                      config.type === 'danger'
                        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                        : config.type === 'logout'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/15'
                        : 'bg-primary hover:bg-primary-dark shadow-primary/15'
                    }`}
                    id="confirm-action-btn"
                  >
                    {config.confirmText || 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
