import React, { useState, useEffect, useRef } from 'react';
import { Square, Pause, Play, AlertCircle, Maximize2, Minimize2, Mic, MicOff, Monitor } from 'lucide-react';
import { RecordingSource } from '../types';

interface RecorderProps {
  onStop: (blob: Blob) => void;
  source: RecordingSource;
}

const Recorder: React.FC<RecorderProps> = ({ onStop, source: recordingSource }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Guard against StrictMode double-invocation
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    setupRecording();
    
    return () => {
      cleanupResources();
      initRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupRecording = async () => {
    setError(null);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // CRITICAL FIX: Resume AudioContext if it's suspended (common browser policy)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const dest = audioCtx.createMediaStreamDestination();
      audioContextRef.current = audioCtx;

      if (recordingSource === 'screen') {
        setIsScreenSharing(true);
        
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            }, 
            audio: {
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false,
                sampleSize: 16,
                channelCount: 2
            } 
        });
        
        if (screenStream.getAudioTracks().length === 0) {
           setError("System audio missing! To record the meeting, you MUST check 'Share tab audio' or 'Share system audio' in the selection dialog.");
           screenStream.getTracks().forEach(t => t.stop());
           return;
        }

        let micStream: MediaStream | null = null;
        try {
           micStream = await navigator.mediaDevices.getUserMedia({ 
               audio: {
                   echoCancellation: true,
                   noiseSuppression: true
               } 
            });
           micStreamRef.current = micStream;
        } catch (e) {
            console.warn("Could not access mic, recording system audio only.");
        }

        const screenSource = audioCtx.createMediaStreamSource(screenStream);
        const screenGain = audioCtx.createGain();
        screenSource.connect(screenGain);
        screenGain.connect(dest);

        if (micStream) {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            const micGain = audioCtx.createGain();
            micSource.connect(micGain);
            micGain.connect(dest);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = screenStream;
        }

        const mixedAudioTrack = dest.stream.getAudioTracks()[0];
        const combinedStream = new MediaStream([mixedAudioTrack]);
        streamRef.current = screenStream; 

        if(micStream) {
            micStream.getTracks().forEach(t => streamRef.current?.addTrack(t));
        }

        startMediaRecorder(combinedStream, audioCtx);

      } else {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = micStream;
        
        const source = audioCtx.createMediaStreamSource(micStream);
        source.connect(dest);
        
        setupVisualizer(audioCtx, dest.stream);
        
        startMediaRecorder(dest.stream, audioCtx);
      }

    } catch (err: any) {
      console.error("Error setting up recording", err);
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
          setError("Recording cancelled. Please grant permissions and try again.");
      } else {
          setError("Could not connect to meeting feed. " + (err.message || "Permission denied."));
      }
    }
  };

  const startMediaRecorder = (stream: MediaStream, audioCtx: AudioContext) => {
      if (!analyserRef.current) {
         setupVisualizer(audioCtx, stream);
      }

      // Prioritize WebM for best compatibility with Gemini
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
      } else {
          console.warn("No specific mime type supported, using default");
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mimeType || chunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) {
            console.error("Recording produced 0 bytes.");
        }
        onStop(blob);
      };

      mediaRecorder.start(1000); 
      startTimer();
  };

  const setupVisualizer = (audioCtx: AudioContext, stream: MediaStream) => {
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; 
      const sourceForViz = audioCtx.createMediaStreamSource(stream);
      sourceForViz.connect(analyser);
      analyserRef.current = analyser;
      visualize();
  };

  const cleanupResources = () => {
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(e => console.warn(e));
      } catch (e) { /* ignore */ }
    }
    
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      startTimer();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPaused(true);
    }
  };

  const toggleMic = () => {
      if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach(track => {
              track.enabled = !isMuted;
          });
          setIsMuted(!isMuted);
      }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
        cleanupResources();
    }
  };

  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    if (!canvasCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, rect.width, rect.height);

      const barWidth = (rect.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * rect.height;
        
        const gradient = canvasCtx.createLinearGradient(0, rect.height, 0, rect.height - barHeight);
        gradient.addColorStop(0, '#0ea5e9'); // Sky 500
        gradient.addColorStop(1, '#6366f1'); // Indigo 500
        
        canvasCtx.fillStyle = gradient;
        
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, rect.height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
        canvasCtx.fill();

        x += barWidth + 2;
      }
    };
    draw();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 
        ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-900/10 dark:bg-red-900/20 rounded-xl border border-red-500/50">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-200 text-center mb-4 font-bold">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">Reset</button>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto space-y-6 animate-fade-in px-4">
      
      <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 ring-1 ring-black/5 dark:ring-white/10 group">
         
         {isScreenSharing ? (
             <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                   <Monitor className="w-4 h-4 text-sky-400" />
                   <span className="text-xs font-bold text-white uppercase tracking-wider">Live Feed</span>
                </div>
             </>
         ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative transition-colors duration-300">
                 <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950"></div>
                 <Mic className="w-24 h-24 text-slate-200 dark:text-slate-800 absolute z-0 opacity-50" />
                 <canvas ref={canvasRef} className="w-full h-full relative z-10 opacity-90" />
                 <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/10">
                   <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                   <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Microphone Mode</span>
                </div>
             </div>
         )}
         
         {/* Status Badge */}
         <div className="absolute top-4 right-4 flex items-center space-x-3">
            {isScreenSharing && (
                <button 
                  onClick={toggleMic}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md border transition-colors ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500 dark:text-red-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'}`}
                >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span className="text-xs font-bold">{isMuted ? 'Mic Off' : 'Mic On'}</span>
                </button>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 ${isPaused ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500' : 'bg-red-600/20 text-red-600 dark:text-red-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
                <span className="font-mono text-xs font-bold tracking-wider">
                    {isPaused ? 'PAUSED' : 'REC'}
                </span>
                <span className="font-mono text-xs font-bold border-l border-slate-500/30 pl-2">
                    {formatTime(recordingTime)}
                </span>
            </div>
         </div>

         {/* Overlay Controls */}
         <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between">
            <div className="text-white/80 text-sm">
                {isScreenSharing ? 'Capture active: Recording audio & video feed' : 'Listening to microphone input...'}
            </div>
            <div className="flex gap-4">
                 <button onClick={handlePauseResume} className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors text-white">
                     {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                 </button>
            </div>
         </div>
      </div>

      {/* Main Controls */}
      <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-2xl">
        <button
          onClick={handlePauseResume}
          className={`flex-1 w-full py-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 font-bold shadow-lg transform active:scale-95 ${
            isPaused 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          <span>{isPaused ? 'Resume Session' : 'Pause Session'}</span>
        </button>

        <button
          onClick={handleStop}
          className="flex-1 w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center space-x-3 transition-all duration-200 font-bold shadow-lg shadow-red-600/20 transform active:scale-95"
        >
          <Square className="w-5 h-5 fill-current" />
          <span>End Meeting</span>
        </button>
      </div>
      
      {isScreenSharing && (
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Embedding live feed from external window
        </div>
      )}
    </div>
  );
};

export default Recorder;