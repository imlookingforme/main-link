import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, X, Send, Mic, MicOff, Volume2, VolumeX,
  Sparkles, RefreshCw, ChevronRight, Shield, Globe
} from 'lucide-react';
import { generateCivicResponse } from '../services/civicAssistantEngine';

const QUICK_PROMPTS = [
  'PM Vidyalaxmi yojna kya hai?',
  'How to report a dangerous pothole?',
  'PM-KISAN ₹6,000 installment details',
  'Post-Matric Scholarship eligibility',
];

const LANG_OPTIONS = [
  { id: 'Hindi', label: '🇮🇳 हिन्दी / Hinglish', bcp47: 'hi-IN' },
  { id: 'Telugu', label: '🇮🇳 తెలుగు (Telugu)', bcp47: 'te-IN' },
  { id: 'Tamil', label: '🇮🇳 தமிழ் (Tamil)', bcp47: 'ta-IN' },
  { id: 'Kannada', label: '🇮🇳 ಕನ್ನಡ (Kannada)', bcp47: 'kn-IN' },
  { id: 'Bengali', label: '🇮🇳 বাংলা (Bengali)', bcp47: 'bn-IN' },
  { id: 'Marathi', label: '🇮🇳 मराठी (Marathi)', bcp47: 'mr-IN' },
  { id: 'Gujarati', label: '🇮🇳 ગુજરાતી (Gujarati)', bcp47: 'gu-IN' },
  { id: 'English', label: '🌐 English', bcp47: 'en-IN' },
];

const LANG_CODES = {
  Hindi: 'hi-IN',
  Telugu: 'te-IN',
  Tamil: 'ta-IN',
  Kannada: 'kn-IN',
  Bengali: 'bn-IN',
  Marathi: 'mr-IN',
  Gujarati: 'gu-IN',
  English: 'en-IN'
};

