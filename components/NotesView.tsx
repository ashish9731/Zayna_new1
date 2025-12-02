import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Mail, Mic, Save, FileText, Send, X, ArrowLeft, Globe, StopCircle, ChevronDown, Palette, Keyboard, Sparkles, Loader2 } from 'lucide-react';
import { Note } from '../types';
import { translateText } from '../services/geminiService';

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'hi-IN', name: 'Hindi (हिंदी)' },
    { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
    { code: 'te-IN', name: 'Telugu (తెలుగు)' },
    { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
    { code: 'mr-IN', name: 'Marathi (मराठी)' },
    { code: 'bn-IN', name: 'Bengali (বাংলা)' },
    { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ar-SA', name: 'Arabic' }
];

// Helper to determine text color (Black/White) based on background hex
const getContrastColor = (hexcolor: string) => {
    // If invalid hex, default to black text
    if (!hexcolor || hexcolor.length < 7) return '#000000';
    
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    
    // Calculate YIQ brightness
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // Return black for bright colors, white for dark colors
    return yiq >= 128 ? '#000000' : '#FFFFFF';
};

const NotesView: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>(() => {
        const saved = localStorage.getItem('zayna_notes');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedLang, setSelectedLang] = useState('en-US');
    const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    
    // Email State
    const [showEmailPanel, setShowEmailPanel] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailCC, setEmailCC] = useState('');

    // Refs for safe async access
    const recognitionRef = useRef<any>(null);
    const noteContentBeforeDictation = useRef<string>('');
    const shouldRestartRef = useRef(false);
    const selectedLangRef = useRef(selectedLang);
    const activeNoteRef = useRef<Note | undefined>(undefined);
    const activeNoteIdRef = useRef<string | null>(null);
    // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to avoid namespace error
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeNote = notes.find(n => n.id === activeNoteId);

    // Sync Refs
    useEffect(() => { activeNoteRef.current = activeNote; }, [activeNote]);
    useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
    useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);

    // Save on change
    useEffect(() => {
        localStorage.setItem('zayna_notes', JSON.stringify(notes));
    }, [notes]);

    // Stop recording if active note changes to prevent leakage
    useEffect(() => {
        if (isRecording) {
            stopDictation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeNoteId]);

    // Cleanup speech recognition on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // --- AUTO TRANSLATION LOGIC ---
    // Perform translation on the last sentence/line after user stops typing/speaking
    const performAutoTranslation = useCallback(async () => {
        if (!activeNoteRef.current || !isTranslationEnabled || isTranslating) return;

        const text = activeNoteRef.current.content;
        if (!text) return;

        // Find the last non-empty line
        const lines = text.split('\n');
        let lastLineIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().length > 0) {
                lastLineIndex = i;
                break;
            }
        }

        if (lastLineIndex === -1) return; // Empty content

        const lineToTranslate = lines[lastLineIndex];
        
        // Don't re-translate if it's very short or looks like just punctuation
        if (lineToTranslate.length < 2) return;

        setIsTranslating(true);

        try {
             // Find target language name
             const targetLangObj = LANGUAGES.find(l => l.code === selectedLangRef.current);
             const targetLangName = targetLangObj ? targetLangObj.name : 'English';

             // Call Gemini API
             const translatedText = await translateText(lineToTranslate, targetLangName);

             // Only update if translation is different (basic check to avoid loops)
             // and ensures we aren't overwriting user's backspacing
             if (translatedText.trim() !== lineToTranslate.trim()) {
                 const newLines = [...lines];
                 newLines[lastLineIndex] = translatedText;
                 const newContent = newLines.join('\n');
                 
                 // Check if content has changed significantly in the meantime (race condition)
                 if (activeNoteRef.current.content === text) {
                     setNotes(prevNotes => prevNotes.map(n => 
                        n.id === activeNoteIdRef.current 
                            ? { ...n, content: newContent, lastModified: new Date().toLocaleString() } 
                            : n
                    ));
                 }
             }
        } catch (e) {
            console.error("Auto Translate error", e);
        } finally {
            setIsTranslating(false);
        }

    }, [isTranslationEnabled, isTranslating]);

    // Watch for content changes to trigger debounce
    useEffect(() => {
        if (!isTranslationEnabled) return;
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Wait 1.5s after last edit to translate
        debounceTimerRef.current = setTimeout(() => {
            performAutoTranslation();
        }, 1500);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [activeNote?.content, isTranslationEnabled, performAutoTranslation]);


    const createNote = () => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: 'Untitled Page',
            content: '',
            lastModified: new Date().toLocaleString(),
            color: '#FFFFFF'
        };
        setNotes([newNote, ...notes]);
        setActiveNoteId(newNote.id);
        setShowEmailPanel(false);
    };

    const deleteNote = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotes(notes.filter(n => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
    };

    const updateNote = (updates: Partial<Note>) => {
        if (!activeNoteIdRef.current) return;
        setNotes(prevNotes => prevNotes.map(n => 
            n.id === activeNoteIdRef.current 
                ? { ...n, ...updates, lastModified: new Date().toLocaleString() } 
                : n
        ));
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        setSelectedLang(newLang);
        selectedLangRef.current = newLang;

        if (isRecording) {
            shouldRestartRef.current = true;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }
    };

    const toggleDictation = () => {
        if (isRecording) {
            stopDictation();
        } else {
            startDictation();
        }
    };

    const startDictation = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Your browser does not support live speech recognition. Please use Chrome, Edge, or Safari.");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLangRef.current;
        recognitionRef.current = recognition;
        
        const currentContent = activeNoteRef.current?.content || '';
        noteContentBeforeDictation.current = currentContent;
        
        if (currentContent && !currentContent.endsWith('\n') && !currentContent.endsWith(' ')) {
            noteContentBeforeDictation.current += ' ';
        }

        recognition.onstart = () => setIsRecording(true);

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            if (finalTranscript) {
                 noteContentBeforeDictation.current += finalTranscript + ' ';
            }

            if (activeNoteIdRef.current) {
                updateNote({ content: noteContentBeforeDictation.current + interimTranscript });
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') setIsRecording(false);
        };

        recognition.onend = () => {
            if (shouldRestartRef.current) {
                shouldRestartRef.current = false;
                startDictation();
            } else {
                setIsRecording(false);
                // Trigger translation immediately after dictation stops (if enabled)
                if (isTranslationEnabled) {
                     performAutoTranslation();
                }
            }
        };

        try {
            recognition.start();
        } catch (e) {
            setIsRecording(false);
        }
    };

    const stopDictation = () => {
        shouldRestartRef.current = false;
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsRecording(false);
    };

    const handleDirectSend = () => {
        if (!activeNote) return;
        const subject = encodeURIComponent(activeNote.title);
        const body = encodeURIComponent(activeNote.content);
        const to = encodeURIComponent(emailTo);
        const cc = encodeURIComponent(emailCC);
        
        window.location.href = `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
        setShowEmailPanel(false);
    };
    
    // Determine dynamic text color based on note background
    const textColor = activeNote?.color ? getContrastColor(activeNote.color) : '#000000';

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] animate-fade-in gap-4 max-w-7xl mx-auto pb-4 relative">
            
            {/* Sidebar */}
            <div className={`w-full md:w-64 glass-panel rounded-2xl border border-slate-200 dark:border-slate-700 flex-col overflow-hidden shrink-0 bg-white/80 dark:bg-slate-900/80 ${activeNoteId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button 
                        onClick={createNote}
                        className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> New Page
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {notes.map(note => (
                        <div 
                            key={note.id}
                            onClick={() => setActiveNoteId(note.id)}
                            className={`p-4 rounded-xl cursor-pointer group flex items-start justify-between transition-all border ${activeNoteId === note.id ? 'bg-white dark:bg-slate-800 border-sky-200 dark:border-sky-900 shadow-sm ring-1 ring-sky-500/20' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <div className="truncate pr-2">
                                <div className={`font-bold text-sm truncate ${activeNoteId === note.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200'}`}>{note.title || 'Untitled'}</div>
                                <div className="text-xs text-slate-400 mt-1 font-mono">{note.lastModified.split(',')[0]}</div>
                            </div>
                            <button 
                                onClick={(e) => deleteNote(note.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                            <FileText className="w-8 h-8 mb-2 opacity-20" />
                            No notes yet
                        </div>
                    )}
                </div>
            </div>

            {/* Main Editor Area */}
            {activeNote ? (
                <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-colors duration-500 relative ${activeNoteId ? 'flex' : 'hidden md:flex'}`} style={{ backgroundColor: activeNote.color || '#FFFFFF' }}>
                    
                    {/* Note Toolbar - Updated to be single row, nowrap, scrolling if needed */}
                    <div className="h-[64px] border-b flex flex-nowrap items-center justify-between px-4 bg-white/50 dark:bg-black/20 backdrop-blur-sm gap-4 overflow-x-auto no-scrollbar" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            <button onClick={() => setActiveNoteId(null)} className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 flex-shrink-0">
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            <div className="relative group flex-shrink-0" title="Page Color">
                                <div className="flex items-center justify-center p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-600">
                                    <input 
                                        type="color" 
                                        value={activeNote.color || '#FFFFFF'}
                                        onChange={(e) => updateNote({ color: e.target.value })}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Palette className="w-5 h-5 text-slate-700 dark:text-slate-200" style={{ color: textColor }} />
                                    <div className="w-3 h-3 rounded-full border border-white/50 shadow-sm ml-1.5 flex-shrink-0" style={{ backgroundColor: activeNote.color || '#FFFFFF' }}></div>
                                </div>
                            </div>

                             {/* Translation Toggle */}
                            <button 
                                onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap flex-shrink-0 ${isTranslationEnabled ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-transparent border-slate-300 dark:border-slate-500 text-slate-500'}`}
                                style={{ color: isTranslationEnabled ? undefined : textColor }}
                                title="Auto-translate last sentence when you stop typing/speaking"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Translate</span>
                            </button>
                            
                            {isTranslating && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-500 animate-pulse whitespace-nowrap flex-shrink-0">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span className="hidden sm:inline">Translating...</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 ml-auto flex-shrink-0">
                            <div className="relative group">
                                <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer">
                                    <Globe className="w-4 h-4 flex-shrink-0" style={{ color: textColor }} />
                                    <select 
                                        value={selectedLang}
                                        onChange={handleLanguageChange}
                                        className="bg-transparent border-none text-xs font-medium focus:outline-none appearance-none pr-4 cursor-pointer w-[80px] md:w-32 truncate"
                                        style={{ color: textColor }}
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code} className="text-black">{lang.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3 h-3 opacity-50 absolute right-2 pointer-events-none" style={{ color: textColor }} />
                                </div>
                            </div>

                            <button 
                                onClick={toggleDictation}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-bold text-sm flex-shrink-0 whitespace-nowrap ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-lg' : 'bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-slate-700'}`}
                                style={{ color: isRecording ? '#ffffff' : textColor }}
                                title={isRecording ? 'Stop Dictation' : 'Start Dictation'}
                            >
                                {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                <span className="hidden md:inline">{isRecording ? 'Listening...' : 'Dictate'}</span>
                            </button>

                            <div className="h-4 w-px bg-slate-400/30 mx-1 hidden md:block" />
                            
                            <button 
                                onClick={() => setShowEmailPanel(!showEmailPanel)} 
                                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${showEmailPanel ? 'bg-sky-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                style={{ color: showEmailPanel ? '#ffffff' : textColor }}
                                title="Send via Email"
                            >
                                <Mail className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Email Compose Panel */}
                    {showEmailPanel && (
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 animate-fade-in-up text-slate-900 dark:text-white">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Quick Send
                                </h4>
                                <button onClick={() => setShowEmailPanel(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-200" /></button>
                            </div>
                            
                            <div className="flex gap-3 mb-4">
                                <button onClick={() => { window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(activeNote.title)}&body=${encodeURIComponent(activeNote.content)}`, '_blank') }} className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg py-2 text-sm font-bold text-slate-700 shadow-sm transition-all">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>
                                    Gmail
                                </button>
                                <button onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(activeNote.title)}&body=${encodeURIComponent(activeNote.content)}` }} className="flex-1 flex items-center justify-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] border border-[#0078D4] rounded-lg py-2 text-sm font-bold text-white shadow-sm transition-all">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M1.05 13.96a.54.54 0 0 1-.03-.21V1.3a.54.54 0 0 1 .03-.22.51.51 0 0 1 .15-.2.53.53 0 0 1 .2-.12.55.55 0 0 1 .24-.03h12a.54.54 0 0 1 .23.03.54.54 0 0 1 .2.12.5.5 0 0 1 .14.2.51.51 0 0 1 .04.22v4.8h6.2a.51.51 0 0 1 .22.04.5.5 0 0 1 .2.14.54.54 0 0 1 .12.2.54.54 0 0 1 .03.23v16.1a.52.52 0 0 1-.03.22.5.5 0 0 1-.12.2.53.53 0 0 1-.2.12.54.54 0 0 1-.22.03h-12a.55.55 0 0 1-.24-.03.53.53 0 0 1-.2-.12.51.51 0 0 1-.15-.2.54.54 0 0 1-.03-.21v-4.8H1.67a.54.54 0 0 1-.22-.04.53.53 0 0 1-.2-.12.51.51 0 0 1-.14-.2zm19.8 8.4V6.9H14.7v15.46zm-7.4-8.4V1.9H2.27v12.06z"/></svg>
                                    Outlook
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-500">Or send directly</span>
                                </div>
                            
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 w-8">To:</span>
                                    <input 
                                        type="email" 
                                        value={emailTo}
                                        onChange={(e) => setEmailTo(e.target.value)}
                                        placeholder="recipient@example.com"
                                        className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 dark:text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 w-8">CC:</span>
                                    <input 
                                        type="email" 
                                        value={emailCC}
                                        onChange={(e) => setEmailCC(e.target.value)}
                                        placeholder="manager@example.com"
                                        className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 dark:text-white"
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={handleDirectSend}
                                        className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 shadow-sm"
                                    >
                                        <Send className="w-3 h-3" /> Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Editor Input */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                        <input 
                            value={activeNote.title}
                            onChange={(e) => updateNote({ title: e.target.value })}
                            className="text-2xl md:text-4xl font-bold bg-transparent border-none focus:outline-none w-full mb-4 placeholder:text-slate-400/50"
                            placeholder="Page Title"
                            style={{ color: textColor }}
                        />
                        <div className="text-xs mb-6 font-mono border-b border-black/5 dark:border-black/5 pb-4" style={{ color: textColor, opacity: 0.6 }}>{activeNote.lastModified}</div>
                        <textarea 
                            value={activeNote.content}
                            onChange={(e) => updateNote({ content: e.target.value })}
                            className="w-full h-[calc(100%-120px)] bg-transparent border-none focus:outline-none text-base md:text-lg leading-relaxed resize-none placeholder:text-slate-400/50 font-sans"
                            placeholder={isRecording ? "Listening... (Speak now)" : "Start typing... (To auto-translate: Enable AI Translate > Type > Stop Typing)"}
                            style={{ color: textColor }}
                        />
                    </div>
                </div>
            ) : (
                <div className={`flex-1 glass-panel rounded-2xl border border-slate-200 dark:border-slate-700 flex-col items-center justify-center text-slate-400 bg-white/50 dark:bg-slate-900/50 ${activeNoteId ? 'hidden md:flex' : 'hidden md:flex'}`}>
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a page or create a new one</p>
                </div>
            )}
        </div>
    );
};

export default NotesView;