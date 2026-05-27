import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence non-fatal/transport-level warnings (such as idle stream disconnections)
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connected successfully");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('Could not reach Cloud Firestore backend'))) {
      console.warn("Firestore is operating in offline-cached mode. Connection to Firestore backend will resume once container networking resolves.");
    }
  }
}

testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('offline') || msg.includes('could not reach') || msg.includes('unavailable') || msg.includes('network-request-failed')) return true;
  }

  const errObj = error as any;
  if (errObj.code === 'unavailable' || errObj.code === 'failed-precondition') return true;

  const errStr = String(error).toLowerCase();
  if (errStr.includes('offline') || errStr.includes('could not reach') || errStr.includes('network') || errStr.includes('unavailable')) return true;

  return false;
}

export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  
  // Case: Error object
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('quota') || msg.includes('limit reached') || msg.includes('exhausted') || msg.includes('exceeded')) return true;
  }

  // Case: Firestore error object with code
  const errObj = error as any;
  if (errObj.code === 'resource-exhausted' || errObj.code === 'quota-exceeded') return true;
  
  // Case: Stringified/JSON structures or raw string
  const errStr = String(error).toLowerCase();
  if (
    errStr.includes('quota') || 
    errStr.includes('limit reached') || 
    errStr.includes('exhausted') || 
    errStr.includes('resource-exhausted') ||
    errStr.includes('exceeded')
  ) return true;

  return false;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error (Logged): ', jsonError);

  const isQuota = isQuotaError(error);
  const isOffline = isOfflineError(error);

  if (typeof window !== 'undefined' && (isQuota || isOffline)) {
    // Notify components via standard CustomEvent system
    const event = new CustomEvent('firestore-service-interrupted', {
      detail: {
        isQuota,
        isOffline,
        message: error instanceof Error ? error.message : String(error),
        operationType,
        path
      }
    });
    window.dispatchEvent(event);
    
    // We intentionally return without throwing to prevent uncaught system dashboard failures,
    // allowing the app to switch to cached fallbacks.
    return;
  }

  throw new Error(jsonError);
}

// Safe recursive function to strip huge base64 data URLs from cached images to prevent localStorage quota errors
function pruneHeavyBase64(value: string): string {
  // Safe limit: if total string is small, fast path bypass (highly performant)
  if (value.length < 50000) {
    return value;
  }
  try {
    const data = JSON.parse(value);
    
    const cleanObject = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        if (typeof obj === 'string' && obj.startsWith('data:image/') && obj.length > 30000) {
          // Replace with a lightweight, inline SVG offline placeholder
          return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='8' fill='%2394a3b8'>Offline Cache</text></svg>";
        }
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
      }
      
      const newObj: any = {};
      for (const [k, v] of Object.entries(obj)) {
        newObj[k] = cleanObject(v);
      }
      return newObj;
    };
    
    return JSON.stringify(cleanObject(data));
  } catch (_) {
    return value;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    const prunedValue = pruneHeavyBase64(value);
    localStorage.setItem(key, prunedValue);
  } catch (error) {
    console.warn(`localStorage.setItem exceeded quota or failed for key "${key}". Cleaning up space...`, error);
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== key) {
          if (k === 'demo_user_session' || k === 'demo_profile_session') {
            continue;
          }
          if (
            k.startsWith('admin_') || 
            k.startsWith('farmer_') || 
            k.startsWith('buyer_') || 
            k.startsWith('user_profile_') || 
            k === 'social_feed_posts' || 
            k === 'shop_products_all' ||
            k === 'featured_products'
          ) {
            keysToRemove.push(k);
          }
        }
      }
      
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });
      
      const prunedValueRetry = pruneHeavyBase64(value);
      localStorage.setItem(key, prunedValueRetry);
      console.log(`Successfully recovered and set key "${key}" after pruning old caches.`);
    } catch (innerError) {
      console.error(`Critically failed to save "${key}" even after full cache pruning:`, innerError);
    }
  }
}

