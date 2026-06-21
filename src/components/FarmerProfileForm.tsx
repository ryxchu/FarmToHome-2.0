import React, { useState, useRef } from 'react';
import { Camera, Check, Sparkles, User, AlertCircle, RefreshCw } from 'lucide-react';
import { compressImage } from '../lib/utils';

export interface FarmerProfileFormData {
  photoURL: string;
  farmStory: string;
  farmName?: string;
  phone?: string;
  address?: string;
  primaryCrops?: string;
}

interface FarmerProfileFormProps {
  initialData?: Partial<FarmerProfileFormData>;
  onSave?: (data: FarmerProfileFormData) => Promise<void> | void;
  onCancel?: () => void;
  isSaving?: boolean;
}

// Warm, authentic local Filipino farmer avatars for the placeholder selection
const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200", // Warm Portrait
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200", // Friendly Smile
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200", // Warm female lead
  "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200&h=200"  // Casual professional
];

export const FarmerProfileForm: React.FC<FarmerProfileFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const [photoURL, setPhotoURL] = useState<string>(initialData?.photoURL || '');
  const [farmStory, setFarmStory] = useState<string>(initialData?.farmStory || '');
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            // Compress image to 400x400 for farmer avatar/profile photo
            const compressed = await compressImage(reader.result, 400, 400, 0.7);
            setPhotoURL(compressed);
          } catch (err) {
            setPhotoURL(reader.result);
          }
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read the file. Please try another image.");
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPreset = (url: string) => {
    setPhotoURL(url);
    setShowPresets(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      try {
        setErrorMessage(null);
        await onSave({
          photoURL,
          farmStory,
        });
      } catch (err: any) {
        setErrorMessage(err?.message || "An unexpected error occurred while saving profile.");
      }
    }
  };

  return (
    <div 
      id="farmer-profile-form-container"
      className="max-h-[85vh] flex flex-col justify-between p-4 bg-white rounded-2xl space-y-4 overflow-y-auto"
    >
      {/* Scrollable Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 space-y-5">
        
        {/* Title & Introduction */}
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5 leading-none">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Farmer Credentials
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Enhance credibility by sharing your true farming story
          </p>
        </div>

        {/* Profile Picture Section */}
        <div className="space-y-2.5">
          <label className="block text-center text-[10px] font-extrabold uppercase text-slate-500 tracking-widest">
            Profile Avatar Sourcing
          </label>
          
          <div className="relative">
            <div 
              id="avatar-upload-box"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-slate-100 border-2 border-emerald-500 relative flex items-center justify-center overflow-hidden mx-auto group cursor-pointer transition-all hover:ring-4 hover:ring-emerald-500/10 active:scale-95 shadow-md"
            >
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt="Farmer Profile" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-slate-400 group-hover:text-emerald-600 transition-colors flex flex-col items-center">
                  <User className="w-8 h-8 stroke-[1.5]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Upload</span>
                </div>
              )}
              
              {/* Trigger Input */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {/* Icon Overlay Badge */}
              <div className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full shadow hover:bg-emerald-700 transition-colors">
                <Camera className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            </div>
          </div>

          {/* Quick Hot-swappable Preset Selection */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 hover:text-emerald-800 tracking-widest bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer border border-emerald-100"
            >
              <RefreshCw className="w-3 h-3" />
              {showPresets ? "Hide Presets" : "Use Preset Avatar"}
            </button>

            {showPresets && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex justify-center gap-3 animate-fadeIn">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPreset(url)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-90 ${photoURL === url ? 'border-primary shadow' : 'border-white hover:border-slate-300'}`}
                  >
                    <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Farmer Story / Testimonial Box */}
        <div className="space-y-1.5 text-left">
          <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-widest">
            Farmer's Story / Testimonial
          </label>
          <textarea
            required
            rows={3}
            value={farmStory}
            onChange={(e) => setFarmStory(e.target.value)}
            placeholder="Share your farm's background, practices, or experiences to inspire local buyers..."
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:border-slate-300 transition-all text-slate-800 leading-relaxed resize-none"
          />
          <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-extrabold uppercase tracking-wider">
            <span>Tell your authentic story</span>
            <span>{farmStory.length} characters</span>
          </div>
        </div>

        {/* Error Messages */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-850 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-800">Saving Aborted</p>
              <p className="text-[9px] text-rose-600 font-medium leading-normal mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </form>

      {/* Button Save Row */}
      <div className="pt-2 flex flex-col gap-2 shrink-0">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-emerald-550/10 group"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Updating Profile...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span>Save Credentials</span>
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all hover:text-slate-700 active:scale-95"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
