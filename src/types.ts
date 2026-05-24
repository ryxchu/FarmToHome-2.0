export type UserRole = 'buyer' | 'farmer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  status: 'verified' | 'unverified' | 'pending' | 'banned';
  isBanned?: boolean;
  roleChangeRequest?: UserRole;
  isSuperAdmin?: boolean;
  farmName?: string;
  farmAddress?: string;
  farmStory?: string;
  farmingMethods?: string;
  certifications?: string[];
  isApproved?: boolean;
  rewardsPoints?: number;
  ecoMetrics?: {
    carbonSavings: number;
    localSupportImpact: number;
    foodTravelDistance: number;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  unit: 'kg' | 'unit' | 'pack' | 'gallon' | 'tray' | 'sack';
  stock: number;
  farmerId: string;
  images: string[];
  harvestDate: string;
  rating: number;
  reviewCount: number;
  isPublished: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
  flagReason?: string;
  qrCodeUrl?: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  buyerId: string;
  farmerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  contactNumber: string;
  paymentMethod: string;
  buyerMessage?: string | null;
  shippingMethod?: string | null;
  disputeStatus?: 'none' | 'opened' | 'resolved' | 'refunded';
  disputeReason?: string;
  platformFee?: number;
  discount?: number;
  discountType?: string;
  createdAt: string;
  updatedAt: string;
  riderLocation?: {
    lat: number;
    lng: number;
  };
  eta?: string;
}

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  buyerId: string;
  farmerId: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

export interface Post {
  id: string;
  farmerId: string;
  content: string;
  media: string[];
  likes: string[];
  createdAt: string;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  broadcastMessage?: string;
  broadcastType?: 'info' | 'warning' | 'emergency';
  platformCommissionRate: number;
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  details: string;
  timestamp: string;
}
