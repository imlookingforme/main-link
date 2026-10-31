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

export default function CivicMitraSidecar({ initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `🙏 **Namaste! I am Civic Mitra (नागरिक मित्र)**\n\nYour 24/7 AI guide to Indian government welfare schemes, citizen rights, municipal laws, and civic hazard tracking. \n\n*Aap mujhse Hindi, English, ya Hinglish me kisi bhi sarkari yojana ke baare me pooch sakte hain!*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [selectedLang, setSelectedLang] = useState('Hindi');
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

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
      const replyText = res.data?.reply || res.data?.answer || res.data?.response || generateCivicResponse(q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      const replyText = generateCivicResponse(q);
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

  // Fixed Non-Repeating Speech-to-Text
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

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang === 'Hindi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (e) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (!finalTranscript && e.results[0]?.[0]?.transcript) {
        finalTranscript = e.results[0][0].transcript;
      }
      if (finalTranscript) {
        setInput((prev) => (prev ? prev + ' ' : '') + finalTranscript.trim());
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Text to Speech
  const speakMessage = (text, idx) => {
    if ('speechSynthesis' in window) {
      if (speakingIdx === idx) {
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
        return;
      }
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const clean = text.replace(/[*#_`\[\]()]/g, ' ').replace(/https?:\/\/\S+/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = /[\u0900-\u097F]/.test(clean) ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingIdx(null);
      utterance.onerror = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
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
              <span>Ask in Hindi / English</span>
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
          className="fixed bottom-0 right-0 top-0 sm:top-auto sm:bottom-6 sm:right-6 w-full sm:w-[410px] h-full sm:h-[620px] bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
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
                  24/7 AI Civic &amp; Welfare Guide
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Language Selector */}
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-800 text-gray-200 text-[11px] px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-indiaGreen"
                title="Voice Language"
              >
                <option value="Hindi">🇮🇳 हिन्दी / Hinglish</option>
                <option value="English">🌐 English</option>
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
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    🏛️
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indiaGreen text-white rounded-br-none shadow-md font-medium'
                      : 'bg-slate-800/90 text-gray-100 rounded-bl-none border border-slate-700/80 shadow'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700/40 text-[10px] text-gray-400">
                    <span>{m.timestamp}</span>
                    {m.role === 'ai' && (
                      <button
                        onClick={() => speakMessage(m.content, idx)}
                        className="flex items-center gap-1 hover:text-white text-emerald-400 transition ml-2"
                        title="Listen to this explanation"
                      >
                        {speakingIdx === idx ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        <span>{speakingIdx === idx ? 'Stop' : 'Listen'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Questions Strip */}
          <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-full text-[10px] border border-slate-700/80 transition"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleSpeech}
                className={`p-2.5 rounded-xl border transition ${
                  isListening
                    ? 'bg-red-900/40 border-red-500 text-red-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-gray-300 hover:text-white hover:bg-slate-700'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Speak your question'}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in Hindi, English, Hinglish..."
                className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-indiaGreen transition"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-indiaGreen hover:bg-green-700 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center shadow"
                title="Send Message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
