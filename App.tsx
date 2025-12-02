import React, { useState, useRef, useEffect } from 'react';
import Hero from './components/Hero';
import Recorder from './components/Recorder';
import Login from './components/Login';
import NotesView from './components/NotesView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AskZayna from './components/AskZayna';
import { transcribeAudio, generateMeetingMinutes, generateEmailDraft, generateSentimentAnalysis } from './services/geminiService';
import { AppStatus, MeetingMetadata, MeetingResult, RecordingSource } from './types';
import { Settings, MapPin, Loader2, Download, Mail, Home as HomeIcon, Edit3, Check, ArrowRight, AlertTriangle, PlusCircle, Users, Bell, Link as LinkIcon, Lock, StickyNote, Moon, Sun, Monitor, ChevronDown, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<AppStatus>(AppStatus.HOME);
  const [activeTab, setActiveTab] = useState<'HOME' | 'NOTES'>('HOME');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
      return (localStorage.getItem('theme') as Theme) || 'system';
  });

  // Auth Persistence (Local Storage based)
  useEffect(() => {
    const checkAuth = () => {
        const user = localStorage.getItem('zayna_user');
        if (user) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    };
    
    checkAuth();
    window.addEventListener('storage', checkAuth); // Listen for changes in other tabs
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
    } else {
        root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [metadata, setMetadata] = useState<MeetingMetadata>({
    title: '',
    agenda: '',
    location: '',
    dateTime: new Date().toLocaleString(),
    attendees: '',
    source: 'mic'
  });
  
  const [result, setResult] = useState<MeetingResult>({
    transcript: '',
    mom: '',
    emailDraft: '',
    sentiment: null,
    audioBlob: null
  });
  
  const [error, setError] = useState<string | null>(null);
  
  const [pendingAction, setPendingAction] = useState<{
      type: 'start' | 'upload' | 'note',
      payload: any
  } | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsThemeDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToTop = () => {
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    if (pendingAction) {
        if (pendingAction.type === 'start') initializeSetup(pendingAction.payload);
        else if (pendingAction.type === 'upload') processUpload(pendingAction.payload);
        else if (pendingAction.type === 'note') {
             setStatus(AppStatus.HOME);
             setActiveTab('NOTES');
        }
        setPendingAction(null);
    } else {
        setStatus(AppStatus.HOME);
    }
    scrollToTop();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('zayna_user');
      setIsAuthenticated(false);
      setStatus(AppStatus.HOME);
      setActiveTab('HOME');
      setPendingAction(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const initializeSetup = (source: RecordingSource) => {
    setMetadata({
        title: '',
        agenda: '',
        location: source === 'screen' ? 'Online' : 'Office',
        dateTime: new Date().toLocaleString(),
        attendees: '',
        source: source,
        platform: source === 'screen' ? 'zoom' : undefined
    });
    setStatus(AppStatus.SETUP);
    setActiveTab('HOME'); 
    scrollToTop();
  };

  const processUpload = async (file: File) => {
    let cleanTitle = file.name.replace(/\.[^/.]+$/, "");
    const lowerTitle = cleanTitle.toLowerCase();
    
    if (lowerTitle.includes('recovered_recording') || 
        lowerTitle.includes('audio_') || 
        lowerTitle.startsWith('recording')) {
        cleanTitle = `Meeting Recording - ${new Date().toLocaleDateString()}`;
    }

    setMetadata({
        title: cleanTitle, 
        agenda: 'Uploaded Audio Recording',
        location: 'Remote Upload',
        dateTime: new Date(file.lastModified).toLocaleString(),
        attendees: '',
        source: 'upload'
    });
    setResult(prev => ({ ...prev, audioBlob: file }));
    setStatus(AppStatus.PROCESSING_TRANSCRIPT);
    scrollToTop();
    try {
      const transcript = await transcribeAudio(file);
      setResult(prev => ({ ...prev, transcript, audioBlob: file }));
      setStatus(AppStatus.EDITING);
    } catch (e: any) {
      setError(e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStartSetup = (source: RecordingSource) => {
    if (!isAuthenticated) {
        setPendingAction({ type: 'start', payload: source });
        setStatus(AppStatus.AUTH);
        return;
    }
    initializeSetup(source);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!isAuthenticated) {
        setPendingAction({ type: 'upload', payload: file });
        setStatus(AppStatus.AUTH);
        return;
    }
    processUpload(file);
  };
  
  const handleNoteCreate = () => {
      if (!isAuthenticated) {
          setPendingAction({ type: 'note', payload: null });
          setStatus(AppStatus.AUTH);
          return;
      }
      setStatus(AppStatus.HOME);
      setActiveTab('NOTES');
      scrollToTop();
  };

  const handleStartRecording = () => {
    if (!metadata.title) {
      alert("Please enter a meeting name.");
      return;
    }
    
    if (metadata.source === 'screen' && metadata.meetingLink) {
       if (metadata.meetingLink.startsWith('http')) {
           window.open(metadata.meetingLink, '_blank', 'width=1200,height=800');
           alert("Zayna has launched your meeting.\n\nIn the next step, select the meeting window/tab to EMBED it directly into Zayna for recording.");
       } else {
           alert("Please ensure the meeting link starts with http:// or https://");
           return;
       }
    }

    setStatus(AppStatus.RECORDING);
    scrollToTop();
  };

  const handleRecordingStop = async (blob: Blob) => {
    setResult(prev => ({ ...prev, audioBlob: blob }));
    setStatus(AppStatus.PROCESSING_TRANSCRIPT);
    scrollToTop();
    try {
      const transcript = await transcribeAudio(blob);
      setResult(prev => ({ ...prev, transcript }));
      setStatus(AppStatus.EDITING);
    } catch (e: any) {
      setError(e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleSaveTranscript = async () => {
    setStatus(AppStatus.PROCESSING_MOM);
    scrollToTop();
    try {
      const mom = await generateMeetingMinutes(result.transcript, metadata);
      const emailDraft = await generateEmailDraft(mom, metadata);
      const sentiment = await generateSentimentAnalysis(result.transcript); // NEW: Generate Sentiment
      
      setResult(prev => ({ ...prev, mom, emailDraft, sentiment }));
      setStatus(AppStatus.COMPLETED);
    } catch (e: any) {
      setError(e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleHome = () => {
    setStatus(AppStatus.HOME);
    setActiveTab('HOME');
    setResult({ transcript: '', mom: '', emailDraft: '', sentiment: null, audioBlob: null });
    setError(null);
    scrollToTop();
  };

  const handleDownloadZip = async () => {
    if (!result.audioBlob) return;
    const zip = new JSZip();
    zip.file("transcript.txt", result.transcript);
    zip.file("meeting_minutes.md", result.mom);
    zip.file("email_draft.txt", result.emailDraft);
    
    // Add screenshot of analytics dashboard
    const dashboardElement = document.getElementById('analytics-dashboard');
    if (dashboardElement) {
        try {
            const canvas = await html2canvas(dashboardElement);
            const imgData = canvas.toDataURL('image/png');
            // Remove data:image/png;base64, header
            const base64Data = imgData.replace(/^data:image\/(png|jpg);base64,/, "");
            zip.file("analytics_dashboard.png", base64Data, {base64: true});
        } catch (err) {
            console.error("Failed to capture dashboard screenshot", err);
        }
    }

    const ext = result.audioBlob.type.includes('wav') ? 'wav' : 'webm';
    zip.file(`meeting_audio.${ext}`, result.audioBlob);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_zayna_package.zip`;
    a.click();
  };

  const handleDownloadAudioOnly = () => {
      if (!result.audioBlob) return;
      const url = URL.createObjectURL(result.audioBlob);
      const a = document.createElement("a");
      a.href = url;
      const ext = result.audioBlob.type.includes('wav') ? 'wav' : 'webm';
      a.download = `recording_${new Date().getTime()}.${ext}`;
      a.click();
  };

  const getGmailLink = () => {
    const cleanSubject = metadata.title.replace(/recovered_recording/gi, "Meeting");
    const subject = encodeURIComponent(`Minutes: ${cleanSubject}`);
    const body = encodeURIComponent(result.emailDraft);
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(metadata.attendees)}&su=${subject}&body=${body}`;
  };

  const getOutlookLink = () => {
      const cleanSubject = metadata.title.replace(/recovered_recording/gi, "Meeting");
      const subject = encodeURIComponent(`Minutes: ${cleanSubject}`);
      const body = encodeURIComponent(result.emailDraft);
      return `mailto:${metadata.attendees}?subject=${subject}&body=${body}`;
  };

  const showHero = status === AppStatus.HOME && activeTab === 'HOME';
  const showNotes = status === AppStatus.HOME && activeTab === 'NOTES';
  
  const getThemeIcon = () => {
      switch(theme) {
          case 'dark': return <Moon className="w-4 h-4" />;
          case 'light': return <Sun className="w-4 h-4" />;
          case 'system': return <Monitor className="w-4 h-4" />;
      }
  };
  
  const getThemeLabel = () => {
      switch(theme) {
          case 'dark': return 'Dark';
          case 'light': return 'Light';
          case 'system': return 'System';
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 transition-colors duration-300" ref={topRef}>
      
      {/* Ask Zayna Widget */}
      {isAuthenticated && (result.transcript || activeTab === 'NOTES') && (
          <AskZayna context={{ transcript: result.transcript, mom: result.mom }} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleHome}>
             <div className="flex items-center">
                 <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 tracking-tight">Zayna</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Main Nav (Desktop) */}
             <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => { setStatus(AppStatus.HOME); setActiveTab('HOME'); }}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'HOME' && status === AppStatus.HOME ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Home
                </button>
                <button 
                  onClick={handleNoteCreate}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'NOTES' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Notes
                </button>
             </nav>

             {/* Theme Dropdown */}
             <div className="relative" ref={dropdownRef}>
                 <button 
                    onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700"
                 >
                     {getThemeIcon()}
                     <span className="hidden md:inline">{getThemeLabel()}</span>
                     <ChevronDown className="w-3 h-3 opacity-50" />
                 </button>
                 
                 {isThemeDropdownOpen && (
                     <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in-up z-50">
                         <button onClick={() => { setTheme('light'); setIsThemeDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 ${theme === 'light' ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                             <Sun className="w-4 h-4" /> Light
                         </button>
                         <button onClick={() => { setTheme('dark'); setIsThemeDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 ${theme === 'dark' ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                             <Moon className="w-4 h-4" /> Dark
                         </button>
                         <button onClick={() => { setTheme('system'); setIsThemeDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 ${theme === 'system' ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                             <Monitor className="w-4 h-4" /> System
                         </button>
                     </div>
                 )}
             </div>

             {/* Logout Button */}
             {isAuthenticated && (
               <button 
                 onClick={handleLogout}
                 className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                 title="Log Out"
               >
                 <LogOut className="w-5 h-5" />
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-8">
        
        {showHero && <Hero onStart={handleStartSetup} onUpload={handleFileUpload} />}
        
        {showNotes && <NotesView />}

        {status === AppStatus.AUTH && <Login onLogin={handleLoginSuccess} />}

        {status === AppStatus.ERROR && (
          <div className="max-w-2xl mx-auto bg-red-100 dark:bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center animate-fade-in shadow-2xl mt-12">
            <div className="inline-flex bg-red-500/20 p-4 rounded-full mb-6">
                <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-2xl mb-2">Processing Error</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">{error}</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                {result.audioBlob && (
                    <button onClick={handleDownloadAudioOnly} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-6 py-3 rounded-xl text-slate-900 dark:text-white font-bold flex items-center justify-center">
                        <Download className="mr-2 w-5 h-5" /> Download Recording
                    </button>
                )}
                <button onClick={handleHome} className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-xl text-white font-bold transition-all">Try Again</button>
            </div>
          </div>
        )}

        {/* --- SETUP SCREEN --- */}
        {status === AppStatus.SETUP && (
          <div className="glass-panel p-6 md:p-10 rounded-3xl animate-fade-in border border-slate-200 dark:border-slate-700 max-w-3xl mx-auto bg-white/80 dark:bg-slate-900/80 mt-8 md:mt-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center text-slate-900 dark:text-white">
                <Settings className="mr-3 text-sky-500 w-8 h-8" /> 
                {metadata.source === 'screen' ? 'Connect to Meeting' : 'Live Meeting Setup'}
              </h2>
            </div>
            
            <div className="space-y-6">
              {metadata.source === 'screen' && (
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 space-y-4">
                   <div>
                      <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-300 mb-2 uppercase tracking-wider">Meeting Link / ID</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                        <input 
                          type="text" 
                          value={metadata.meetingLink || ''}
                          onChange={(e) => setMetadata({...metadata, meetingLink: e.target.value})}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white transition-all font-mono text-sm"
                          placeholder="https://zoom.us/j/..."
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Zayna will launch this link and embed the meeting window.</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-300 mb-2 uppercase tracking-wider">Platform</label>
                        <select 
                           value={metadata.platform} 
                           onChange={(e) => setMetadata({...metadata, platform: e.target.value as any})}
                           className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none"
                        >
                           <option value="zoom">Zoom</option>
                           <option value="teams">Microsoft Teams</option>
                           <option value="meet">Google Meet</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-300 mb-2 uppercase tracking-wider">Passcode (Optional)</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                            <input type="text" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="******" />
                        </div>
                     </div>
                   </div>
                </div>
              )}

              {/* Standard Metadata */}
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Meeting Title</label>
                <input 
                  type="text" 
                  value={metadata.title}
                  onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-4 focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white text-lg transition-all placeholder:text-slate-400"
                  placeholder="e.g., Weekly Product Sync"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Attendees (Emails)</label>
                <div className="relative">
                    <Users className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={metadata.attendees}
                      onChange={(e) => setMetadata({...metadata, attendees: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                      placeholder="alice@corp.com, bob@corp.com"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Agenda / Notes</label>
                <textarea 
                  value={metadata.agenda}
                  onChange={(e) => setMetadata({...metadata, agenda: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-4 focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white h-24 transition-all placeholder:text-slate-400"
                  placeholder="Topics to discuss..."
                />
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={handleStartRecording}
                  className="w-full md:w-auto bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-sky-500/20 transition-all transform hover:-translate-y-1 flex items-center justify-center text-lg"
                >
                  {metadata.source === 'screen' ? 'Launch & Embed Meeting' : 'Start Recording'} <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {(status === AppStatus.RECORDING || status === AppStatus.PAUSED) && (
          <div className="py-8 md:py-12">
            <Recorder onStop={handleRecordingStop} source={metadata.source} />
          </div>
        )}

        {status === AppStatus.PROCESSING_TRANSCRIPT && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in text-center px-4">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-sky-500 blur-2xl opacity-20 rounded-full animate-pulse-slow"></div>
                <Loader2 className="w-20 h-20 text-sky-500 animate-spin relative z-10" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Transcribing Audio...</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">Zayna is identifying speakers and converting speech to text.</p>
          </div>
        )}

        {status === AppStatus.EDITING && (
          <div className="glass-panel p-6 md:p-8 rounded-2xl animate-fade-in border border-slate-200 dark:border-slate-700 flex flex-col h-[80vh] max-w-5xl mx-auto bg-white/90 dark:bg-slate-900/90 mt-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Edit3 className="mr-3 text-sky-500" /> Review Transcript
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Make any necessary corrections before generating the final report.</p>
              </div>
              
              {result.audioBlob && (
                  <audio controls src={URL.createObjectURL(result.audioBlob)} className="w-full md:w-64 h-10" />
              )}
              
              <button 
                onClick={handleSaveTranscript}
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Check className="mr-2 w-5 h-5" /> Generate Minutes
              </button>
            </div>
            
            <textarea 
              value={result.transcript}
              onChange={(e) => setResult({...result, transcript: e.target.value})}
              className="flex-grow w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-slate-800 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none font-mono leading-relaxed"
            />
          </div>
        )}

        {status === AppStatus.PROCESSING_MOM && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in text-center px-4">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse-slow"></div>
                <Loader2 className="w-20 h-20 text-indigo-500 dark:text-indigo-400 animate-spin relative z-10" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Analysing Meeting Context...</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">Zayna is extracting action items, decisions, and drafting follow-up emails.</p>
          </div>
        )}

        {status === AppStatus.COMPLETED && (
          <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-24 mt-8">
            <div className="glass-panel p-4 rounded-2xl border border-sky-500/20 flex flex-col xl:flex-row items-center justify-between gap-4 sticky top-24 z-40 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white px-2">Ready to Export</h2>
               <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-wrap justify-center">
                 <button onClick={handleDownloadZip} className="flex items-center justify-center px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium transition-colors border border-slate-200 dark:border-slate-600">
                   <Download className="w-4 h-4 mr-2" /> Download Bundle
                 </button>
                 <a href={getGmailLink()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20">
                   <Mail className="w-4 h-4 mr-2" /> Open Gmail
                 </a>
                 <a href={getOutlookLink()} className="flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20">
                   <Mail className="w-4 h-4 mr-2" /> Open Outlook
                 </a>
                 <button onClick={handleHome} className="flex items-center justify-center px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-sky-500/20">
                    <PlusCircle className="w-4 h-4 mr-2" /> Start New
                 </button>
               </div>
            </div>

            {/* NEW: Analytics Dashboard */}
            {result.sentiment && (
                <div id="analytics-dashboard">
                    <AnalyticsDashboard data={result.sentiment} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-panel p-8 md:p-12 rounded-2xl border border-slate-200 dark:border-slate-700 min-h-[60vh] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl">
                   <div className="prose prose-slate max-w-none dark:prose-invert">
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.mom}</ReactMarkdown>
                   </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-300 mb-4 flex items-center">
                        <Mail className="w-5 h-5 mr-2" /> Generated Email Draft
                    </h3>
                    <div className="flex-grow bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[500px]">
                        {result.emailDraft}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 p-3 z-50 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur-lg">
          <button onClick={() => { setStatus(AppStatus.HOME); setActiveTab('HOME'); }} className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-colors ${activeTab === 'HOME' ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20' : 'text-slate-500 dark:text-slate-400'}`}>
              <HomeIcon className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-bold">Home</span>
          </button>
          <div className="w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <button onClick={handleNoteCreate} className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-colors ${activeTab === 'NOTES' ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20' : 'text-slate-500 dark:text-slate-400'}`}>
              <StickyNote className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-bold">Notes</span>
          </button>
      </div>
    </div>
  );
};

export default App;