
export enum AppStatus {
  HOME = 'HOME',
  AUTH = 'AUTH',
  NOTES = 'NOTES',
  SETUP = 'SETUP',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  PROCESSING_TRANSCRIPT = 'PROCESSING_TRANSCRIPT',
  EDITING = 'EDITING',
  PROCESSING_MOM = 'PROCESSING_MOM',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type RecordingSource = 'mic' | 'screen' | 'upload';

export interface MeetingMetadata {
  title: string;
  agenda: string;
  location: string;
  platform?: 'zoom' | 'teams' | 'meet' | 'other';
  meetingLink?: string;
  meetingId?: string;
  dateTime: string;
  attendees: string; // Comma separated emails
  source: RecordingSource;
}

export interface MoMData {
  summary: string;
  actionItems: string[];
  decisions: string[];
  attendees: string[]; 
  fullContent: string; 
}

export interface SentimentData {
  score: number; // 0 to 100 (Negative to Positive)
  label: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  speakerStats: { name: string; percentage: number }[];
  emotions: { name: string; value: number }[]; // e.g., "Confidence": 80
  salesSignals: string[]; // e.g., "Client asked about pricing tier"
  objections: string[]; // e.g., "Hesitation regarding implementation timeline"
  coachingTips: string[]; // e.g., "You spoke for 5 minutes straight. Try pausing."
}

export interface MeetingResult {
  transcript: string;
  mom: string; 
  emailDraft: string; 
  sentiment?: SentimentData | null;
  audioBlob: Blob | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}
