
import React, { useRef } from 'react';
import { Mic, Video, UploadCloud, CheckCircle, Zap, Shield, Lock, Database, FileText, Sparkles, Globe, PenTool, Palette, ServerOff } from 'lucide-react';
import { RecordingSource } from '../types';

interface HeroProps {
  onStart: (source: RecordingSource) => void;
  onUpload: (file: File) => void;
}

const Hero: React.FC<HeroProps> = ({ onStart, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6 text-center animate-fade-in pb-20">
      <div className="max-w-6xl w-full space-y-16">
        <div className="space-y-8 animate-fade-in-up">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5" /> Zero-Retention Architecture
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight pt-2 text-slate-900 dark:text-white leading-tight">
            Meet <span className="gradient-text">Zayna</span> <br />
            <span className="text-3xl md:text-5xl text-slate-500 dark:text-slate-400 mt-4 block font-medium">Intelligence without Intrusion</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The only meeting assistant built on a <strong>Local Vault Architecture</strong>. 
            We record, transcribe, and analyse your meetings directly in your browser. 
            Your data is your property, and it never touches our database.
          </p>
          
          <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-4 w-full md:w-auto flex-wrap">
            <button 
              onClick={() => onStart('mic')}
              className="w-full md:w-auto group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-sky-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-600 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/30 transform hover:-translate-y-1"
            >
              <Mic className="mr-2 w-5 h-5 group-hover:text-yellow-300 transition-colors" />
              Live Meeting
              <div className="absolute -inset-3 rounded-xl bg-sky-400/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>

            <button 
              onClick={() => onStart('screen')}
              className="w-full md:w-auto group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-1"
            >
              <Video className="mr-2 w-5 h-5 group-hover:text-pink-300 transition-colors" />
              Zoom / Teams
            </button>

            <div className="relative w-full md:w-auto">
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="audio/*" 
                  className="hidden" 
               />
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-700 dark:text-slate-200 transition-all duration-200 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800 transform hover:-translate-y-1 shadow-sm"
                >
                  <UploadCloud className="mr-2 w-5 h-5" />
                  Upload
                </button>
            </div>
          </div>
        </div>

        {/* Compliance & Privacy Trust Section */}
        <div className="py-8 border-y border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Enterprise-Grade Compliance by Design</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex flex-col items-center gap-2 group">
                    <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-lg group-hover:bg-sky-100 dark:group-hover:bg-sky-900/30 transition-colors">
                        <Shield className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">GDPR Ready</span>
                </div>
                <div className="flex flex-col items-center gap-2 group">
                    <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                        <Lock className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">HIPAA Compatible</span>
                </div>
                <div className="flex flex-col items-center gap-2 group">
                    <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                        <ServerOff className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">SOC2 Scope Reduced</span>
                </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 max-w-3xl mx-auto px-4">
                *Because Zayna processes data ephemerally and stores it locally on your device, we do not act as a data processor for your sensitive content, significantly reducing your compliance burden.
            </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Meeting Intelligence Card */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-32 h-32 text-sky-500" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-sky-100 dark:bg-sky-500/20 rounded-2xl flex items-center justify-center mb-6 text-sky-600 dark:text-sky-400">
                        <Mic className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Meeting Intelligence</h3>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Automated Speaker Identification</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Action Items & Decision Extraction</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Instant Outlook/Gmail Drafts</li>
                    </ul>
                </div>
            </div>

            {/* Zayna Notes Card */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText className="w-32 h-32 text-indigo-500" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                        <PenTool className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Zayna Notes</h3>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                        <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Real-time AI Dictation</li>
                        <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-500" /> Live Translation (15+ Languages)</li>
                        <li className="flex items-center gap-2"><Palette className="w-4 h-4 text-indigo-500" /> Smart Formatting & Page Colors</li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Privacy USP Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 text-left">
           <div className="glass-panel p-8 rounded-3xl border-t-4 border-sky-500 hover:transform hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-500/20 rounded-2xl flex items-center justify-center mb-6 text-sky-600 dark:text-sky-400">
                  <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Local Vault</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  Your transcripts and notes are stored encrypted in your browser's <code className="text-xs bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">localStorage</code>. 
                  We physically cannot access your saved meetings.
              </p>
           </div>
           
           <div className="glass-panel p-8 rounded-3xl border-t-4 border-indigo-500 hover:transform hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                  <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Ephemeral Processing</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  Audio is streamed to our AI for processing and <span className="font-bold text-indigo-600 dark:text-indigo-400">immediately discarded</span>. 
                  It is never stored, never logged, and never used to train models.
              </p>
           </div>

           <div className="glass-panel p-8 rounded-3xl border-t-4 border-emerald-500 hover:transform hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Auth Only</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  Our server integration is strictly limited to authentication. 
                  We track <em>who</em> you are, but never <em>what</em> you say.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Hero;