export default function CivicMitraSidecar({ initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [selectedLang, setSelectedLang] = useState('Hindi');
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `🙏 **Namaste! I am Civic Mitra (नागरिक मित्र)**\n\nYour 24/7 AI guide to Indian government welfare schemes, citizen rights, municipal laws, and civic hazard tracking.\n\n*Aap mujhse Hindi, Telugu, Tamil, ya English me kisi bhi sarkari yojana ke baare me pooch sakte hain!*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseInputRef = useRef('');
  const activeAudioRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Dynamically update speech recognition language when user changes dropdown
  useEffect(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.lang = LANG_CODES[selectedLang] || 'en-IN';
    }
  }, [selectedLang, isListening]);

  const handleSend = async (textToSend) => {
    const q = textToSend || input.trim();
    if (!q) return;

    const userMsg = {
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const res = await axios.post('/api/ai/chat', {
        question: q,
        preferredLanguage: selectedLang,
      });
      const replyText = res.data?.reply || res.data?.answer || res.data?.response || generateCivicResponse(q, selectedLang);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      const replyText = generateCivicResponse(q, selectedLang);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  // Fixed Non-Repeating Speech-to-Text with dynamic regional language
  const toggleSpeech = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please type your message.');
      return;
    }

    baseInputRef.current = input;
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODES[selectedLang] || 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        transcript += e.results[i][0].transcript;
      }
      if (!transcript.trim() && e.results.length > 0) {
        transcript = e.results[e.results.length - 1][0].transcript;
      }

      const cleanProgressiveStutter = (str) => {
        let s = str.trim();
        const words = s.split(/\s+/);
        for (let i = 1; i < words.length; i++) {
          const candidate = words.slice(i).join(' ');
          const prefix = words.slice(0, i).join(' ');
          if (candidate.startsWith(prefix) && candidate.length > prefix.length) {
            return cleanProgressiveStutter(candidate);
          }
        }
        return s;
      };

      const clean = cleanProgressiveStutter(transcript);
      const prefix = baseInputRef.current ? baseInputRef.current.trim() + ' ' : '';
      setInput((prefix + clean).trim());
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Multilingual Text-to-Speech (Neural edge-tts + Web Speech Fallback)
  const speakMessage = async (text, idx) => {
    if (speakingIdx === idx) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    setSpeakingIdx(idx);
    setIsSynthesizing(true);

    const clean = text.replace(/[*#_`\[\]()]/g, ' ').replace(/https?:\/\/\S+/g, '').trim();

    try {
      const res = await axios.post('/api/voice/synthesize', {
        text: clean,
        language: selectedLang,
      });

      if (res.data && res.data.audioUrl) {
        const audio = new Audio(res.data.audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => {
          setSpeakingIdx(null);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          fallbackBrowserSpeech(clean, selectedLang, idx);
        };
        await audio.play();
        setIsSynthesizing(false);
        return;
      }
    } catch {
      // Backend unavailable; fallback to browser TTS
    }

    setIsSynthesizing(false);
    fallbackBrowserSpeech(clean, selectedLang, idx);
  };

  const fallbackBrowserSpeech = (clean, lang, idx) => {
    if (!('speechSynthesis' in window)) {
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = LANG_CODES[lang] || 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* Floating Mascot Launcher Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indiaGreen to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white rounded-full shadow-2xl transition-all transform hover:scale-105 border border-green-400/40 group"
          title="Open Civic Mitra — Your 24/7 AI Civic & Government Guide"
        >
          <div className="relative">
            <span className="text-2xl">🏛️</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-saffron rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-saffron rounded-full" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
              <span>Civic Mitra</span>
              <span className="px-1.5 py-0.2 bg-black/40 rounded text-[9px] text-green-300 font-mono">नागरिक मित्र</span>
            </div>
            <div className="text-[10px] text-green-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Ask in Hindi, Telugu, Tamil, English</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-green-200 group-hover:translate-x-0.5 transition" />
        </button>
      )}

      {/* Docked Sidecar Drawer Window */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Civic Mitra Assistant"
          className="fixed bottom-0 right-0 top-0 sm:top-auto sm:bottom-6 sm:right-6 w-full sm:w-[420px] h-full sm:h-[630px] bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-emerald-950/80 to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indiaGreen to-emerald-800 flex items-center justify-center text-xl shadow border border-green-500/30">
                🏛️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">Civic Mitra</h3>
                  <span className="text-[10px] px-1.5 py-0.5 bg-indiaGreen/20 text-indiaGreen border border-indiaGreen/30 rounded font-semibold">
                    नागरिक मित्र
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Multilingual AI Welfare &amp; Civic Guide
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Regional Language Selector */}
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-800 text-gray-200 text-[11px] px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-indiaGreen cursor-pointer"
                title="Voice & Text Language"
              >
                {LANG_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg transition"
                title="Close Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'ai' && (
                  <div className="w-6 h-6 rounded-lg bg-emerald-900/60 border border-emerald-500/40 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    🏛️
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-saffron to-amber-600 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800/90 text-gray-100 border border-slate-700/80 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  <div>{m.content}</div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-700/40 text-[10px] text-gray-400">
                    <span>{m.timestamp}</span>
                    {m.role === 'ai' && (
                      <button
                        type="button"
                        onClick={() => speakMessage(m.content, idx)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                          speakingIdx === idx
                            ? 'bg-saffron text-slate-950 font-bold animate-pulse'
                            : 'hover:text-white hover:bg-slate-700/60'
                        }`}
                        title={`Listen in ${selectedLang}`}
                      >
                        {speakingIdx === idx ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        <span>{speakingIdx === idx ? 'Stop Voice' : `Listen (${selectedLang})`}</span>
                      </button>
                    )}
                  </div>
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-saffron text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    U
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3.5 py-2 border-t border-slate-800 bg-slate-900/50 flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[10px] text-gray-300 rounded-lg transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={toggleSpeech}
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white'
                }`}
                title={`Speech to Text (${selectedLang})`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask in ${selectedLang} or English...`}
                className="flex-1 bg-slate-900 text-gray-100 text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indiaGreen"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-gradient-to-r from-indiaGreen to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl disabled:opacity-40 transition"
                title="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
