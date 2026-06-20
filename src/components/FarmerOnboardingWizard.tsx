import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, MapPin, Camera, Check, Upload, ArrowRight, ArrowLeft, Award, FileText, CheckCircle2, ShieldAlert, Navigation, Sparkles } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Tiyaking nakaturo ito sa firebase helper file ng app mo

interface FarmerOnboardingWizardProps {
  initialEmail: string;
  initialName: string;
  onSubmit: (data: {
    farmName: string;
    phone: string;
    address: string;
    govIdUrl: string;
    rsbsaNumber: string;
    alternativeCertUrl: string;
    primaryCrops: string;
    declaredCapacity: string;
    coordinates: { lat: number; lng: number };
  }) => Promise<void>;
  onLogout: () => void;
}

export const FarmerOnboardingWizard: React.FC<FarmerOnboardingWizardProps> = ({
  initialEmail,
  initialName,
  onSubmit,
  onLogout,
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fields State
  const [farmName, setFarmName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [govIdUrl, setGovIdUrl] = useState('');
  const [rsbsaNumber, setRsbsaNumber] = useState('');
  const [alternativeCertUrl, setAlternativeCertUrl] = useState('');
  const [primaryCrops, setPrimaryCrops] = useState('');
  const [declaredCapacity, setDeclaredCapacity] = useState('100-500'); // Default range in kg
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);
  
  // Validation Tracking
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Firebase OTP specific states
  const [showOtpGate, setShowOtpGate] = useState<boolean>(true); // Naka-true para ma-verify muna ang phone bago mag-wizard
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState<string>('');
  const [isOtpSending, setIsOtpSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Mock Preset Options for Quick Evaluation
  const handleLoadSampleId = () => {
    setGovIdUrl('https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600');
    setErrors(prev => ({ ...prev, govIdUrl: '' }));
  };

  const handleLoadSampleCertificate = () => {
    setAlternativeCertUrl('https://images.unsplash.com/photo-1589330694653-ded6df53f6ee?auto=format&fit=crop&q=80&w=600');
    setErrors(prev => ({ ...prev, alternativeCertUrl: '' }));
  };

  // Base64 file loaders
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'govId' | 'cert') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'govId') {
          setGovIdUrl(reader.result as string);
          setErrors(prev => ({ ...prev, govIdUrl: '' }));
        } else {
          setAlternativeCertUrl(reader.result as string);
          setErrors(prev => ({ ...prev, alternativeCertUrl: '' }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Format check para sa mobile network codes (+63 local prefix adjustment)
  const formatE164 = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    return cleaned.startsWith('0') ? `+63${cleaned.substring(1)}` : `+63${cleaned}`;
  };

  // 1. Pagpapadala ng SMS Code
  const handleSendSmsOtp = async () => {
    setOtpError('');
    setIsOtpSending(true);
    
    const targetDiv = document.getElementById('recaptcha-verifier-box');
    if (!targetDiv) {
      setOtpError('System error: Verification layout is fully blocked.');
      setIsOtpSending(false);
      return;
    }

    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-verifier-box', {
          size: 'invisible'
        });
      }

      const formattedPhone = formatE164(phone);
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
      
      confirmationResultRef.current = confirmationResult;
      alert('Matagumpay na naipadala ang 6-digit OTP sa iyong telepono!');
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'Nabigong magpadala ng SMS. Pakisuri ang iyong numero.');
    } finally {
      setIsOtpSending(false);
    }
  };

  // 2. Pag-verify sa pinasok na OTP code mula sa layout box
  const handleConfirmOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setLoading(true);

    const typedCode = otpDigits.join('');
    if (typedCode.length !== 6) {
      setOtpError('Mangyaring kumpletuhin ang anim (6) na digit ng OTP.');
      setLoading(false);
      return;
    }

    try {
      const sessionResult = confirmationResultRef.current;
      if (!sessionResult) throw new Error('Expired na ang verification session. Magpadala ng bagong code.');

      await sessionResult.confirm(typedCode);
      setShowOtpGate(false); // Success! Proceed to Wizard.
    } catch (err: any) {
      setOtpError('Maling OTP code o expire na ito. Subukan muli.');
    } finally {
      setLoading(false);
    }
  };

  // GPS Coordinates Lock
  const handleGetCoordinates = () => {
    setIsLocating(true);
    setLocatingError(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
          setErrors(prev => ({ ...prev, coordinates: '' }));
        },
        (error) => {
          console.warn("Geolocation permission error, falling back to simulated high-accuracy pin:", error);
          setCoordinates({ lat: 16.4632, lng: 120.5901 }); // Benguet center
          setIsLocating(false);
          setErrors(prev => ({ ...prev, coordinates: '' }));
        },
        { timeout: 8000 }
      );
    } else {
      setCoordinates({ lat: 16.4632, lng: 120.5901 });
      setIsLocating(false);
      setErrors(prev => ({ ...prev, coordinates: '' }));
    }
  };

  const handleSetSimulatedCoords = (preset: 'LaTrinidad' | 'Buguias' | 'Atok') => {
    const coordsPreset = {
      LaTrinidad: { lat: 16.4550, lng: 120.5898 },
      Buguias: { lat: 16.7198, lng: 120.8294 },
      Atok: { lat: 16.5786, lng: 120.6974 }
    };
    setCoordinates(coordsPreset[preset]);
    setErrors(prev => ({ ...prev, coordinates: '' }));
  };

  // Step Navigations & Valids
  const validateStep = () => {
    const stepErrors: { [key: string]: string } = {};

    if (step === 1) {
      if (!govIdUrl) {
        stepErrors.govIdUrl = 'Kinakailangan mag-upload ng valid Government ID card. (Government ID photo is required.)';
      }
      if (!rsbsaNumber && !alternativeCertUrl) {
        stepErrors.rsbsa = 'Ipasok ang RSBSA number o mag-upload ng Barangay/MAO Certificate. (Provide RSBSA number or alternative certificate.)';
      }
      if (rsbsaNumber && !/^\d{2}-\d{4}-\d{5}$/.test(rsbsaNumber.trim()) && rsbsaNumber.trim().length > 0) {
        stepErrors.rsbsaFormat = 'Format ay dapat: XX-XXXX-XXXXX (e.g. 14-3507-12403)';
      }
    }

    if (step === 2) {
      if (!farmName.trim()) {
        stepErrors.farmName = 'Ipasok ang pangalan ng iyong Bukid / Agro-Farm name.';
      }
      if (!phone.trim()) {
        stepErrors.phone = 'Kinakailangan ang numero ng telepono. (Contact phone number is required.)';
      }
      if (!address.trim()) {
        stepErrors.address = 'Ipasok ang pisikal na address ng iyong bukid.';
      }
      if (!coordinates) {
        stepErrors.coordinates = 'Pindutin ang pindutan upang ikonekta ang GPS ng Bukid.';
      }
    }

    if (step === 3) {
      if (!primaryCrops.trim()) {
        stepErrors.primaryCrops = 'Mangyaring ilagay ang mga pangunahing gulay at produkto na iyong pinatutubo.';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        farmName,
        phone,
        address,
        govIdUrl,
        rsbsaNumber: rsbsaNumber || 'N/A (Barangay Certified)',
        alternativeCertUrl,
        primaryCrops,
        declaredCapacity: `${declaredCapacity} kg bawat buwan (monthly)`,
        coordinates: coordinates || { lat: 16.4550, lng: 120.5898 }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- TONTONAN NG CONDITIONAL RENDERING MARKS ---
  if (showOtpGate) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-100 rounded-3xl shadow-xl text-center">
        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
          Security Verification Gate
        </span>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-3">I-verify ang iyong Mobile Number</h2>
        <p className="text-slate-400 text-xs mt-1 px-4">
          Bago magpatuloy sa pag-upload ng mga dokumento, kinakailangan ang mabilis na verification upang maprotektahan ang iyong account.
        </p>

        <div className="mt-6 text-left">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Mobile Phone Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 09171234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-grow px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
            <button
              type="button"
              onClick={handleSendSmsOtp}
              disabled={isOtpSending || !phone}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {isOtpSending ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        </div>

        <form onSubmit={handleConfirmOtpCode} className="mt-6 space-y-4">
          <label className="block text-[10px] font-black uppercase text-slate-500 text-left mb-1">Ipasok ang 6-Digit OTP</label>
          <div className="flex justify-between gap-1.5">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                id={`otp-box-${idx}`}
                onChange={(e) => {
                  const val = e.target.value;
                  const newDigits = [...otpDigits];
                  newDigits[idx] = val;
                  setOtpDigits(newDigits);
                  if (val && idx < 5) {
                    document.getElementById(`otp-box-${idx + 1}`)?.focus();
                  }
                }}
                className="w-12 h-12 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-xl text-center font-bold text-sm focus:outline-none focus:bg-white text-slate-800"
              />
            ))}
          </div>

          {otpError && <p className="text-red-500 text-[10.5px] font-bold text-left">{otpError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            {loading ? 'Verifying Session...' : 'Kumpirmahin at Magpatuloy'}
          </button>
        </form>

        <div id="recaptcha-verifier-box" className="hidden"></div>
      </div>
    );
  }

  // ORIHINAL NA WIZARD CARD LAYOUT (Lalabas kapag showOtpGate === false)
  return (
    <div className="max-w-3xl mx-auto my-6 p-4 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50">
      {/* Upper Progress Stepper */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
              Farmer Partner Onboarding
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-sans mt-2">
              Pakikipagtulungan <span className="italic text-emerald-600 font-serif">bilang Magsasaka</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Kumpletuhin natin ang pag-verify ng iyong account para makapagsimula nang magbenta ng sariwang ani.
            </p>
          </div>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all border border-slate-200"
          >
            I-logout
          </button>
        </div>

        {/* Technical Stepper Line */}
        <div className="relative flex items-center justify-between w-full mt-4">
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -translate-y-1/2 z-0" />
          <div className="absolute left-0 top-1/2 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-300" 
               style={{ width: `${((step - 1) / 2) * 100}%` }} />
          
          {[1, 2, 3].map((s) => (
            <div key={s} className="z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                s < step ? 'bg-emerald-500 text-white' :
                s === step ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-55' :
                'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {s < step ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-[9px] font-black uppercase mt-2 tracking-wide ${s === step ? 'text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Identidad' : s === 2 ? 'Lokasyon' : 'Deklarasyon'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Fields Wizard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[300px]"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                  <Award className="w-5 h-5 text-emerald-600" />
                  Hakbang 1: Pagpapatunay ng Legal na Pagkakakilanlan
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-normal">
                  Kailangan nating patunayan ang iyong legal na katayuan bilang tunay at aktibong magsasaka ayon sa Kagawaran ng Pagsasaka (DA).
                </p>
              </div>

              {/* Gov ID Portion */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    A. Valid Government-Issued ID *
                  </label>
                  <button 
                    type="button"
                    onClick={handleLoadSampleId}
                    className="text-[9px] text-emerald-600 hover:text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-sm"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> Gamitin ang Sample ID ng Magsasaka
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mb-3 leading-normal">
                  Kumuha o mag-upload ng larawan ng iyong valid ID.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};