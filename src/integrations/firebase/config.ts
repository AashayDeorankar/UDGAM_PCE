import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== "your-api-key" &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyDevKeyForLocalTesting123456789",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "techprep-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "techprep-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "techprep-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:demo123456789012",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function getFirebaseApp(): FirebaseApp | null {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    return app;
  } catch {
    return null;
  }
}

function getFirebaseAuth(): Auth | null {
  try {
    if (!auth) {
      const a = getFirebaseApp();
      if (!a) return null;
      auth = getAuth(a);
    }
    return auth;
  } catch {
    return null;
  }
}

function getFirestoreDb(): Firestore | null {
  try {
    if (!db) {
      const a = getFirebaseApp();
      if (!a) return null;
      db = getFirestore(a);
    }
    return db;
  } catch {
    return null;
  }
}

function getFirebaseStorage(): FirebaseStorage | null {
  try {
    if (!storage) {
      const a = getFirebaseApp();
      if (!a) return null;
      storage = getStorage(a);
    }
    return storage;
  } catch {
    return null;
  }
}

export { getFirebaseAuth, getFirestoreDb, getFirebaseStorage };
