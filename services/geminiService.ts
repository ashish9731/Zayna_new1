import { GoogleGenAI } from "@google/genai";
import { MeetingMetadata, SentimentData, Note } from '../types';

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Normalize MIME types to ensure Gemini compatibility
const normalizeMimeType = (blobType: string): string => {
    let mime = blobType.split(';')[0].toLowerCase().trim();
    
    // Map common browser/file types to standard IANA types accepted by Gemini
    const mimeMap: Record<string, string> = {
        'audio/x-wav': 'audio/wav',
        'audio/vnd.wave': 'audio/wav',
        'audio/wave': 'audio/wav',
        'audio/mp3': 'audio/mpeg',
        'audio/x-m4a': 'audio/mp4',
        'audio/m4a': 'audio/mp4',
        'audio/x-mp4': 'audio/mp4',
        'audio/aac': 'audio/aac',
        'audio/x-aac': 'audio/aac',
        'audio/webm': 'audio/webm',
        'audio/ogg': 'audio/ogg',
        'audio/flac': 'audio/flac',
        'audio/x-flac': 'audio/flac'
    };

    if (mimeMap[mime]) {
        return mimeMap[mime];
    }
    
    // Fallback: If it starts with audio/, trust it, otherwise default to mp3 (common for uploads)
    return mime.startsWith('audio/') ? mime : 'audio/mpeg';
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Audio = await blobToBase64(audioBlob);

  // Normalize the MIME type
  const mimeType = normalizeMimeType(audioBlob.type);
  console.log(`[Gemini Service] Transcribing audio. Original Type: ${audioBlob.type}, Normalized: ${mimeType}, Size: ${audioBlob.size} bytes`);

  // Retry logic for 500 errors
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            },
            {
              text: `Transcribe this meeting audio. 
                     1. Identify different speakers (e.g., Speaker 1, Speaker 2) and prepend their labels to each turn.
                     2. Return the transcript in a clean, readable dialogue format.
                     3. Do NOT add any preamble or markdown code blocks, just the raw text.`
            }
          ]
        }
      });

      return response.text || "No transcription generated.";
    } catch (error: any) {
      attempts++;
      console.warn(`Transcription attempt ${attempts} failed:`, error);
      
      const isInternalError = error.message?.includes('500') || error.message?.includes('Internal error');
      
      if (attempts === maxAttempts || !isInternalError) {
        console.error("Final Transcription error:", error);
        if (isInternalError) {
             throw new Error("Gemini AI Processing Error (500). The audio format might be incompatible or silent. Please try recording again.");
        }
        throw new Error("Failed to transcribe audio. Please check your internet connection.");
      }
      
      // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
      await wait(1000 * Math.pow(2, attempts - 1));
    }
  }
  return "Failed to transcribe.";
};

export const generateMeetingMinutes = async (transcript: string, metadata: MeetingMetadata): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are Zayna, an expert executive assistant. Create a professional and actionable Meeting Minutes (MoM) document based on the provided transcript and meeting details.
    
    *** MEETING DETAILS ***
    Title: ${metadata.title}
    Agenda: ${metadata.agenda}
    Location: ${metadata.location}
    Date/Time: ${metadata.dateTime}
    Attendees: ${metadata.attendees}

    *** TRANSCRIPT ***
    ${transcript}

    *** INSTRUCTIONS FOR FORMATTING ***
    Produce the output in clean, structured Markdown. 
    
    STRICT RULES:
    1. **NO HALLUCINATIONS**: Only include information explicitly found in the transcript.
    2. **NO FAKE TASKS**: Action Items must be real tasks mentioned by speakers. If a task has no clear owner, mark it as "Unassigned".
    3. **TITLE HANDLING**: If the provided Title looks like a filename (e.g., "recovered_recording", "audio_123"), IGNORE it and title the document based on the actual topic discussed.
    4. **SIMPLE STRUCTURE**: Use a clean, professional structure without sales or coaching elements.

    Use the following structure:

    # (Insert Topic-Based Title Here)
    
    ## 1. Meeting Overview
    (A concise paragraph summarizing the main purpose and outcome of the meeting).

    ## 2. Key Discussion Points
    (Detailed bullet points of what was discussed, organized by topic).

    ## 3. Action Items
    (MUST be a Markdown Table with columns: **Task Description** | **Owner** | **Due Date**).

    ## 4. Decisions Made
    (List of agreements or final decisions).

    ## 5. Next Steps
    (What happens next and when).

    Tone: Professional, Clear, Concise, and Action-Oriented.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt
    });

    return response.text || "Failed to generate MoM.";
  } catch (error) {
    console.error("MoM generation error:", error);
    throw new Error("Failed to generate Meeting Minutes.");
  }
};

