/**
 * MyOrders.tsx — with 1-5 Star Rating System
 * After delivery: buyer rates Product Quality + Delivery Experience separately.
 * On submit: writes to `reviews` collection, marks order hasRated=true,
 * and creates notifications for both farmer and buyer.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Truck, CheckCircle2, XCircle, Clock, ShoppingBag,
  ArrowLeft, AlertCircle, Loader2, ChevronDown, ChevronUp, Store, Star, X
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, updateDoc, doc, orderBy, setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
}

interface Order {
  id: string;
  buyerId: string;
  farmerId: string;
  farmerName?: string;
  items: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: string;
  status: 'pending' | 'accepted' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  cancellationReason?: string;
  deliveryAddress?: string;
  contactNumber?: string;
  hasRated?: boolean;
  ratingId?: string;
}

type TabId = 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

const TABS: { id: TabId; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'pending',   label: 'To Pay',      shortLabel: 'Pay',      icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'preparing', label: 'To Ship',     shortLabel: 'Ship',     icon: <Package className="w-3.5 h-3.5" /> },
  { id: 'shipped',   label: 'To Receive',  shortLabel: 'Receive',  icon: <Truck className="w-3.5 h-3.5" /> },
  { id: 'delivered', label: 'Delivered',   shortLabel: 'Done',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { id: 'cancelled', label: 'Cancelled',   shortLabel: 'Cancelled',icon: <XCircle className="w-3.5 h-3.5" /> },
];

const STATUS_PILL: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  accepted:  'bg-sky-50 text-sky-700 border-sky-200',
  preparing: 'bg-sky-50 text-sky-700 border-sky-200',
  shipped:   'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Awaiting Confirmation',
  accepted:  'Farmer Accepted',
  preparing: 'Preparing to Ship',
  shipped:   'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const TAB_ACTIVE: Record<TabId, string> = {
  pending:   'border-amber-500 text-amber-600',
  preparing: 'border-sky-500 text-sky-600',
  shipped:   'border-violet-500 text-violet-600',
  delivered: 'border-emerald-500 text-emerald-600',
  cancelled: 'border-rose-500 text-rose-600',
};

const getTabForStatus = (status: string): TabId => {
  if (status === 'accepted' || status === 'preparing') return 'preparing';
  if (['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) return status as TabId;
  return 'pending';
};

// ── Star Picker ──────────────────────────────────────────────────────────────
const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const StarPicker: React.FC<{
  value: number;
  onChange: (v: number) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform active:scale-90"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hovered || value)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-200'
              }`}
            />
          </button>
        ))}
        {(hovered || value) > 0 && (
          <span className="text-xs font-bold text-amber-500 ml-1">
            {STAR_LABELS[hovered || value]}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Rating Modal ─────────────────────────────────────────────────────────────
interface RatingModalProps {
  order: Order;
  onClose: () => void;
  onSubmitted: () => void;
  user: { uid: string } | null;
}

const RatingModal: React.FC<RatingModalProps> = ({ order, onClose, onSubmitted, user }) => {
  const [productRating, setProductRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (productRating === 0 || deliveryRating === 0) {
      setError('Please rate both the product and delivery.');
      return;
    }
    if (!user?.uid) return;

    setLoading(true);
    setError('');

    try {
      const avgRating = Math.round((productRating + deliveryRating) / 2);
      const firstItem = order.items[0];
      const now = new Date().toISOString();

      // 1. Write review doc
      const reviewRef = doc(collection(db, 'reviews'));
      await setDoc(reviewRef, {
        id: reviewRef.id,
        orderId: order.id,
        productId: firstItem?.id || '',
        buyerId: user.uid,
        farmerId: order.farmerId,
        rating: avgRating,
        productRating,
        deliveryRating,
        comment: comment.trim(),
        images: [],
        createdAt: now,
      });

      // 2. Mark order as rated
      await updateDoc(doc(db, 'orders', order.id), {
        hasRated: true,
        ratingId: reviewRef.id,
        updatedAt: now,
      });

      // 3. Notify farmer about new review
      const farmerNotifRef = doc(collection(db, 'notifications'));
      await setDoc(farmerNotifRef, {
        id: farmerNotifRef.id,
        userId: order.farmerId,
        title: 'New Customer Review ⭐',
        message: `You received a ${avgRating}-star rating for order #${order.id.slice(0, 8).toUpperCase()}.${
          comment.trim() ? ` "${comment.slice(0, 60)}${comment.length > 60 ? '…' : ''}"` : ''
        }`,
        type: 'system',
        relatedId: order.id,
        read: false,
        createdAt: now,
      });

      // 4. Confirm to buyer that their review was recorded
      const buyerNotifRef = doc(collection(db, 'notifications'));
      await setDoc(buyerNotifRef, {
        id: buyerNotifRef.id,
        userId: user.uid,
        title: 'Review Submitted',
        message: `Your ${avgRating}-star review for order #${order.id.slice(0, 8).toUpperCase()} has been submitted. Thank you for the feedback!`,
        type: 'order',
        relatedId: order.id,
        read: false,
        createdAt: now,
      });

      onSubmitted();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Rate Your Order</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Order #{order.id.slice(0, 8).toUpperCase()} · {order.farmerName || 'Local Farmer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items preview */}
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 shrink-0">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />
              )}
              <span className="text-xs font-bold text-slate-700">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Star pickers */}
        <div className="space-y-5 mb-5">
          <StarPicker label="Product Quality" value={productRating} onChange={setProductRating} />
          <StarPicker label="Delivery Experience" value={deliveryRating} onChange={setDeliveryRating} />
        </div>

        {/* Comment */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Comment (optional)</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this order…"
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium mb-4 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || productRating === 0 || deliveryRating === 0}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            : <><Star className="w-4 h-4 fill-white" /> Submit Review</>
          }
        </button>
      </motion.div>
    </motion.div>
  );
};

