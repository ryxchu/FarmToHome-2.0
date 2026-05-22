import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
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
    if (msg.includes('quota') || msg.includes('limit reached') || msg.includes('exhausted')) return true;
  }

  // Case: Firestore error object with code
  const errObj = error as any;
  if (errObj.code === 'resource-exhausted' || errObj.code === 'quota-exceeded') return true;
  
  // Case: Stringified JSON error from handleFirestoreError
  const errStr = String(error).toLowerCase();
  if (errStr.includes('quota') || errStr.includes('limit reached') || errStr.includes('exhausted') || errStr.includes('resource-exhausted')) return true;

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
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}
