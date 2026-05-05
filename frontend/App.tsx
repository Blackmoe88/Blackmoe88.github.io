import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Download, Settings, AlertCircle, Clock, Languages, X, User, ArrowRight, Volume2 } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from './audioUtils.ts';

// Initialize GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
const LIVE_API_MODEL_NAME = 'gemini-live-2.5-flash-native-audio';

interface TranscriptSegment {
  id: string;
  timestamp: string;
  sourceText: string;
  targetText: string;
}

// Comprehensive list of supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'zh-TW', name: 'Chinese (Cantonese)' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Estonian' },
  { code: 'tl', name: 'Filipino' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'jv', name: 'Javanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'ko', name: 'Korean' },
  { code: 'lo', name: 'Lao' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'my', name: 'Myanmar (Burmese)' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'es', name: 'Spanish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'zu', name: 'Zulu' }
];

// Display Settings Options
const BACKGROUND_COLORS = [
  { label: 'Pitch Black', value: 'bg-black' },
  { label: 'Dark Gray', value: 'bg-gray-900' },
  { label: 'Deep Navy', value: 'bg-blue-950' },
  { label: 'High Contrast White', value: 'bg-white' },
];

const TEXT_COLORS = [
  { label: 'Bright Yellow', value: 'text-yellow-400' },
  { label: 'Pure White', value: 'text-white' },
  { label: 'Neon Green', value: 'text-green-400' },
  { label: 'Solid Black', value: 'text-black' },
];

const FONT_SIZES = [
  { label: 'Normal', value: 'text-2xl lg:text-3xl xl:text-4xl' },
  { label: 'Large', value: 'text-3xl lg:text-4xl xl:text-5xl' },
  { label: 'Extra Large', value: 'text-4xl lg:text-5xl xl:text-6xl' },
];

const FONT_FAMILIES = [
  { label: 'Sans Serif (Default)', value: 'font-sans' },
  { label: 'Serif', value: 'font-serif' },
  { label: 'Monospace', value: 'font-mono' },
];

// Voice Profile Options for Smart Recognition
const VOICE_PROFILES = [
  { label: 'Standard Speech', value: 'standard' },
  { label: 'Deaf / Hard-of-Hearing Accent', value: 'deaf' },
  { label: 'Atypical / Motor Speech Difference', value: 'atypical' },
];

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  
  // Dual Language State
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [liveSourceCaption, setLiveSourceCaption] = useState('');
  const [liveTargetCaption, setLiveTargetCaption] = useState('');
  
  const [history, setHistory] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState('standard');
  const [playTranslationAudio, setPlayTranslationAudio] = useState(true);
  const [displaySettings, setDisplaySettings] = useState({
    bgColor: 'bg-black',
    textColor: 'text-yellow-400',
    fontSize: 'text-3xl lg:text-4xl xl:text-5xl',
    fontFamily: 'font-sans'
  });
  
  // Refs for managing state inside callbacks
  const currentSourceRef = useRef('');
  const currentTargetRef = useRef('');
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Input Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Output Audio Refs
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const liveCaptionEndRef = useRef<HTMLDivElement>(null);
  
  // Retry logic refs
  const retryCountRef = useRef(0);
  const isIntendedStopRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll live captions
  useEffect(() => {
    if (liveCaptionEndRef.current) {
      liveCaptionEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveSourceCaption, liveTargetCaption]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    isIntendedStopRef.current = true;
    retryCountRef.current = 0;
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Clean up input audio resources
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // Clean up output audio resources
    for (const source of audioSourcesRef.current.values()) {
      source.stop();
      source.disconnect();
    }
    audioSourcesRef.current.clear();
    
    if (outputNodeRef.current) {
      outputNodeRef.current.disconnect();
      outputNodeRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    sessionPromiseRef.current = null;

    // Flush any remaining transcription to history
    if (currentSourceRef.current.trim() || currentTargetRef.current.trim()) {
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        sourceText: currentSourceRef.current.trim(),
        targetText: currentTargetRef.current.trim()
      }]);
      currentSourceRef.current = '';
      currentTargetRef.current = '';
      setLiveSourceCaption('');
      setLiveTargetCaption('');
    }
  }, []);

  const handleConnectionError = useCallback(() => {
    if (isIntendedStopRef.current) return;
    
    // Disconnect current processing nodes but keep stream alive for retry
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    sessionPromiseRef.current = null;

    if (retryCountRef.current < 3) {
      const backoffTime = Math.pow(2, retryCountRef.current) * 1000;
      setError(`Connection lost. Retrying in ${backoffTime / 1000} seconds...`);
      retryCountRef.current += 1;
      
      retryTimeoutRef.current = setTimeout(() => {
        if (!isIntendedStopRef.current) {
          startRecording();
        }
      }, backoffTime);
    } else {
      setError('Connection failed after multiple attempts. Please try again later.');
      stopRecording();
    }
  }, [stopRecording]);

  const startRecording = async () => {
    isIntendedStopRef.current = false;
    setError(null);
    
    if (retryCountRef.current === 0) {
      setLiveSourceCaption('');
      setLiveTargetCaption('');
      currentSourceRef.current = '';
      currentTargetRef.current = '';
    }

    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Setup Input Audio Context
      if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      // Setup Output Audio Context
      if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);
        nextStartTimeRef.current = 0;
      }

      const sourceLangName = SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.name || 'English';
      const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'Spanish';

      // Construct smart recognition instructions based on voice profile
      let profileInstruction = "";
      if (voiceProfile === 'deaf') {
        profileInstruction = "The user has a deaf accent or speech pattern common among deaf and hard-of-hearing individuals. Please transcribe carefully, using context to resolve ambiguous pronunciations.";
      } else if (voiceProfile === 'atypical') {
        profileInstruction = "The user has atypical speech, dysarthria, or a motor speech difference. Please transcribe with high tolerance for variations in articulation and pacing, relying heavily on context to understand the intended words.";
      } else {
        profileInstruction = "The user has standard speech patterns.";
      }

      const sessionPromise = ai.live.connect({
        model: LIVE_API_MODEL_NAME,
        callbacks: {
          onopen: () => {
            setIsRecording(true);
            retryCountRef.current = 0;
            setError(null);
            
            if (sourceRef.current) sourceRef.current.disconnect();
            if (processorRef.current) processorRef.current.disconnect();

            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
            sourceRef.current = source;
            
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                }).catch(err => console.error("Error sending audio:", err));
              }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Source Transcription (Input)
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                currentSourceRef.current += text;
                setLiveSourceCaption(currentSourceRef.current);
              }
            }
            
            // Handle Target Transcription (Output)
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) {
                currentTargetRef.current += text;
                setLiveTargetCaption(currentTargetRef.current);
              }
            }
            
            // Handle Turn Completion
            if (message.serverContent?.turnComplete) {
              const finalSource = currentSourceRef.current;
              const finalTarget = currentTargetRef.current;
              
              if (finalSource.trim() || finalTarget.trim()) {
                setHistory(prev => [...prev, {
                  id: crypto.randomUUID(),
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  sourceText: finalSource.trim(),
                  targetText: finalTarget.trim()
                }]);
              }
              currentSourceRef.current = '';
              currentTargetRef.current = '';
              setLiveSourceCaption('');
              setLiveTargetCaption('');
            }

            // Handle Audio Output (Translated Speech)
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current && outputNodeRef.current) {
              try {
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  outputAudioContextRef.current.currentTime
                );
                
                const audioBuffer = await decodeAudioData(
                  decode(base64EncodedAudioString),
                  outputAudioContextRef.current,
                  24000,
                  1
                );
                
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                
                // Only connect to output if user wants to hear the translation
                if (playTranslationAudio) {
                  source.connect(outputNodeRef.current);
                }
                
                source.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
              } catch (err) {
                console.error("Error decoding/playing audio:", err);
              }
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              for (const source of audioSourcesRef.current.values()) {
                source.stop();
                source.disconnect();
              }
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live API Error:', e);
            handleConnectionError();
          },
          onclose: (e: CloseEvent) => {
            console.log('Live API Connection closed');
            if (!isIntendedStopRef.current) {
              handleConnectionError();
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are a real-time translation assistant for Deaf and hard-of-hearing users. The user will speak in ${sourceLangName}. ${profileInstruction} You MUST immediately translate everything they say into ${targetLangName} and speak the translation. Do not answer questions, do not add conversational filler. ONLY output the direct translation.`,
        },
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to start recording:", err);
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        setError("Could not access microphone. Please check permissions.");
        stopRecording();
      } else {
        handleConnectionError();
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const exportTranscript = () => {
    if (history.length === 0) return;
    
    const sourceLangName = SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.name || 'Source';
    const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'Target';

    const textContent = history.map(seg => 
      `[${seg.timestamp}]\n${sourceLangName}: ${seg.sourceText}\n${targetLangName}: ${seg.targetText}`
    ).join('\n\n');
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // Reusable Settings Select Component
  const SettingSelect = ({ label, options, value, onChange }: { label: string, options: any[], value: string, onChange: (val: string) => void }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const sourceLangName = SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.name || 'English';
  const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'Spanish';

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="flex-none bg-gray-900 border-b border-gray-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-md z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Mic className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white hidden lg:block">ClearCaption Live</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Language Selectors */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus-within:border-blue-500 transition-colors">
            <Languages className="w-5 h-5 text-gray-400 hidden sm:block" aria-hidden="true" />
            
            <select 
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              disabled={isRecording}
              className="bg-transparent text-white text-sm sm:text-base font-medium focus:outline-none cursor-pointer disabled:opacity-50 max-w-[100px] sm:max-w-[140px] truncate"
              aria-label="Select source language"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={`src-${lang.code}`} value={lang.code} className="bg-gray-800 text-white">
                  {lang.name}
                </option>
              ))}
            </select>

            <ArrowRight className="w-4 h-4 text-gray-500" aria-hidden="true" />

            <select 
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={isRecording}
              className="bg-transparent text-white text-sm sm:text-base font-medium focus:outline-none cursor-pointer disabled:opacity-50 max-w-[100px] sm:max-w-[140px] truncate"
              aria-label="Select target language"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={`tgt-${lang.code}`} value={lang.code} className="bg-gray-800 text-white">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={exportTranscript}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Export transcript to text file"
          >
            <Download className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Live Caption Area (Dual Display) */}
        <section 
          className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 relative gap-4"
          aria-label="Live Captions"
        >
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-start gap-3 text-red-200" role="alert">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-lg">{error}</p>
            </div>
          )}

          {/* Source Language Display */}
          <div className={`flex-1 rounded-2xl border-2 border-gray-800 p-6 overflow-y-auto shadow-inner relative flex flex-col transition-colors duration-300 ${displaySettings.bgColor}`}>
            <div className="absolute top-4 left-6 text-sm font-semibold tracking-wider uppercase text-gray-500 opacity-80">
              {sourceLangName} (Spoken)
            </div>
            
            {!isRecording && !liveSourceCaption && history.length === 0 && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center ${displaySettings.bgColor === 'bg-white' ? 'text-gray-400' : 'text-gray-600'}`}>
                <Mic className="w-16 h-16 mb-4 opacity-20" aria-hidden="true" />
                <p className="text-2xl font-medium">Ready to transcribe</p>
              </div>
            )}
            
            <div className="flex-1 flex flex-col justify-end pt-8" aria-live="polite" aria-atomic="false">
              {!liveSourceCaption && history.length > 0 && (
                 <p className={`font-bold leading-tight mb-2 opacity-50 transition-opacity duration-500 ${displaySettings.textColor} ${displaySettings.fontSize} ${displaySettings.fontFamily}`}>
                   {history[history.length - 1].sourceText}
                 </p>
              )}
              <p className={`font-bold leading-tight drop-shadow-md min-h-[2em] transition-all duration-300 ${displaySettings.textColor} ${displaySettings.fontSize} ${displaySettings.fontFamily}`}>
                {liveSourceCaption}
                {isRecording && (
                  <span className="inline-block w-2 h-[0.8em] ml-2 bg-current animate-pulse align-middle" aria-hidden="true"></span>
                )}
              </p>
            </div>
          </div>

          {/* Target Language Display */}
          <div className={`flex-1 rounded-2xl border-2 border-gray-800 p-6 overflow-y-auto shadow-inner relative flex flex-col transition-colors duration-300 ${displaySettings.bgColor}`}>
            <div className="absolute top-4 left-6 text-sm font-semibold tracking-wider uppercase text-gray-500 opacity-80">
              {targetLangName} (Translated)
            </div>
            
            {!isRecording && !liveTargetCaption && history.length === 0 && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center ${displaySettings.bgColor === 'bg-white' ? 'text-gray-400' : 'text-gray-600'}`}>
                <Languages className="w-16 h-16 mb-4 opacity-20" aria-hidden="true" />
                <p className="text-2xl font-medium">Waiting for translation</p>
              </div>
            )}
            
            <div className="flex-1 flex flex-col justify-end pt-8" aria-live="polite" aria-atomic="false">
              {!liveTargetCaption && history.length > 0 && (
                 <p className={`font-bold leading-tight mb-2 opacity-50 transition-opacity duration-500 ${displaySettings.textColor} ${displaySettings.fontSize} ${displaySettings.fontFamily}`}>
                   {history[history.length - 1].targetText}
                 </p>
              )}
              <p className={`font-bold leading-tight drop-shadow-md min-h-[2em] transition-all duration-300 ${displaySettings.textColor} ${displaySettings.fontSize} ${displaySettings.fontFamily}`}>
                {liveTargetCaption}
              </p>
              <div ref={liveCaptionEndRef} />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-2 flex justify-center">
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-3 sm:gap-4 px-8 sm:px-10 py-4 sm:py-5 rounded-full text-xl sm:text-2xl font-bold shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-gray-950 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500'
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              aria-pressed={isRecording}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
                  <span>Start Listening</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Transcript History Sidebar */}
        <aside 
          className="w-full lg:w-1/3 xl:w-1/4 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col h-64 lg:h-auto"
          aria-label="Transcript History"
        >
          <div className="p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-10 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-200">Transcript History</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center mt-10 text-lg italic">No history yet.</p>
            ) : (
              history.map((segment) => (
                <div key={segment.id} className="group bg-gray-800/50 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                      {segment.timestamp}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">{sourceLangName}</span>
                      <p className={`text-lg text-gray-300 leading-relaxed ${displaySettings.fontFamily}`}>
                        {segment.sourceText}
                      </p>
                    </div>
                    <div className="border-t border-gray-700/50 pt-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">{targetLangName}</span>
                      <p className={`text-lg text-gray-100 leading-relaxed ${displaySettings.fontFamily}`}>
                        {segment.targetText}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-900 pb-2 border-b border-gray-800">
              <h2 id="settings-title" className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-400" />
                Settings
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close settings"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Recognition Settings */}
              <section>
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />
                  Smart Recognition
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Select a voice profile to help the AI better understand specific speech patterns.
                </p>
                <SettingSelect
                  label="Voice Profile"
                  options={VOICE_PROFILES}
                  value={voiceProfile}
                  onChange={setVoiceProfile}
                />
              </section>

              <hr className="border-gray-800" />

              {/* Audio Settings */}
              <section>
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-green-400" />
                  Audio Output
                </h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={playTranslationAudio}
                      onChange={(e) => setPlayTranslationAudio(e.target.checked)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${playTranslationAudio ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${playTranslationAudio ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">Play translated speech audio</span>
                </label>
              </section>

              <hr className="border-gray-800" />

              {/* Display Settings */}
              <section>
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  Display Appearance
                </h3>
                <SettingSelect
                  label="Background Color"
                  options={BACKGROUND_COLORS}
                  value={displaySettings.bgColor}
                  onChange={(val) => setDisplaySettings(prev => ({ ...prev, bgColor: val }))}
                />
                
                <SettingSelect
                  label="Text Color"
                  options={TEXT_COLORS}
                  value={displaySettings.textColor}
                  onChange={(val) => setDisplaySettings(prev => ({ ...prev, textColor: val }))}
                />
                
                <SettingSelect
                  label="Font Size"
                  options={FONT_SIZES}
                  value={displaySettings.fontSize}
                  onChange={(val) => setDisplaySettings(prev => ({ ...prev, fontSize: val }))}
                />
                
                <SettingSelect
                  label="Font Family"
                  options={FONT_FAMILIES}
                  value={displaySettings.fontFamily}
                  onChange={(val) => setDisplaySettings(prev => ({ ...prev, fontFamily: val }))}
                />
              </section>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-800 flex justify-end sticky bottom-0 bg-gray-900">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
