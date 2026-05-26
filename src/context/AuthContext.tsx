import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isQuotaError, safeSetItem } from '../lib/firebase';
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
  loginSimulatedDemo: (role: 'buyer' | 'farmer' | 'admin', email: string, name: string) => void;
  isDemoActive: boolean;
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
  refreshProfile: async () => {},
  loginSimulatedDemo: () => {},
  isDemoActive: false
});

// Resilient Mock/Demo Local Storage Seeder for Offline/Blocked Connections
const seedLocalCacheForDemo = (uid: string, role: string) => {
  if (role === 'farmer') {
    const mockProducts = [
      {
        id: 'p_guimaras_mangoes',
        name: 'Guimaras Sweet Mangoes (Export Grade)',
        category: 'Fruits',
        price: 180,
        unit: 'kg',
        stock: 120,
        description: 'Famous sweet Guimaras mangoes, freshly harvested, organic, and pesticide-free.',
        image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400',
        rating: 4.9,
        reviewsCount: 24,
        farmerId: uid,
        farmerName: 'Mang Juan',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p_calamansi',
        name: 'Fresh Native Calamansi',
        category: 'Fruits',
        price: 80,
        unit: 'kg',
        stock: 350,
        description: 'Zesty native calamansi, rich in Vitamin C, harvested daily from the orchards.',
        image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400',
        rating: 4.8,
        reviewsCount: 15,
        farmerId: uid,
        farmerName: 'Mang Juan',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p_benguet_cabbage',
        name: 'Benguet Organic Cabbage',
        category: 'Vegetables',
        price: 110,
        unit: 'kg',
        stock: 80,
        description: 'Crisp and sweet highland cabbage from the mountain terraces of Benguet.',
        image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=400',
        rating: 4.7,
        reviewsCount: 8,
        farmerId: uid,
        farmerName: 'Mang Juan',
        createdAt: new Date().toISOString()
      }
    ];

    const mockOrders = [
      {
        id: 'order_demo_101',
        buyerId: 'demo_buyer_patricia',
        buyerName: 'Patricia Salvador',
        buyerPhone: '09187654321',
        buyerAddress: 'Unit 401, Serendra Condominium, BGC, Taguig City, Metro Manila',
        farmerId: uid,
        items: [
          {
            id: 'p_guimaras_mangoes',
            name: 'Guimaras Sweet Mangoes (Export Grade)',
            price: 180,
            quantity: 3,
            unit: 'kg',
            image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400'
          },
          {
            id: 'p_calamansi',
            name: 'Fresh Native Calamansi',
            price: 80,
            quantity: 2,
            unit: 'kg',
            image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400'
          }
        ],
        subtotal: 700,
        deliveryFee: 50,
        total: 750,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'pending',
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: 'order_demo_102',
        buyerId: 'demo_buyer_john',
        buyerName: 'John Santos',
        buyerPhone: '09192223344',
        buyerAddress: '12-A Molave Street, Project 3, Quezon City, Metro Manila',
        farmerId: uid,
        items: [
          {
            id: 'p_benguet_cabbage',
            name: 'Benguet Organic Cabbage',
            price: 110,
            quantity: 5,
            unit: 'kg',
            image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=400'
          }
        ],
        subtotal: 550,
        deliveryFee: 65,
        total: 615,
        paymentMethod: 'gcash',
        paymentStatus: 'paid',
        status: 'shipped',
        createdAt: new Date(Date.now() - 43200000).toISOString()
      }
    ];

    const mockReviews = [
      {
        id: 'rev_1',
        orderId: 'order_old_01',
        productId: 'p_guimaras_mangoes',
        productName: 'Guimaras Sweet Mangoes (Export Grade)',
        buyerName: 'Patricia Salvador',
        rating: 5,
        comment: 'Super sweet! These are indeed exporting quality. Ordered 3kg and they were gone in 2 days. Highly recommended!',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'rev_2',
        productId: 'p_calamansi',
        productName: 'Fresh Native Calamansi',
        buyerName: 'John Santos',
        rating: 4,
        comment: 'Fresh, juicy, and very well-packed. Thank you!',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ];

    const mockConversations = [
      {
        id: 'conv_demo_1',
        participants: [uid, 'demo_buyer_patricia'],
        participantNames: {
          [uid]: 'Mang Juan',
          'demo_buyer_patricia': 'Patricia Salvador'
        },
        participantRoles: {
          [uid]: 'farmer',
          'demo_buyer_patricia': 'buyer'
        },
        lastMessage: 'Sure, Patricia! Standard delivery delivers tomorrow morning.',
        lastMessageAt: new Date().toISOString(),
        lastMessageSenderId: uid,
        unread: false
      }
    ];

    safeSetItem(`farmer_products_${uid}`, JSON.stringify(mockProducts));
    safeSetItem(`farmer_orders_${uid}`, JSON.stringify(mockOrders));
    safeSetItem(`farmer_reviews_${uid}`, JSON.stringify(mockReviews));
    safeSetItem(`farmer_conversations_${uid}`, JSON.stringify(mockConversations));
  } else if (role === 'buyer') {
    // Seed some general orders/conversations for the buyer
    const mockBuyerOrders = [
      {
        id: 'order_demo_201',
        buyerId: uid,
        buyerName: 'Patricia Salvador',
        buyerPhone: '09187654321',
        buyerAddress: 'Unit 401, Serendra Condominium, BGC, Taguig City, Metro Manila',
        farmerId: 'demo_farmer_juan',
        farmerName: 'Mang Juan',
        items: [
          {
            id: 'p_guimaras_mangoes',
            name: 'Guimaras Sweet Mangoes (Export Grade)',
            price: 180,
            quantity: 2,
            unit: 'kg',
            image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400'
          }
        ],
        subtotal: 360,
        deliveryFee: 50,
        total: 410,
        paymentMethod: 'gcash',
        paymentStatus: 'paid',
        status: 'shipped',
        createdAt: new Date().toISOString()
      }
    ];
    safeSetItem(`buyer_orders_${uid}`, JSON.stringify(mockBuyerOrders));
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<any | null>(null);
  const [simulatedProfile, setSimulatedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authVariant, setAuthVariant] = useState<{ mode: 'login' | 'register'; role: 'buyer' | 'farmer' | 'admin' }>({ mode: 'login', role: 'buyer' });

  // Load simulated user on initial mount
  useEffect(() => {
    const savedDemoUser = localStorage.getItem('demo_user_session');
    const savedDemoProfile = localStorage.getItem('demo_profile_session');
    if (savedDemoUser && savedDemoProfile) {
      try {
        setSimulatedUser(JSON.parse(savedDemoUser));
        setSimulatedProfile(JSON.parse(savedDemoProfile));
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('demo_user_session');
        localStorage.removeItem('demo_profile_session');
      }
    }
  }, []);

  const openAuth = (mode: 'login' | 'register' = 'login', role: 'buyer' | 'farmer' | 'admin' = 'buyer') => {
    setAuthVariant({ mode, role });
    setShowAuthModal(true);
  };

  const logout = async () => {
    localStorage.removeItem('demo_user_session');
    localStorage.removeItem('demo_profile_session');
    setSimulatedUser(null);
    setSimulatedProfile(null);
    await signOut(auth);
  };

  const loginSimulatedDemo = (selectedRole: 'buyer' | 'farmer' | 'admin', selectedEmail: string, selectedName: string) => {
    const mockUid = `demo_${selectedRole}_${Date.now()}`;
    const mockUser = {
      uid: mockUid,
      email: selectedEmail,
      displayName: selectedName,
      emailVerified: true,
    } as any;
    
    const mockProfile: UserProfile = {
      uid: mockUid,
      email: selectedEmail,
      fullName: selectedName,
      phone: '09171234567',
      role: selectedRole,
      status: 'verified',
      createdAt: new Date().toISOString()
    };

    safeSetItem('demo_user_session', JSON.stringify(mockUser));
    safeSetItem('demo_profile_session', JSON.stringify(mockProfile));
    
    // Seed sample data for high performance and fallback compatibility on offline/blocked connections:
    seedLocalCacheForDemo(mockUid, selectedRole);

    setSimulatedUser(mockUser);
    setSimulatedProfile(mockProfile);
    setLoading(false);
    setShowAuthModal(false);
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
        safeSetItem(`user_profile_${uid}`, JSON.stringify(data));
      } else {
        // Automatically bootstrap admin profile collection document if current user is the hardcoded admin
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email && currentUser.email.toLowerCase() === 'ryzabasas16@gmail.com') {
          const adminProfile: UserProfile = {
            uid,
            email: currentUser.email,
            fullName: currentUser.displayName || 'Ryza Basas (Admin)',
            phone: currentUser.phoneNumber || '09193604094',
            role: 'admin',
            status: 'verified',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), adminProfile);
          setProfile(adminProfile);
          safeSetItem(`user_profile_${uid}`, JSON.stringify(adminProfile));
        }
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
    const savedDemoUser = localStorage.getItem('demo_user_session');
    if (savedDemoUser) {
      // If demo session is active, don't boot standard Firebase loading transitions
      setLoading(false);
      return;
    }

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

  const activeUser = user || simulatedUser;
  const activeProfile = profile || simulatedProfile;

  return (
    <AuthContext.Provider value={{ 
      user: activeUser, 
      profile: activeProfile, 
      loading, 
      logout,
      showAuthModal,
      setShowAuthModal,
      authVariant,
      setAuthVariant,
      openAuth,
      refreshProfile,
      loginSimulatedDemo,
      isDemoActive: !!simulatedUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
