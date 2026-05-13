import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Shield, Calendar, MapPin, Award, X, Save, Loader2, Image as ImageIcon, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [editForm, setEditForm] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    farmName: profile?.farmName || '',
    farmAddress: profile?.farmAddress || '',
    farmStory: profile?.farmStory || '',
    farmingMethods: profile?.farmingMethods || '',
    certifications: profile?.certifications?.join(', ') || '',
    photoURL: profile?.photoURL || '',
  });

  if (!profile) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updateData: any = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        address: editForm.address,
        photoURL: editForm.photoURL,
      };
      
      if (profile.role === 'farmer') {
        updateData.farmName = editForm.farmName;
        updateData.farmAddress = editForm.farmAddress;
        updateData.farmStory = editForm.farmStory;
        updateData.farmingMethods = editForm.farmingMethods;
        updateData.certifications = editForm.certifications.split(',').map(s => s.trim()).filter(s => s !== '');
      }

      await updateDoc(userRef, updateData);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
      } catch (logErr: any) {
        // Silent log
      }
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      fullName: profile.fullName,
      phone: profile.phone || '',
      address: profile.address || '',
      farmName: profile.farmName || '',
      farmAddress: profile.farmAddress || '',
      farmStory: profile.farmStory || '',
      farmingMethods: profile.farmingMethods || '',
      certifications: profile.certifications ? profile.certifications.join(', ') : '',
      photoURL: profile.photoURL || '',
    });
    setIsEditing(true);
  };

  return (
    <div className="max-w-5xl mx-auto py-16 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border-4 border-white forest-shadow"
      >
        {/* Banner */}
        <div className="h-64 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover grayscale" />
          </div>
          <div className="absolute -bottom-20 left-16 p-2 bg-white rounded-[2.5rem] shadow-2xl border-4 border-accent-light">
            <div className="w-40 h-40 rounded-[2rem] bg-accent-light flex items-center justify-center overflow-hidden border border-primary/5">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="Profile Picture" className="w-full h-full object-contain bg-slate-50" />
              ) : (
                <User className="w-20 h-20 text-primary opacity-20" />
              )}
            </div>
          </div>
        </div>

        <div className="pt-28 px-16 pb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-2 h-10 bg-secondary rounded-full" />
                <h1 className="text-5xl font-bold text-slate-800 tracking-tighter font-serif italic">{profile.fullName}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <span className="px-5 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.4em] rounded-full shadow-lg shadow-primary/20">
                  {profile.role === 'buyer' ? 'Local Buyer' : 'Local Farmer'}
                </span>
                <span className="flex items-center gap-2.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <MapPin className="w-4 h-4 text-primary" />
                  {profile.role === 'farmer' ? (profile.farmAddress || 'Farm Address Not Set') : (profile.address || 'Address Not Set')}
                </span>
              </div>
            </div>
            <button 
              onClick={openEdit}
              className="group flex items-center gap-4 px-10 py-5 bg-accent-light text-primary rounded-full font-bold border-2 border-primary/5 hover:border-primary/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest shadow-inner"
            >
              <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-16">
              {profile.role === 'farmer' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-accent-light rounded-2xl">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.4em]">Farm Details</h3>
                  </div>
                  <div className="bg-background p-12 rounded-[3.5rem] border-2 border-border space-y-10 text-slate-600 leading-relaxed shadow-inner">
                    <div className="relative pl-10 border-l-4 border-primary/20">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] mb-4 leading-none italic">Our Story</p>
                      <p className="text-xl font-serif italic text-slate-700 leading-relaxed opacity-80">"{profile.farmStory || 'No story shared yet.'}"</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-3 leading-none underline decoration-primary/20 underline-offset-8">Growing Methods</p>
                        <p className="text-base font-bold text-slate-800 font-serif italic">{profile.farmingMethods || 'Standard farming practices'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-5 leading-none underline decoration-primary/20 underline-offset-8">Certifications</p>
                        <div className="flex flex-wrap gap-3">
                          {profile.certifications && profile.certifications.length > 0 ? (
                            profile.certifications.map(cert => (
                              <span key={cert} className="px-4 py-2 bg-white border-2 border-primary/5 rounded-2xl text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                <Shield className="w-3 h-3 text-secondary" />
                                {cert}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm font-bold text-slate-300 italic">No certifications listed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-accent-light rounded-2xl">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.4em]">Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="flex items-center gap-6 p-8 bg-white rounded-[2.5rem] border-2 border-border shadow-xl clay-shadow hover:scale-[1.02] transition-transform">
                    <div className="w-14 h-14 rounded-2xl bg-accent-light flex items-center justify-center text-primary shadow-inner border border-primary/5">
                      <Mail className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Email</p>
                      <p className="text-sm font-bold text-slate-800 truncate w-40 font-serif">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-8 bg-white rounded-[2.5rem] border-2 border-border shadow-xl clay-shadow hover:scale-[1.02] transition-transform">
                    <div className="w-14 h-14 rounded-2xl bg-accent-light flex items-center justify-center text-primary shadow-inner border border-primary/5">
                      <Phone className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Phone Number</p>
                      <p className="text-sm font-bold text-slate-800 font-serif">{profile.phone || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div className="p-10 bg-primary rounded-[4rem] text-white relative overflow-hidden shadow-2xl forest-shadow group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
                <div className="flex items-center gap-5 mb-12 relative z-10">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center text-accent-light shadow-inner">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-serif italic text-accent-light">{profile.role === 'farmer' ? 'Farmer Profile' : 'Buyer Profile'}</p>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.4em]">Level 04</p>
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-accent-light uppercase tracking-widest mb-3 opacity-60">
                      <span>{profile.role === 'farmer' ? 'TOTAL YIELD' : 'TOTAL PURCHASES'}</span>
                      <span className="text-white">65% Progress</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        className="h-full bg-accent-light shadow-[0_0_15px_rgba(207,242,158,0.5)]" 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-accent-light uppercase tracking-widest mb-3 opacity-60">
                      <span>{profile.role === 'farmer' ? 'ECO IMPACT' : 'SAVINGS'}</span>
                      <span className="text-white">40% Rank</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '40%' }}
                        className="h-full bg-secondary shadow-[0_0_15px_rgba(235,110,87,0.5)]" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 pt-12 border-t border-white/5 opacity-40">
                  <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-center">Active Member since 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-emerald-50 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="p-8 sm:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Edit Profile</h2>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 text-slate-400 rounded-full transition-all border border-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <X className="w-4 h-4" /> {error}
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                  {/* Photo Upload Section */}
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                        {editForm.photoURL ? (
                          <img src={editForm.photoURL} alt="Preview" className="w-full h-full object-contain bg-slate-50" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User className="w-10 h-10" />
                          </div>
                        )}
                        <input 
                          type="file" accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setEditForm(prev => ({ ...prev, photoURL: reader.result as string }));
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                      </div>
                      <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg ring-4 ring-white">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change Photo</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Full Name</label>
                      <input 
                        type="text" value={editForm.fullName} 
                        onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all" 
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Phone Number</label>
                      <input 
                        type="tel" value={editForm.phone} 
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all" 
                      />
                    </div>

                    {profile.role !== 'farmer' && (
                      <div className="group sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Delivery Address</label>
                        <input 
                          type="text" value={editForm.address} 
                          onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all" 
                        />
                      </div>
                    )}

                    {profile.role === 'farmer' && (
                      <>
                        <div className="group sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Farm Name</label>
                          <input 
                            type="text" value={editForm.farmName} 
                            onChange={e => setEditForm({ ...editForm, farmName: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all" 
                          />
                        </div>
                        <div className="group sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Farm Address</label>
                          <input 
                            type="text" value={editForm.farmAddress} 
                            onChange={e => setEditForm({ ...editForm, farmAddress: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all" 
                          />
                        </div>
                        <div className="group sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Farm Story</label>
                          <textarea 
                            value={editForm.farmStory} 
                            onChange={e => setEditForm({ ...editForm, farmStory: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all h-24 resize-none"
                            placeholder="Tell us about your farm's history and mission..."
                          />
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Farming Methods</label>
                          <input 
                            type="text" value={editForm.farmingMethods} 
                            onChange={e => setEditForm({ ...editForm, farmingMethods: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all"
                            placeholder="e.g. Organic, Hydroponic" 
                          />
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Certifications</label>
                          <input 
                            type="text" value={editForm.certifications} 
                            onChange={e => setEditForm({ ...editForm, certifications: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all"
                            placeholder="e.g. GAP Certified" 
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button 
                      type="button" onClick={() => setIsEditing(false)}
                      className="flex-1 py-4 px-6 bg-slate-50 text-slate-600 rounded-[1.25rem] font-bold hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" disabled={loading}
                      className="flex-1 py-4 px-6 bg-primary text-white rounded-[1.25rem] font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