// ── Order Card ───────────────────────────────────────────────────────────────
const OrderCard: React.FC<{
  order: Order;
  onCancel: (id: string) => void;
  onConfirmDelivery: (id: string) => void;
  onRate: (order: Order) => void;
  actionLoading: string | null;
  cancelConfirm: string | null;
  setCancelConfirm: (id: string | null) => void;
}> = ({ order, onCancel, onConfirmDelivery, onRate, actionLoading, cancelConfirm, setCancelConfirm }) => {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 2;
  const hasMore = order.items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? order.items : order.items.slice(0, PREVIEW_COUNT);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/60">
        <div className="flex items-center gap-2 min-w-0">
          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] sm:max-w-none">
            {order.farmerName || 'Local Farmer'}
          </span>
          <span className="hidden sm:inline text-[9px] text-slate-300 font-bold">•</span>
          <span className="hidden sm:inline text-[10px] text-slate-400 font-medium">{formatDate(order.createdAt)}</span>
        </div>
        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${STATUS_PILL[order.status]}`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 pt-3 pb-1 space-y-3">
        <AnimatePresence initial={false}>
          {visibleItems.map((item, idx) => (
            <motion.div
              key={`${item.id}-${idx}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <Package className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {item.quantity} {item.unit} × ₱{item.price.toLocaleString()}
                </p>
              </div>
              <p className="text-sm font-black text-slate-800 shrink-0">
                ₱{(item.quantity * item.price).toLocaleString()}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-primary uppercase tracking-wider hover:bg-primary/5 rounded-lg transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> +{order.items.length - PREVIEW_COUNT} more</>
            }
          </button>
        )}
      </div>

      {/* Totals */}
      <div className="mx-4 my-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
        {order.subtotal != null && (
          <div className="flex justify-between">
            <span className="text-xs text-slate-400 font-medium">Subtotal</span>
            <span className="text-xs font-bold text-slate-600">₱{order.subtotal.toLocaleString()}</span>
          </div>
        )}
        {order.deliveryFee != null && (
          <div className="flex justify-between">
            <span className="text-xs text-slate-400 font-medium">Delivery Fee</span>
            <span className="text-xs font-bold text-slate-600">₱{order.deliveryFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 border-t border-slate-200">
          <span className="text-sm font-black text-slate-800">Total</span>
          <span className="text-sm font-black text-primary">₱{order.total?.toLocaleString()}</span>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {order.paymentMethod?.replace(/_/g, ' ')}
        </span>
        {order.paymentStatus && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            order.paymentStatus === 'paid'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      {['pending', 'accepted', 'preparing', 'shipped', 'delivered'].includes(order.status) && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-2">

          {/* Pending: cancel */}
          {order.status === 'pending' && (
            cancelConfirm === order.id ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-rose-500 font-semibold flex-1">Cancel this order?</p>
                <button onClick={() => setCancelConfirm(null)} className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">No</button>
                <button
                  onClick={() => onCancel(order.id)}
                  disabled={actionLoading === order.id}
                  className="px-3 py-2 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {actionLoading === order.id && <Loader2 className="w-3 h-3 animate-spin" />}
                  Yes, Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirm(order.id)}
                className="w-full py-2.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors active:scale-95 flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Order
              </button>
            )
          )}

          {/* Preparing */}
          {(order.status === 'accepted' || order.status === 'preparing') && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 rounded-xl">
              <Package className="w-3.5 h-3.5 animate-pulse" />
              Farmer is preparing your order
            </div>
          )}

          {/* Shipped: confirm receipt */}
          {order.status === 'shipped' && (
            <button
              onClick={() => onConfirmDelivery(order.id)}
              disabled={actionLoading === order.id}
              className="w-full py-3 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm shadow-primary/20 disabled:opacity-60"
            >
              {actionLoading === order.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />
              }
              Order Received — Confirm Delivery
            </button>
          )}

          {/* Delivered + not yet rated: Rate button */}
          {order.status === 'delivered' && !order.hasRated && (
            <button
              onClick={() => onRate(order)}
              className="w-full py-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Rate this Order
            </button>
          )}

          {/* Delivered + already rated: badge */}
          {order.status === 'delivered' && order.hasRated && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              Review Submitted — Thank you!
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
interface MyOrdersProps {
  onBack?: () => void;
}

export const MyOrders: React.FC<MyOrdersProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }

    const cacheKey = `buyer_orders_${user.uid}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setOrders(JSON.parse(cached)); setLoading(false); } catch { localStorage.removeItem(cacheKey); }
    }

    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const ords: Order[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setOrders(ords);
      localStorage.setItem(cacheKey, JSON.stringify(ords));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('[MyOrders]', err);
      setError('Unable to load live orders. Showing cached data.');
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const filteredOrders = orders.filter((o) => getTabForStatus(o.status) === activeTab);

  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.id] = orders.filter((o) => getTabForStatus(o.status) === tab.id).length;
    return acc;
  }, {} as Record<TabId, number>);

  const unratedCount = orders.filter((o) => o.status === 'delivered' && !o.hasRated).length;

  const handleCancelOrder = useCallback(async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        cancellationReason: 'Cancelled by buyer',
      });
      setCancelConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleConfirmDelivery = useCallback(async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'delivered',
        updatedAt: new Date().toISOString(),
        paymentStatus: 'paid',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 md:pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">My Orders</h1>
            <p className="text-[10px] text-slate-400 font-semibold">
              {orders.length} total
              {unratedCount > 0 && (
                <span className="ml-2 text-amber-600 font-bold">· {unratedCount} awaiting review</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-[61px] z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 sm:px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all shrink-0 ${
                  activeTab === tab.id
                    ? `${TAB_ACTIVE[tab.id]} bg-slate-50/50`
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.icon}
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className="xs:hidden sm:hidden">{tab.shortLabel}</span>
                {tabCounts[tab.id] > 0 && (
                  <span className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center ${
                    activeTab === tab.id ? 'bg-current text-white opacity-90' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {tabCounts[tab.id] > 9 ? '9+' : tabCounts[tab.id]}
                  </span>
                )}
                {/* Amber dot if there are unrated delivered orders */}
                {tab.id === 'delivered' && unratedCount > 0 && (
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full ml-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Unrated nudge banner (only on Delivered tab) */}
        {activeTab === 'delivered' && unratedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-semibold mb-4"
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
            <span>
              You have <strong>{unratedCount}</strong> delivered order{unratedCount > 1 ? 's' : ''} waiting for your review!
            </span>
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">Loading your orders…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-7 h-7 text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 text-sm">
                      No {TABS.find(t => t.id === activeTab)?.label} orders
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {activeTab === 'pending'
                        ? 'Browse the marketplace and place your first order!'
                        : 'Orders in this status will appear here.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancelOrder}
                      onConfirmDelivery={handleConfirmDelivery}
                      onRate={setRatingOrder}
                      actionLoading={actionLoading}
                      cancelConfirm={cancelConfirm}
                      setCancelConfirm={setCancelConfirm}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingOrder && (
          <RatingModal
            order={ratingOrder}
            user={user}
            onClose={() => setRatingOrder(null)}
            onSubmitted={() => setRatingOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyOrders;