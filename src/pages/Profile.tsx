import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { PhotoEditorModal } from '../components/PhotoEditorModal';
import { User, Mail, Phone, Shield, Calendar, MapPin, Award, X, Save, Loader2, Image as ImageIcon, Star, LogOut, Package, Clock, Settings, Camera, RefreshCw, Sprout, ShoppingBag, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, setDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

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
  const { profile, logout, refreshProfile } = useAuth();
  const { confirm } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [showPresetsInForm, setShowPresetsInForm] = useState(false);

  const presetBuyerAvatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200&h=200"
  ];

  const presetFarmerAvatars = [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200&h=200"
  ];
  
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
    coordinates: profile?.coordinates || null,
  });

  useEffect(() => {
    const fetchOrders = async () => {
      if (!profile?.uid || profile?.role !== 'buyer') return;
      setOrdersLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('buyerId', '==', profile.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const fetchedOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Error fetching orders in profile", err);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [profile?.uid, profile?.role]);

  if (!profile) return null;

  const detectLocation = (field: 'address' | 'farmAddress' = 'address') => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Lookup street level details for optimal accuracy
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const displayAddress = data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setEditForm(prev => ({
              ...prev,
              [field]: displayAddress,
              coordinates: { lat, lng }
            }));
            setLoading(false);
          })
          .catch(() => {
            setEditForm(prev => ({
              ...prev,
              [field]: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              coordinates: { lat, lng }
            }));
            setLoading(false);
          });
      },
      (error) => {
        alert('Could not detect location. Please enable permissions.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleUpdatePhotoURL = async (newPhotoURL: string) => {
    if (!profile) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updateData = { photoURL: newPhotoURL };

      // Instant state and cache merge to avoid slow network feedback loops
      localStorage.removeItem(`user_profile_${profile.uid}`);
      const updatedProfile = { ...profile, ...updateData };
      localStorage.setItem(`user_profile_${profile.uid}`, JSON.stringify(updatedProfile));

      const isDemo = profile.uid.startsWith('demo_');
      if (isDemo) {
        const storedDemoSession = localStorage.getItem('demo_profile_session');
        if (storedDemoSession) {
          try {
            const parsed = JSON.parse(storedDemoSession);
            const merged = { ...parsed, ...updateData };
            localStorage.setItem('demo_profile_session', JSON.stringify(merged));
          } catch (e) {}
        }
      }

      if (!isDemo) {
        await updateDoc(userRef, updateData);
      } else {
        try {
          await setDoc(userRef, updateData, { merge: true });
        } catch (e) {
          console.warn("Firestore save skipped/failed for demo user:", e);
        }
      }

      await refreshProfile();
    } catch (err) {
      console.error("Failed to instantly save profile photo:", err);
    }
  };

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
        coordinates: editForm.coordinates,
      };
      
      if (profile.role === 'farmer') {
        updateData.farmName = editForm.farmName;
        updateData.farmAddress = editForm.farmAddress;
        updateData.farmStory = editForm.farmStory;
        updateData.farmingMethods = editForm.farmingMethods;
        updateData.certifications = editForm.certifications.split(',').map(s => s.trim()).filter(s => s !== '');
      }

      // Clear local storage cache to bypass any stale reads
      localStorage.removeItem(`user_profile_${profile.uid}`);
      
      const isDemo = profile.uid.startsWith('demo_');
      if (isDemo) {
        const storedDemoSession = localStorage.getItem('demo_profile_session');
        if (storedDemoSession) {
          try {
            const parsed = JSON.parse(storedDemoSession);
            const merged = { ...parsed, ...updateData };
            localStorage.setItem('demo_profile_session', JSON.stringify(merged));
          } catch (e) {}
        }
      }

      if (!isDemo) {
        await updateDoc(userRef, updateData);
      } else {
        try {
          await setDoc(userRef, updateData, { merge: true });
        } catch (e) {
          console.warn("Firestore save skipped/failed for demo user:", e);
        }
      }
      
      await refreshProfile();
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
      coordinates: profile.coordinates || null,
    });
    setIsEditing(true);
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 forest-shadow animate-fade-in"
      >
        {/* Banner */}
        <div className="h-28 sm:h-36 bg-[#0c4128] relative overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
              className="w-full h-full object-cover opacity-35 mix-blend-luminosity brightness-75 contrast-125" 
              alt="Vegetable pattern overlay"
            />
            {/* Soft dark-green gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c4128]/70 via-transparent to-[#0c4128]/10" />
          </div>
        </div>

        <div className="py-6 sm:py-10 px-6 sm:px-12 pb-6 sm:pb-10 animate-fade-in">
          {/* Main profile row aligned in the white container */}
          <div className="flex flex-col md:flex-row items-start gap-6 sm:gap-8 mb-8 pb-8 border-b border-stone-100 text-left w-full">
            {/* Contained circular avatar at the top left of the white panel */}
            <div className="p-1 bg-slate-55 rounded-full border border-stone-100 shadow-sm shrink-0 self-start">
              <div 
                onClick={() => document.getElementById('profile-avatar-direct-input')?.click()}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-accent-light flex items-center justify-center overflow-hidden border border-stone-100 cursor-pointer relative group"
                title="Click to change profile picture"
              >
                {profile.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt="Profile Picture" 
                    className="w-full h-full object-cover bg-slate-50 group-hover:scale-105 transition-transform duration-300" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-10 h-10 sm:w-16 sm:h-16 text-primary opacity-20 group-hover:scale-105 transition-transform" />
                )}
                
                {/* Visual Camera Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>

              {/* Hidden file input for direct upload */}
              <input 
                type="file"
                id="profile-avatar-direct-input"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setTempImageSrc(reader.result as string);
                      setPhotoEditorOpen(true);
                    };
                    reader.readAsDataURL(file);
                  }
                  e.target.value = '';
                }}
              />
            </div>

            {/* Profile key information and actions */}
            <div className="flex-1 flex flex-col md:flex-row justify-between items-start gap-4 sm:gap-6 w-full">
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-1.5 h-8 bg-emerald-950 rounded-full shrink-0" />
                  <h1 className="text-2xl sm:text-3.5xl md:text-4xl font-bold text-slate-800 tracking-tighter font-serif italic text-balance">{profile.fullName}</h1>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <span className="px-4 py-1.5 bg-primary text-white text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-[0.3em] rounded-full shadow-md shadow-primary/20 shrink-0">
                    {profile.role === 'buyer' ? 'Local Buyer' : 'Local Farmer'}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-widest text-left">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    {profile.role === 'farmer' ? (profile.farmAddress || 'Farm Address Not Set') : (profile.address || 'Address Not Set')}
                  </span>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2.5 w-full sm:w-auto shrink-0 mt-3 md:mt-0">
                <button 
                  onClick={openEdit}
                  className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-accent-light text-primary rounded-full font-bold border border-primary/10 hover:border-primary/25 transition-all active:scale-95 text-[9px] uppercase tracking-widest shadow-sm font-sans cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  Edit Profile
                </button>
                <button 
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Are you sure you want to logout???',
                      message: 'You are logging out from your Farm To Home session. You will need to use your OTP next time you register or log in.',
                      confirmText: 'Yes, Logout',
                      cancelText: 'Cancel',
                      type: 'logout'
                    });
                    if (!confirmed) return;
                    try {
                      // Synchronously purge active local demo sessions
                      localStorage.removeItem('demo_user_session');
                      localStorage.removeItem('demo_profile_session');
                      
                      // Await standard and demo logout processes completely
                      await logout();
                      
                      // Instantly redirect to the landing page to tear down and reset JS heap
                      window.location.href = '/';
                    } catch (e) {
                      console.error("Sign out handling error:", e);
                      // Clear state via state setter as safety fallback
                      logout();
                    }
                  }}
                  className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-full font-bold border border-rose-100 hover:border-rose-200 transition-all active:scale-95 text-[9px] uppercase tracking-widest shadow-sm font-sans cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {profile.role === 'farmer' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-1">
                    <div className="p-2 bg-accent-light rounded-lg">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Farm Details</h3>
                  </div>
                  <div className="bg-background p-4 sm:p-6 rounded-2xl border border-stone-150 space-y-4 text-slate-600 leading-relaxed shadow-sm">
                    <div className="relative pl-4 sm:pl-6 border-l-4 border-primary/20">
                      <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-2 leading-none italic">Our Story</p>
                      <p className="text-base sm:text-lg font-serif italic text-slate-700 leading-relaxed opacity-80">"{profile.farmStory || 'No story shared yet.'}"</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1 leading-none">Growing Methods</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 font-serif italic">{profile.farmingMethods || 'Standard farming practices'}</p>
                      </div>
                      <div>
                        <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.certifications && profile.certifications.length > 0 ? (
                            profile.certifications.map(cert => (
                              <span key={cert} className="px-3 py-1.5 bg-white border-2 border-primary/5 rounded-xl text-[8.5px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                <Shield className="w-3 h-3 text-secondary" />
                                {cert}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs sm:text-sm font-bold text-slate-300 italic">No certifications listed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {profile.role === 'buyer' && (
                <div className="space-y-4 sm:space-y-6 animate-fade-in">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-1">
                    <div className="p-2 bg-accent-light rounded-lg">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Sourced Purchase History</h3>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-150 shadow-inner space-y-4">
                    {ordersLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Loading purchase ledger...</span>
                      </div>
                    ) : orders.length > 0 ? (
                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 no-scrollbar-y">
                        {orders.map((order) => (
                          <div key={order.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-150 space-y-3 hover:border-primary/25 transition-all">
                            <div className="flex justify-between items-center pb-2 border-b border-stone-200/50">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-mono text-slate-500">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' :
                                order.status === 'shipping' ? 'bg-amber-50 text-amber-600 border border-amber-150' :
                                'bg-sky-50 text-sky-600 border border-sky-150'
                              }`}>
                                {order.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="text-slate-700 font-medium">{item.name} <strong className="text-primary font-bold">x{item.quantity}</strong></span>
                                  <span className="text-slate-400 font-mono">₱{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-stone-200/50 flex justify-between items-end">
                              <div>
                                <p className="text-[8px] font-extrabold uppercase text-slate-400 tracking-widest leading-none mb-0.5">Payment Method</p>
                                <p className="text-[10px] font-bold text-slate-600">{order.paymentMethod || 'Cash on Delivery'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-extrabold uppercase text-slate-400 tracking-widest leading-none mb-0.5">Total Paid</p>
                                <p className="text-sm font-black text-[#e65c00]">₱{order.total}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 space-y-3">
                        <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center mx-auto text-slate-300 border border-stone-200/50">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold font-serif italic text-slate-400">No sourced purchases yet</p>
                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Your ordered crops will be logged here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-1">
                  <div className="p-2 bg-accent-light rounded-lg">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-150 shadow-md hover:scale-[1.01] transition-transform">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent-light flex items-center justify-center text-primary shadow-inner border border-primary/5 shrink-0">
                      <Mail className="w-5.5 h-5.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-0.5">Email</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate font-serif">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-150 shadow-md hover:scale-[1.01] transition-transform">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent-light flex items-center justify-center text-primary shadow-inner border border-primary/5 shrink-0">
                      <Phone className="w-5.5 h-5.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-0.5">Phone Number</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 font-serif">{profile.phone || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-800 to-primary rounded-2xl text-white relative overflow-hidden shadow-xl forest-shadow group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 relative z-10">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center text-accent-light shadow-inner shrink-0">
                    <Award className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-bold font-serif italic text-accent-light">{profile.role === 'farmer' ? 'Farmer Profile' : 'Buyer Profile'}</p>
                    <p className="text-[8px] sm:text-[8.5px] text-white/40 font-bold uppercase tracking-[0.4em]">Level 04</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6 relative z-10">
                  <div>
                    <div className="flex justify-between text-[8px] sm:text-[9px] font-bold text-accent-light uppercase tracking-widest mb-1.5 opacity-60">
                      <span>{profile.role === 'farmer' ? 'TOTAL YIELD' : 'TOTAL PURCHASES'}</span>
                      <span className="text-white">65% Progress</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        className="h-full bg-accent-light shadow-[0_0_15px_rgba(207,242,158,0.5)]" 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[8px] sm:text-[9px] font-bold text-accent-light uppercase tracking-widest mb-1.5 opacity-60">
                      <span>{profile.role === 'farmer' ? 'ECO IMPACT' : 'SAVINGS'}</span>
                      <span className="text-white">40% Rank</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '40%' }}
                        className="h-full bg-secondary shadow-[0_0_15px_rgba(235,110,87,0.5)]" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 opacity-40">
                  <p className="text-[8px] sm:text-[8.5px] font-bold uppercase tracking-[0.5em] text-center">Active Member since 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[999] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <motion.div 
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 26, stiffness: 210 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-lg shadow-2xl flex flex-col overflow-hidden border border-slate-100 max-h-[90vh] md:max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-5 border-b border-stone-100 shrink-0">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5 leading-none shadow-none">
                    <Settings className="w-4 h-4 text-primary animate-spin-slow" /> Account Settings
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {profile.role === 'buyer' ? 'Update delivery & primary contact details' : 'Update farm & primary contact details'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-slate-50 active:scale-95 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form and Scroll Area */}
              <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 p-6 bg-slate-50/50 max-h-[60vh] md:max-h-[55vh]">
                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-2">
                      <X className="w-4 h-4" /> {error}
                    </div>
                  )}

                  {/* Identity Header Banner */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                      {profile.role === 'buyer' ? (
                        <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <Sprout className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                        {profile.role === 'buyer' ? 'Sourced Buyer Identity' : 'Operational Identity'}
                      </p>
                      <p className="text-[9px] text-emerald-600 font-medium leading-relaxed mt-0.5">
                        {profile.role === 'buyer' 
                          ? 'Let local farming families know where to deliver your harvest. Keep details up-to-date for seamless drop-offs.'
                          : 'Let local chefs know who is preparing their harvest. Keep your details current to build trust.'}
                      </p>
                    </div>
                  </div>

                  {/* Photo Upload Section with Presets */}
                  <div className="space-y-2 text-center">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest text-center">
                      Profile Avatar
                    </label>
                    <div className="relative">
                      <div 
                        onClick={() => document.getElementById('profile-settings-file-input')?.click()}
                        className="w-24 h-24 rounded-full bg-slate-100 border-2 border-emerald-500 relative flex items-center justify-center overflow-hidden mx-auto group cursor-pointer hover:ring-4 hover:ring-emerald-500/10 active:scale-95 transition-all shadow-md"
                      >
                        {editForm.photoURL ? (
                          <img 
                            src={editForm.photoURL} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-slate-400 group-hover:text-emerald-600 transition-colors flex flex-col items-center">
                            <User className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Upload</span>
                          </div>
                        )}
                        
                        <input 
                          type="file"
                          id="profile-settings-file-input"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setTempImageSrc(reader.result as string);
                                setPhotoEditorOpen(true);
                              };
                              reader.readAsDataURL(file);
                            }
                            e.target.value = '';
                          }}
                          accept="image/*"
                          className="hidden"
                        />

                        {/* Icon Overlay Badge representing camera action */}
                        <div className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full shadow hover:bg-emerald-700 transition-colors z-10">
                          <Camera className="w-3.5 h-3.5 stroke-[2]" />
                        </div>
                      </div>
                    </div>

                    {/* Preselected Filipino / Local Avatars */}
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setShowPresetsInForm(!showPresetsInForm)}
                        className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase text-emerald-700 hover:text-emerald-800 tracking-wider bg-emerald-50/50 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer border border-emerald-100/55 mx-auto"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        {showPresetsInForm ? "Hide Presets" : "Use Preset Avatar"}
                      </button>

                      {showPresetsInForm && (
                        <div className="mt-2.5 p-2 bg-white rounded-xl border border-dashed border-slate-200 flex justify-center gap-3">
                          {(profile.role === 'farmer' ? presetFarmerAvatars : presetBuyerAvatars).map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={async () => {
                                setEditForm(prev => ({ ...prev, photoURL: url }));
                                setShowPresetsInForm(false);
                                // Under settings modal, we only update form state, saving happens on forms handleSubmit
                              }}
                              className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-90 ${editForm.photoURL === url ? 'border-emerald-600 scale-105 shadow' : 'border-white hover:border-slate-300'}`}
                            >
                              <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full Name Field */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                      Full Name
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={editForm.fullName}
                        onChange={(e) => setEditForm(v => ({ ...v, fullName: e.target.value }))}
                        placeholder="e.g. Chef Andrea Delgado" 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Phone Number Field */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                      Mobile Contact Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input 
                        type="tel" 
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm(v => ({ ...v, phone: e.target.value }))}
                        placeholder="e.g. +63 917 123 4567" 
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Buyer Specific: Delivery Address */}
                  {profile.role !== 'farmer' && (
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                          Delivery Logistics Address
                        </label>
                        <button 
                          type="button" 
                          onClick={() => detectLocation('address')}
                          className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest hover:underline flex items-center gap-1"
                          disabled={loading}
                        >
                          <MapPin className="w-3 h-3 text-emerald-600 animate-pulse" />
                          {loading ? 'Detecting...' : 'Detect Location'}
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <textarea 
                          required
                          rows={3}
                          value={editForm.address}
                          onChange={(e) => setEditForm(v => ({ ...v, address: e.target.value }))}
                          placeholder="e.g. Suite 402, Green Bistro Building, Pasig City" 
                          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800 resize-none leading-relaxed"
                          disabled={loading}
                        />
                      </div>
                      {editForm.coordinates && (
                        <p className="mt-1 text-[8px] font-bold text-emerald-600 uppercase tracking-wider text-left leading-none">✨ Satellite navigation coordinates locked</p>
                      )}
                    </div>
                  )}

                  {/* Farmer Specific: Farm Details */}
                  {profile.role === 'farmer' && (
                    <>
                      {/* Farm Name */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                          Farm Name
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={editForm.farmName}
                            onChange={(e) => setEditForm(v => ({ ...v, farmName: e.target.value }))}
                            placeholder="e.g. Cordillera Greens Farm" 
                            className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Farm Address */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                            Farm Logistics Address
                          </label>
                          <button 
                            type="button" 
                            onClick={() => detectLocation('farmAddress')}
                            className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest hover:underline flex items-center gap-1"
                            disabled={loading}
                          >
                            <MapPin className="w-3 h-3 text-emerald-600 animate-pulse" />
                            Detect Farm Location
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-slate-400">
                            <MapPin className="w-4 h-4" />
                          </span>
                          <textarea 
                            required
                            rows={3}
                            value={editForm.farmAddress}
                            onChange={(e) => setEditForm(v => ({ ...v, farmAddress: e.target.value }))}
                            placeholder="e.g. Sitio Benson, Ambassador, Tublay, Benguet" 
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800 resize-none leading-relaxed"
                            disabled={loading}
                          />
                        </div>
                        {editForm.coordinates && (
                          <p className="mt-1 text-[8px] font-bold text-emerald-600 uppercase tracking-wider text-left leading-none">✨ Coordinates synched with farm boundary</p>
                        )}
                      </div>

                      {/* Farm Story */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                          Farmer's Story / Background
                        </label>
                        <textarea 
                          value={editForm.farmStory} 
                          onChange={(e) => setEditForm(v => ({ ...v, farmStory: e.target.value }))}
                          rows={3}
                          placeholder="Tell local chefs and home cooks about your farming mission..."
                          className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800 h-24 resize-none leading-relaxed"
                          disabled={loading}
                        />
                      </div>

                      {/* Growing Methods */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                          Farming / Growing Methods
                        </label>
                        <input 
                          type="text" 
                          value={editForm.farmingMethods} 
                          onChange={(e) => setEditForm(v => ({ ...v, farmingMethods: e.target.value }))}
                          placeholder="e.g. Natural Pest-Control, Organic Fertilizer"
                          className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800" 
                          disabled={loading}
                        />
                      </div>

                      {/* Certifications */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                          Cooperative Certifications
                        </label>
                        <input 
                          type="text" 
                          value={editForm.certifications} 
                          onChange={(e) => setEditForm(v => ({ ...v, certifications: e.target.value }))}
                          placeholder="e.g. GAP Certified, Cooperative Member"
                          className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* Session Management (Logout is inside this scroll area for premium access too) */}
                  <div className="mt-6 pt-6 border-t border-slate-200/60 text-center">
                    <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-1">Session Management</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-3">Finished exploring local cooperative harvests?</p>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Are you sure you want to logout???',
                          message: 'You are logging out from your Farm To Home session. You will need to use your OTP next time you register or log in.',
                          confirmText: 'Yes, Logout',
                          cancelText: 'Cancel',
                          type: 'logout'
                        });
                        if (!confirmed) return;
                        try {
                          localStorage.removeItem('demo_user_session');
                          localStorage.removeItem('demo_profile_session');
                          await logout();
                          window.location.href = '/';
                        } catch (e) {
                          console.error("Log out handling error:", e);
                          window.location.reload();
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 font-extrabold text-[10px] uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Log Out
                    </button>
                  </div>
                </div>

                {/* Footer sticky action area matching exact Farmer style */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3.5 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-slate-200"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PhotoEditorModal 
        isOpen={photoEditorOpen}
        imageSrc={tempImageSrc}
        onClose={() => setPhotoEditorOpen(false)}
        onDone={async (croppedBase64) => {
          setEditForm(prev => ({ ...prev, photoURL: croppedBase64 }));
          setPhotoEditorOpen(false);
          // If editing inside the modal, we do not update DB immediately; user must click "Save Changes" to save all profile info at once.
          if (!isEditing) {
            await handleUpdatePhotoURL(croppedBase64);
          }
        }}
      />
    </div>
  );
};