export const generateEmailDraft = async (mom: string, metadata: MeetingMetadata): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
    }
  
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
    const prompt = `
      You are a Strategic Chief of Staff. Write a high-level, intelligent follow-up email based on the meeting minutes provided below.
      
      *** MEETING CONTEXT ***
      Title: ${metadata.title}
      Date: ${metadata.dateTime}
      
      *** FULL MEETING MINUTES ***
      ${mom}
      
      *** INSTRUCTIONS ***
      1. **Persona**: Write as a strategic partner, not a robot. Be concise, authoritative, and forward-looking.
      2. **Structure**:
         - **STRATEGIC SUMMARY**: A 2-3 sentence executive synthesis of *why* this meeting mattered and the net outcome.
         - **KEY DECISIONS**: A clean list of what was agreed upon.
         - **IMMEDIATE ACTIONS**: High-priority tasks with owners.
         - **DETAILED MEETING RECORDS**: Paste the full depth of the meeting minutes below a separator line for reference.
      3. **Formatting**: 
         - DO NOT use Markdown bolding (**text**) or tables, as they break in some email clients. 
         - Use UPPERCASE HEADERS for sections.
         - Use standard dashes (-) for bullet points.
         - Ensure plenty of whitespace for readability.
         - Mention that the "Meeting Analytics Dashboard" image is attached to this email.
      4. **Sign-off**: "Generated by Zayna Intelligence".
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt
      });
  
      return response.text || "Please find the meeting minutes attached.";
    } catch (error) {
      console.error("Email generation error:", error);
      return "Here are the minutes from our meeting.";
    }
  };

export const translateText = async (text: string, targetLangName: string): Promise<string> => {
  if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
      Translate the following text into ${targetLangName}. 
      Input Text: "${text}"
      
      Instructions:
      1. Provide ONLY the translated text. 
      2. Do not add explanations, quotes, or notes.
      3. Maintain the original tone and meaning.
      4. If the text is already in ${targetLangName}, return it as is.
  `;

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
      });
      return response.text?.trim() || text;
  } catch (error) {
      console.error("Translation error:", error);
      return text;
  }
};

export const generateSentimentAnalysis = async (transcript: string): Promise<SentimentData> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        Act as an expert Behavioral Psychologist and Sales Coach. Analyze the following meeting transcript to extract not just the *text*, but the *subtext*.
        
        TRANSCRIPT:
        ${transcript.substring(0, 15000)} // Limit context if too long
        
        INSTRUCTIONS:
        Return a valid JSON object ONLY. No markdown code blocks. Structure:
        {
            "score": number (0-100, where 0 is very negative/hostile, 50 neutral, 100 very positive/excited),
            "label": string ("Positive", "Neutral", "Negative", "Mixed", "Tense", "Collaborative"),
            "speakerStats": [
                { "name": "Speaker 1", "percentage": number },
                { "name": "Speaker 2", "percentage": number }
            ],
            "emotions": [
                { "name": "Confidence", "value": number (0-100) },
                { "name": "Hesitation", "value": number (0-100) },
                { "name": "Excitement", "value": number (0-100) }
            ],
            "salesSignals": [
                // Extract 1-3 positive buying signals or agreements. E.g., "Client asked about implementation timeline", "Agreed to budget"
            ],
            "objections": [
                // Extract 1-3 hidden hesitations or risks. E.g., "Client used non-committal language about Q3", "Concerns about security"
            ],
            "coachingTips": [
                // Provide 1-3 direct coaching tips for the main speaker. E.g., "You interrupted the client 3 times.", "Good job handling the pricing objection.", "Try asking more open-ended questions."
            ]
        }
        Do not output anything else.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        const text = response.text || "{}";
        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Sentiment analysis error", error);
        // Fallback data
        return {
            score: 50,
            label: "Neutral",
            speakerStats: [{ name: "Speaker 1", percentage: 100 }],
            emotions: [{ name: "Neutral", value: 100 }],
            salesSignals: ["No signals detected"],
            objections: ["No objections detected"],
            coachingTips: ["Keep recording to generate insights."]
        };
    }
};

export const askZaynaAgent = async (query: string, context: { transcript: string, mom: string, notes: Note[] }): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepare context (limit length to avoid token limits)
    const notesContext = context.notes.map(n => `[Note: ${n.title}] ${n.content}`).join('\n').substring(0, 3000);
    const meetingContext = `TRANSCRIPT START:
${context.transcript.substring(0, 5000)}
TRANSCRIPT END

MINUTES:
${context.mom}`;

    const prompt = `
        You are Zayna, a private, intelligent executive assistant. 
        You have access to the user's current meeting data and their saved notes vault.
        
        USER QUERY: "${query}"
        
        CONTEXT FROM CURRENT MEETING:
        ${meetingContext}
        
        CONTEXT FROM SAVED NOTES VAULT:
        ${notesContext}
        
        INSTRUCTIONS:
        1. Answer the user's query directly and concisely based strictly on the provided context.
        2. If the answer is in the notes, cite the note title.
        3. If the answer is in the meeting, cite the speaker or section.
        4. If you don't know, say "I couldn't find that information in your current meeting or saved notes."
        5. Be helpful, professional, and friendly.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "I'm having trouble processing that request.";
    } catch (error) {
        return "Sorry, I'm currently offline or unable to reach the intelligence engine.";
    }
};