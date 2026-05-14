import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
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
  openAuth: () => {}
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          setProfile({ ...snapshot.data(), uid: snapshot.id } as UserProfile);
        }
        setLoading(false);
      }, (error) => {
        console.error("Profile sync error:", error);
        setLoading(false);
        // We don't throw here to avoid crashing the whole app, but we log it
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

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
      openAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
