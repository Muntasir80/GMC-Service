import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import firebaseConfigLocal from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigLocal.apiKey,
  authDomain: firebaseConfigLocal.authDomain,
  projectId: firebaseConfigLocal.projectId,
  storageBucket: firebaseConfigLocal.storageBucket,
  messagingSenderId: firebaseConfigLocal.messagingSenderId,
  appId: firebaseConfigLocal.appId,
};

const app = initializeApp(firebaseConfig);

// Use the explicit database ID from config if provided, otherwise default
const dbId = firebaseConfigLocal.firestoreDatabaseId;

// Initialize Firestore with settings to bypass potential WebSocket issues in some iframe environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (dbId && dbId !== '(default)') ? dbId : undefined);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
import { doc as fsDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(fsDoc(db, '_internal_', 'connection_test'));
    console.log("Firebase connection successful.");
  } catch (error: any) {
    console.error("Firebase connection test failed:", error);
    if(error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration (Project ID or API Key mismatch).");
    } else if (error.code === 'permission-denied') {
      console.log("Firestore connection active (Permission denied is expected for internal test doc).");
    } else {
      console.error("Firebase Details:", error.code, error.message);
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  setDoc,
  writeBatch
};

export enum OperationType {
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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
