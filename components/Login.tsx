import React, { useState } from 'react';
import { Mail, Lock, Zap, User, ArrowRight, AlertCircle, ShieldCheck, Chrome } from 'lucide-react';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, GoogleAuthProvider } from '../services/firebase';
import { updateProfile } from "firebase/auth";

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFirebaseAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!name) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }
        // Create user with email and password
        const userCredential = await signUpWithEmail(email, password);
        const user = userCredential.user;
        
        // Update user profile with name
        await updateProfile(user, { displayName: name });
      } else {
        // Sign in with email and password
        await signInWithEmail(email, password);
      }
      
      // Store user session in localStorage
      const userSession = {
        id: auth.currentUser?.uid,
        name: auth.currentUser?.displayName || email.split('@')[0],
        email: auth.currentUser?.email,
        provider: 'email',
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('zayna_user', JSON.stringify(userSession));
      setLoading(false);
      onLogin();
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err.message || "An error occurred during authentication.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      // Store user session in localStorage
      const userSession = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0],
        email: user.email,
        provider: 'google',
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('zayna_user', JSON.stringify(userSession));
      onLogin();
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "An error occurred during Google sign-in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 animate-fade-in pb-20">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl relative overflow-hidden bg-white/80 dark:bg-slate-900/80">
        
        {/* Decorative background glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-sky-500/10 dark:bg-sky-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 mb-4 shadow-lg shadow-sky-500/30">
                <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="text-slate-500 dark:text-slate-400">
                {isSignUp ? 'Sign up to access your intelligent meeting assistant.' : 'Sign in to access your intelligent meeting assistant.'}
            </p>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 flex items-start gap-3 text-red-600 dark:text-red-200 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
        )}

        <div className="space-y-4 relative z-10">
            <div className="space-y-3">
                {isSignUp && (
                    <div className="relative animate-fade-in">
                        <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all" 
                        />
                    </div>
                )}
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="email" 
                        placeholder="Email address" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all" 
                    />
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all" 
                    />
                </div>
            </div>

            <button 
                onClick={handleFirebaseAuth} 
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-sky-500/20 mt-4 flex items-center justify-center disabled:opacity-70"
            >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </button>

            <div className="relative flex items-center my-4">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="mx-4 text-slate-500 dark:text-slate-400 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <button 
                onClick={handleGoogleSignIn} 
                disabled={loading}
                className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all shadow border border-slate-200 flex items-center justify-center disabled:opacity-70"
            >
                <Chrome className="w-5 h-5 mr-2" />
                Continue with Google
            </button>
        </div>
        
        <div className="mt-6 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                    className="ml-2 text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 font-semibold focus:outline-none transition-colors"
                >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
            </p>
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex items-center justify-center text-xs text-slate-400 gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Your data is securely stored with Firebase authentication.</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;