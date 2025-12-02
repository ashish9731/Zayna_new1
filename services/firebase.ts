import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, User } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { updateProfile } from "firebase/auth";

// Your web app's Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
const logout = () => signOut(auth);

export { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, GoogleAuthProvider };