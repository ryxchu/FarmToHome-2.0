import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isQuotaError } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authVariant: { mode: 'login' | 'register'; role: 'buyer' | 'farmer' | 'admin' };
  setAuthVariant: (variant: { mode: 'login' | 'register'; role: 'buyer' | 'farmer' | 'admin' }) => void;
  openAuth: (mode?: 'login' | 'register', role?: 'buyer' | 'farmer' | 'admin') => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  logout: async () => {},
  showAuthModal: false,
  setShowAuthModal: () => {},
  authVariant: { mode: 'login', role: 'buyer' },
  setAuthVariant: () => {},
  openAuth: () => {},
  refreshProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authVariant, setAuthVariant] = useState<{ mode: 'login' | 'register'; role: 'buyer' | 'farmer' | 'admin' }>({ mode: 'login', role: 'buyer' });

  const openAuth = (mode: 'login' | 'register' = 'login', role: 'buyer' | 'farmer' | 'admin' = 'buyer') => {
    setAuthVariant({ mode, role });
    setShowAuthModal(true);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const fetchProfile = useCallback(async (uid: string) => {
    // Try cache first
    const cached = localStorage.getItem(`user_profile_${uid}`);
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem(`user_profile_${uid}`);
      }
    }

    try {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (snapshot.exists()) {
        const data = { ...snapshot.data(), uid: snapshot.id } as UserProfile;
        setProfile(data);
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(data));
      }
    } catch (error) {
      if (!isQuotaError(error)) {
        console.error("Profile fetch error:", error);
      } else {
        console.warn("Using cached profile due to quota limit");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.uid);
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      } else {
        fetchProfile(firebaseUser.uid);
      }
    });

    return () => unsubscribeAuth();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      logout,
      showAuthModal,
      setShowAuthModal,
      authVariant,
      setAuthVariant,
      openAuth,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
