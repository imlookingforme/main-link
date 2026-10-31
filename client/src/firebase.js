import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Firebase web configuration sourced from environment or project defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCLSA6xdONNd3XhY851GLmoFoZrTiXzJR0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "main-link-civic.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "main-link-civic",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "main-link-civic.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "581696421209",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:581696421209:web:e74ac21e9f433844392048",
};

// Check if credentials are provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes("REPLACE")
);

let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (err) {
    console.warn("[Firebase] Initialization warning:", err);
  }
}

export { app, auth, googleProvider, signInWithPopup, signOut };
