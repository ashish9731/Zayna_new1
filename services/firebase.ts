import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, User } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPZRXGn7rSXKPth1W8J2KJUKZj9fgVp-c",
  authDomain: "zayna-5912a.firebaseapp.com",
  projectId: "zayna-5912a",
  storageBucket: "zayna-5912a.firebasestorage.app",
  messagingSenderId: "290479379887",
  appId: "1:290479379887:web:6f4287a60b326532854b5a",
  measurementId: "G-RBCLGYMPHX"
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