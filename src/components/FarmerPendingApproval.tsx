import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, CheckCircle, MapPin, Sprout, FileCheck, ShieldAlert, Award, FileSearch } from 'lucide-react';
import { UserProfile } from '../types';

interface FarmerPendingApprovalProps {
  profile: UserProfile | null;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

export const FarmerPendingApproval: React.FC<FarmerPendingApprovalProps> = ({
  profile,
  onRefresh,
  onLogout,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.warn("Failed to refresh profile status:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8 p-4 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50">
      
      {/* Pending Banner Section */}
      <div className="text-center py-6 sm:py-8 border-b border-slate-100">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-500 mb-4 shadow-inner ring-4 ring-amber-55 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        
        <span className="px-3 py-1 bg-amber-15 px-2.5 py-0.5 rounded-full text-amber-600 border border-amber-100 text-[10px] font-black uppercase tracking-wider">
          Aparato ng Pagsusuri (Under Review State)
        </span>
        
        <h1 className="text-2xl sm:text-3.5xl font-extrabold text-slate-800 tracking-tight mt-3">
          Ating sinusuri ang <span className="italic text-amber-550 font-serif">iyong aplikasyon...</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-500 text-xs sm:text-sm mt-3 leading-relaxed">
          <strong>"Balikan namin kayo sa loob ng 24–48 oras!"</strong> Ang aming mga administrador ay kasalukuyang nakikipag-ugnayan sa Department of Agriculture (DA) upang patunayan ang iyong RSBSA at Government ID.
        </p>
      </div>

      {/* Restrictions Disclaimer Notice */}
      <div className="my-6 p-4 bg-amber-50/35 rounded-2xl border border-amber-200/50 flex gap-3.5 text-slate-700 text-[11px] leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-slate-800">Pansamatalang mga Limitasyon (Active Restrictions):</span>
          <p className="mt-1">
            Habang nasa "Pending Approval" ang iyong account, <span className="text-amber-700 font-extrabold">hindi ka pa maaaring mag-post ng paninda o mga gulay sa merkado</span>, at hindi ka rin makakatanggap ng mga order mula sa mga mamimili. Ito ay ginagawa natin upang matiyak ang kaligtasan ng ating digital farm system.
          </p>
        </div>
      </div>

      {/* Review Submission Core Summary Container */}
      <div className="bg-slate-50/70 p-4 sm:p-6 rounded-2xl border border-slate-100 space-y-5">
        <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
          <FileSearch className="w-4.5 h-4.5 text-slate-600" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
            Buod ng Ipinasa mong Dokumento (Your Request Profile Bundle)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Identity Info */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-205/60 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-slate-500">A. Legal & RSBSA Checking</span>
            </div>
            
            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
              <p>👤 <span className="font-bold">Legal Name:</span> {profile?.fullName}</p>
              <p>🎯 <span className="font-bold">RSBSA ID:</span> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-black">{profile?.rsbsaNumber || 'Under Alternative check'}</span></p>
              <p>📧 <span className="font-bold">Email linked:</span> <span className="font-mono text-[10px]">{profile?.email}</span></p>
            </div>

            {profile?.govIdUrl && (
              <div className="border border-slate-150 rounded-lg overflow-hidden aspect-video bg-slate-50 max-h-24">
                <img src={profile.govIdUrl} alt="Government ID Submitted" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Farm Mapping & Coordinates */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-205/60 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-slate-500">B. Coordinates & Boundary</span>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <p>🏡 <span className="font-bold">Farm Name:</span> {profile?.farmName || "Unspecified"}</p>
              <p>📍 <span className="font-bold">GPS Coordinates:</span></p>
              <p className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10.5px] font-bold text-slate-800 flex items-center justify-between">
                <span>Lat: {profile?.coordinates?.lat.toFixed(5) || "0.0"}, Lng: {profile?.coordinates?.lng.toFixed(5) || "0.0"}</span>
                <span className="text-[8px] px-1 bg-emerald-50 text-emerald-600 rounded">GPS LOCKED</span>
              </p>
              <p className="line-clamp-1">🚗 <span className="font-bold">Address:</span> {profile?.address || "No address declared"}</p>
            </div>

            {profile?.alternativeCertUrl && (
              <div className="border border-slate-150 rounded-lg overflow-hidden aspect-video bg-slate-50 max-h-24">
                <img src={profile.alternativeCertUrl} alt="Alternative Cert Submitted" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Plant Capacity */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-205/60 space-y-2.5 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-slate-500">C. Plant Yields & Capacity</span>
            </div>

            <div className="text-[11px] text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              <div>
                <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-widest leading-none mb-1">Declared Crop Varieties</p>
                <p className="font-bold text-slate-800">{profile?.primaryCrops || "Wala pa / Not provided"}</p>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-2 sm:pt-0 sm:pl-4">
                <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-widest leading-none mb-1">Declared Monthly Capacity</p>
                <p className="font-sans font-bold text-emerald-600">{profile?.declaredCapacity || "Wala pa / Not provided"}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Buttons Footer Actions block */}
      <div className="mt-8 pt-4 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full sm:w-auto px-5 py-2.5 bg-white text-rose-600 hover:bg-rose-50 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Lumabas muna (Logout Session)
        </button>

        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> 
          {isRefreshing ? 'Ina-update ang Estado...' : 'Suriin ang Aking Katayuan (Refresh Status)'}
        </button>
      </div>

    </div>
  );
};
