import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Upload, Mic, MicOff, RefreshCw, Send, AlertTriangle, CheckCircle,
  Clock, MapPin, Shield, ChevronDown, ChevronUp, X, LogIn, LogOut,
  FileText, Image, File, MessageSquare, BarChart3, Activity, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_COLORS = { Low: '#138808', Medium: '#EAB308', High: '#FF9933', Critical: '#EF4444' };
const PIE_COLORS = ['#138808', '#EAB308', '#FF9933', '#EF4444'];
const LANG_MAP = { English: 'en-IN', Hindi: 'hi-IN', Telugu: 'te-IN' };
const FILTER_TABS = ['All', 'Pending', 'Triaged', 'In Progress', 'Resolved', 'Critical'];
const EMPTY_STATE_MSG = 'No live grievances recorded yet — upload a civic hazard photo, policy PDF, CSV log, or text report to begin.';

const QUICK_QUESTIONS = [
  'Which department has the most critical unresolved issues?',
  'What are the current air quality conditions in my area?',
  'Explain my rights for water supply failures in Telugu',
  'How many grievances were filed this week?',
];

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all duration-300 ${
            t.type === 'success' ? 'bg-indiaGreen' : t.type === 'error' ? 'bg-red-600' : 'bg-navyBlue'
          }`}
        >
          {t.type === 'success' && <CheckCircle size={16} />}
          {t.type === 'error' && <AlertTriangle size={16} />}
          {t.type === 'info' && <Info size={16} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Dual Auth Modal (Google Citizen + Government GRO) ─────────────────────────

function AuthModal({ onClose, onLogin, initialTab = 'citizen' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'citizen' | 'official'
  const [googleEmail, setGoogleEmail] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [officialId, setOfficialId] = useState('');
  const [officialPassword, setOfficialPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Google Citizen Login
  const handleGoogleLogin = async (emailToUse, nameToUse) => {
    setLoading(true);
    setError('');
    try {
      const email = emailToUse || googleEmail;
      const name = nameToUse || citizenName || email.split('@')[0];
      const res = await axios.post('/api/auth/google-citizen', {
        email,
        name,
        googleId: `goog_${Date.now()}`,
      });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Google authorization failed. Please enter a valid email.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Official GRO Login
  const handleOfficialLogin = async (uname, pwd) => {
    setLoading(true);
    setError('');
    try {
      const id = uname || officialId;
      const pass = pwd || officialPassword;
      const res = await axios.post('/api/auth/login', {
        username: id,
        password: pass,
      });
      onLogin(res.data.token, res.data.officer);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Grievance Redressal authentication failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-cardBg border border-cardBorder rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 border-b border-cardBorder pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-saffron/20 text-saffron rounded-lg">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                main-link Authorization
              </h2>
              <p className="text-xs text-gray-400">
                Tiered Civic Intake &amp; Governance System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-darkBg p-1 rounded-xl mb-5 border border-cardBorder">
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'citizen'
                ? 'bg-indiaGreen text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="font-bold text-sm">G</span> Citizen Google Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('official');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'official'
                ? 'bg-saffron text-slate-900 shadow font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield size={14} /> Government Official (GRO)
          </button>
        </div>

        {/* TAB 1: CITIZEN GOOGLE ACCOUNT */}
        {activeTab === 'citizen' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs space-y-1">
              <div className="text-blue-300 font-bold flex items-center gap-1.5">
                <span>🛡️</span> Citizen Grievance Scope:
              </div>
              <p className="text-gray-300">
                Any verified Google account holder is authorized to report localized civic maintenance hazards (potholes, open drains, garbage overflow, water leaks, broken streetlights, toxic smoke).
              </p>
              <p className="text-amber-300/90 text-[11px] pt-1">
                ⚠️ Note: Proposals for major capital infrastructure (such as <strong>New Flyovers</strong> or Expressways) can only be commissioned by Government Officials.
              </p>
            </div>

            {/* Quick Demo 1-Click Google Accounts */}
            <div className="bg-darkBg/90 p-3 rounded-xl border border-cardBorder">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                1-Click Demo Google Authorization:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleGoogleLogin('raghuram@gmail.com', 'Raghuram (Citizen)')
                  }
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-cardBorder rounded-lg text-left transition flex items-center gap-2"
                >
                  <span className="text-red-400 font-bold text-sm">G</span>
                  <div>
                    <div className="text-xs font-bold text-gray-200">Raghuram</div>
                    <div className="text-[10px] text-gray-400 font-mono">raghuram@gmail.com</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleGoogleLogin('citizen.hyd@gmail.com', 'Priya Sharma (Resident)')
                  }
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-cardBorder rounded-lg text-left transition flex items-center gap-2"
                >
                  <span className="text-green-400 font-bold text-sm">G</span>
                  <div>
                    <div className="text-xs font-bold text-gray-200">Priya Sharma</div>
                    <div className="text-[10px] text-gray-400 font-mono">citizen.hyd@gmail.com</div>
                  </div>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGoogleLogin();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Or Sign in with your Google Email
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white focus:outline-none focus:border-indiaGreen text-xs"
                  placeholder="name@gmail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Citizen Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white focus:outline-none focus:border-indiaGreen text-xs"
                  placeholder="e.g. Ramesh Reddy"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indiaGreen hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <span className="font-bold">G</span>}
                {loading ? 'Verifying Google Account...' : 'Sign In with Google Account'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: GOVERNMENT OFFICIAL */}
        {activeTab === 'official' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-950/40 border border-saffron/30 rounded-xl text-xs space-y-1">
              <div className="text-saffron font-bold flex items-center gap-1.5">
                <Shield size={13} /> Official Authority Clearance:
              </div>
              <p className="text-gray-300">
                Authorized for All Civic Hazard Triages, <strong>Macro Capital Infrastructure Proposals (New Flyovers, Expressways, Urban Master Plans)</strong>, and Grievance Redressal Action Enforcement.
              </p>
            </div>

            {/* Quick Demo 1-Click Official Logins */}
            <div className="bg-darkBg/90 p-3 rounded-xl border border-cardBorder">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                1-Click Demo Official Authorization:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleOfficialLogin('admin', 'forge2026')}
                  className="p-2 bg-saffron/20 hover:bg-saffron/30 text-saffron border border-saffron/40 rounded-lg text-left transition"
                >
                  <div className="text-xs font-bold">Chief GRO</div>
                  <div className="text-[9px] text-gray-300">admin (Nodal)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleOfficialLogin('gro', 'redressal2026')}
                  className="p-2 bg-indiaGreen/20 hover:bg-indiaGreen/30 text-green-300 border border-indiaGreen/40 rounded-lg text-left transition"
                >
                  <div className="text-xs font-bold">Senior GRO</div>
                  <div className="text-[9px] text-gray-300">gro (Works)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleOfficialLogin('inspector', 'inspector2026')}
                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-left transition"
                >
                  <div className="text-xs font-bold">Inspector</div>
                  <div className="text-[9px] text-gray-300">inspector (Zonal)</div>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleOfficialLogin();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Officer ID / Registered Government Email
                </label>
                <input
                  type="text"
                  value={officialId}
                  onChange={(e) => setOfficialId(e.target.value)}
                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white focus:outline-none focus:border-saffron text-xs"
                  placeholder="admin or gro@main-link.gov.in"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Officer Security Password
                </label>
                <input
                  type="password"
                  value={officialPassword}
                  onChange={(e) => setOfficialPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white focus:outline-none focus:border-saffron text-xs"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-saffron hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                {loading ? 'Authorizing Officer...' : 'Access Official Redressal Console'}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px] text-gray-400">
              Need government credentials? Contact{' '}
              <a
                href="mailto:anomalyinspector@gmail.com"
                className="text-saffron hover:underline font-mono"
              >
                anomalyinspector@gmail.com
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Severity Bar ─────────────────────────────────────────────────────────────

function SeverityBar({ score }) {
  const s = Number(score) || 0;
  const color = s <= 3 ? 'bg-indiaGreen' : s <= 6 ? 'bg-yellow-500' : s <= 8 ? 'bg-saffron' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-darkBg rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${s * 10}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-300 w-8">{s}/10</span>
    </div>
  );
}

// ─── File Type Icon ───────────────────────────────────────────────────────────

function FileTypeIcon({ type }) {
  if (!type) return <File size={16} className="text-gray-400" />;
  const t = type.toLowerCase();
  if (t.includes('image') || t.includes('photo')) return <Image size={16} className="text-blue-400" />;
  if (t.includes('pdf')) return <FileText size={16} className="text-red-400" />;
  if (t.includes('csv')) return <BarChart3 size={16} className="text-green-400" />;
  return <FileText size={16} className="text-gray-400" />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // ── Toasts ──
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Unified Auth State (Citizen Google + Government Official) ──
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('citizen');

  const handleLogin = (tk, userData) => {
    setToken(tk);
    setCurrentUser(userData);
    setIsLoggedIn(true);
    setShowAuthModal(false);
    if (userData?.role === 'Official') {
      addToast(
        `Authorized Officer: ${userData?.name || 'GRO'} (${userData?.department || 'Municipal Administration'})`,
        'success'
      );
    } else {
      addToast(
        `Google Account Authorized: ${userData?.name || 'Citizen'} (Eligible for potholes & public hazards)`,
        'success'
      );
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    addToast('Signed out successfully', 'info');
  };

  // ── Location ──
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Detecting...');

  const detectLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocationLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setLocation({ lat: 17.5449, lon: 78.5718 });
          setLocationLabel('Hyderabad (fallback)');
        }
      );
    } else {
      setLocation({ lat: 17.5449, lon: 78.5718 });
      setLocationLabel('Hyderabad (fallback)');
    }
  }, []);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  // ── Telemetry ──
  const [telemetry, setTelemetry] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    if (!location) return;
    setTelemetryLoading(true);
    try {
      const res = await axios.get(`/api/telemetry/live?lat=${location.lat}&lon=${location.lon}`);
      setTelemetry(res.data);
    } catch {
      setTelemetry(null);
    } finally {
      setTelemetryLoading(false);
    }
  }, [location]);

  useEffect(() => { fetchTelemetry(); }, [fetchTelemetry]);

  // ── Grievances ──
  const [grievances, setGrievances] = useState([]);
  const [grievancesLoading, setGrievancesLoading] = useState(false);

  const fetchGrievances = useCallback(async () => {
    setGrievancesLoading(true);
    try {
      const res = await axios.get('/api/grievances');
      setGrievances(Array.isArray(res.data) ? res.data : res.data.grievances || []);
    } catch {
      // silently fail, keep existing data
    } finally {
      setGrievancesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrievances();
    const interval = setInterval(fetchGrievances, 30000);
    return () => clearInterval(interval);
  }, [fetchGrievances]);

  // ── Analytics ──
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get('/api/grievances/analytics');
      setAnalytics(res.data);
    } catch {
      setAnalytics(null);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // ── Submission Form ──
  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast('Voice input not supported in this browser', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_MAP[preferredLanguage] || 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setTextInput((prev) => (prev ? prev + ' ' : '') + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      addToast('Voice recognition error', 'error');
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile && !textInput.trim()) {
      addToast('Please provide a file or text description', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      if (textInput.trim()) formData.append('text', textInput.trim());
      const lat = manualLat || location?.lat || 17.5449;
      const lon = manualLon || location?.lon || 78.5718;
      formData.append('lat', lat);
      formData.append('lon', lon);
      formData.append('preferredLanguage', preferredLanguage);

      // Identity & Scope Enforcement:
      // Citizens with Google accounts are authorized for localized hazards (potholes, water leaks, waste, streetlights).
      // Macro Capital Infrastructure proposals (such as New Flyovers) require Official clearance.
      formData.append('userRole', currentUser?.role || 'Citizen');
      formData.append('userName', currentUser?.name || 'Verified Citizen');
      formData.append('userEmail', currentUser?.email || '');
      formData.append('authProvider', currentUser?.authProvider || 'google');

      await axios.post('/api/grievances/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      addToast('Grievance submitted and triaged successfully!', 'success');
      setSelectedFile(null);
      setTextInput('');
      setManualLat('');
      setManualLon('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchGrievances();
      fetchAnalytics();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.policyViolation) {
        addToast(
          err.response.data.error,
          'error'
        );
      } else {
        addToast(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Submission failed. Please try again.',
          'error'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status Update & Action Taken Report (Grievance Redressal) ──
  const handleStatusUpdate = async (id, newStatus, remarks = '') => {
    try {
      const res = await axios.patch(
        `/api/grievances/${id}/status`,
        { status: newStatus, redressalRemarks: remarks },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      addToast(
        res.data.message || `Redressal updated: "${newStatus}"`,
        'success'
      );
      fetchGrievances();
      fetchAnalytics();
    } catch (err) {
      addToast(
        err.response?.data?.error || 'Grievance redressal update failed',
        'error'
      );
    }
  };

  // ── Triage Filter ──
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredGrievances = grievances
    .filter((g) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Critical') return (g.urgency || '').toLowerCase() === 'critical';
      return (g.status || '') === activeFilter;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // ── Collapsible state for grievance cards ──
  const [expandedCards, setExpandedCards] = useState({});
  const toggleCard = (id, field) => {
    setExpandedCards((prev) => ({ ...prev, [`${id}-${field}`]: !prev[`${id}-${field}`] }));
  };

  // ── AI Chat ──
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLanguage, setChatLanguage] = useState('English');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = async (question) => {
    const q = question || chatInput.trim();
    if (!q) return;
    setChatMessages((prev) => [...prev, { role: 'user', content: q }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await axios.post('/api/ai/chat', {
        question: q,
        preferredLanguage: chatLanguage,
        lat: location?.lat,
        lon: location?.lon,
      });
      setChatMessages((prev) => [...prev, { role: 'ai', content: res.data.answer || res.data.response || JSON.stringify(res.data) }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I could not process your request. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Helpers ──
  const getSlaRemaining = (createdAt, slaHours) => {
    if (!createdAt || !slaHours) return null;
    const deadline = new Date(createdAt).getTime() + slaHours * 3600000;
    const remaining = deadline - Date.now();
    return remaining;
  };

  const pm25Color = (val) => {
    if (val == null) return 'text-gray-400';
    if (val < 25) return 'text-indiaGreen';
    if (val < 50) return 'text-yellow-400';
    if (val < 100) return 'text-saffron';
    return 'text-red-500';
  };

  const aqiColor = (val) => {
    if (val == null) return 'text-gray-400';
    if (val <= 25) return 'text-indiaGreen';
    if (val <= 50) return 'text-yellow-400';
    if (val <= 75) return 'text-saffron';
    if (val <= 100) return 'text-red-500';
    return 'text-purple-500';
  };

  const aqiLabel = (val) => {
    if (val == null) return '';
    if (val <= 25) return 'Good';
    if (val <= 50) return 'Fair';
    if (val <= 75) return 'Moderate';
    if (val <= 100) return 'Poor';
    return 'Very Poor';
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-darkBg text-gray-200">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          initialTab={authModalTab}
        />
      )}

      {/* ── A. Tricolor Top Bar ── */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)' }} />

      {/* ── B. Header ── */}
      <header className="bg-cardBg border-b border-cardBorder">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <span>🏛️</span>
              <span>
                <span className="text-saffron">main</span>-<span className="text-indiaGreen">link</span>
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Transparent Civic Grievance Triage &amp; Multilingual Policy Accountability</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isLoggedIn ? (
              <div className="flex items-center gap-3 bg-darkBg/70 px-3.5 py-1.5 rounded-xl border border-cardBorder">
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                    {currentUser?.role === 'Official' ? (
                      <Shield size={14} className="text-saffron" />
                    ) : (
                      <span className="text-green-400 font-bold text-xs">G</span>
                    )}
                    {currentUser?.name || 'Authorized User'}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {currentUser?.role === 'Official'
                      ? `${currentUser.badgeNumber ? `${currentUser.badgeNumber} • ` : ''}${currentUser.role}`
                      : 'Google Verified Citizen'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-xs font-medium transition"
                >
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthModalTab('citizen');
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indiaGreen hover:bg-green-700 text-white rounded-lg font-medium text-xs transition shadow"
                >
                  <span className="font-bold">G</span> Sign in with Google
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab('official');
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-saffron/20 border border-saffron/40 text-saffron hover:bg-saffron/30 rounded-lg font-medium text-xs transition"
                >
                  <Shield size={14} /> Official GRO
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── C. Telemetry Bar ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity size={20} className="text-saffron" /> Live Environmental Telemetry
            </h2>
            <button
              onClick={fetchTelemetry}
              disabled={telemetryLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cardBg border border-cardBorder rounded-lg hover:bg-slate-700 text-sm text-gray-300 disabled:opacity-50"
            >
              <RefreshCw size={14} className={telemetryLoading ? 'animate-spin' : ''} /> Refresh Telemetry
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              { icon: '🌡️', label: 'Temperature', value: telemetry?.temperature != null ? `${telemetry.temperature}°C` : null, color: 'text-white' },
              { icon: '💧', label: 'Precipitation', value: telemetry?.precipitation != null ? `${telemetry.precipitation} mm` : null, color: 'text-white' },
              { icon: '💨', label: 'Wind Speed', value: telemetry?.windSpeed != null ? `${telemetry.windSpeed} km/h` : null, color: 'text-white' },
              { icon: '🫁', label: 'PM2.5', value: telemetry?.pm25 != null ? `${telemetry.pm25} μg/m³` : null, color: pm25Color(telemetry?.pm25) },
              { icon: '🏭', label: 'PM10', value: telemetry?.pm10 != null ? `${telemetry.pm10} μg/m³` : null, color: 'text-white' },
              { icon: '🌍', label: 'European AQI', value: telemetry?.europeanAqi != null ? `${telemetry.europeanAqi} (${aqiLabel(telemetry.europeanAqi)})` : null, color: aqiColor(telemetry?.europeanAqi) },
              { icon: '📍', label: 'Location', value: telemetry?.location || locationLabel, color: 'text-white' },
            ].map((item, i) => (
              <div key={i} className="bg-cardBg border border-cardBorder rounded-lg p-3 text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className={`text-sm font-semibold ${item.color}`}>
                  {item.value ?? 'Telemetry unavailable'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── D. Multimodal Submission ── */}
        <section className="bg-cardBg border border-cardBorder rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              📤 Submit Civic Grievance / Policy Query
            </h2>
            <div className="text-xs text-gray-400">
              Citizens (Google) ➔ Local Hazards • Officials ➔ Capital Infrastructure &amp; Redressal
            </div>
          </div>

          {/* Submitter Authorization & Scope Ribbon */}
          <div className="mb-4 p-3 bg-darkBg/80 border border-cardBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              {isLoggedIn ? (
                currentUser?.role === 'Official' ? (
                  <div className="p-1.5 bg-saffron/20 text-saffron rounded-lg">
                    <Shield size={20} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-indiaGreen font-bold flex items-center justify-center border border-indiaGreen/40 text-sm">
                    G
                  </div>
                )
              ) : (
                <div className="p-1.5 bg-gray-700/50 text-gray-400 rounded-lg">
                  <Info size={20} />
                </div>
              )}
              <div>
                <div className="font-semibold text-white flex items-center gap-2">
                  {isLoggedIn
                    ? currentUser?.role === 'Official'
                      ? `Authorized Official: ${currentUser.name} (${currentUser.role || 'GRO'})`
                      : `Verified Google Account: ${currentUser.name} (Citizen)`
                    : 'Unverified Submitter'}
                  {isLoggedIn && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-normal bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                      {currentUser?.role === 'Official' ? 'GOVT AUTHORIZED' : 'GOOGLE AUTHORIZED'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {isLoggedIn && currentUser?.role === 'Official'
                    ? 'Authorized for all maintenance hazards + macro capital proposals (New Flyovers, Expressways, Master Plans).'
                    : 'Authorized to report localized hazards (potholes, water leaks, waste, streetlights). Major capital proposals (e.g. New Flyovers) require Government clearance.'}
                </p>
              </div>
            </div>
            {!isLoggedIn ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('citizen');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 bg-indiaGreen hover:bg-green-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition shadow"
                >
                  <span className="font-bold">G</span> Sign in with Google
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left column: file + text */}
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-saffron bg-saffron/10' : 'border-cardBorder hover:border-gray-500'
                }`}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-white">
                    <FileTypeIcon type={selectedFile.type || selectedFile.name} />
                    <span>{selectedFile.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 hover:text-red-300">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Drag &amp; drop a file or <span className="text-saffron underline">browse</span><br />(.png, .jpg, .jpeg, .pdf, .csv)</p>
                )}
                <input
                  ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,.csv"
                  onChange={handleFileSelect} className="hidden"
                />
              </div>

              {/* Text area + voice */}
              <div className="relative">
                <textarea
                  value={textInput} onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Describe a civic issue, paste a policy question, or use voice input..."
                  rows={4}
                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-saffron resize-none"
                />
                <button
                  onClick={isListening ? stopVoice : startVoice}
                  className={`absolute bottom-3 right-3 p-2 rounded-full transition ${
                    isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-cardBorder text-gray-300 hover:bg-slate-600'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
              {isListening && <p className="text-sm text-red-400 animate-pulse flex items-center gap-1"><Mic size={14} /> Listening...</p>}
            </div>

            {/* Right column: options + submit */}
            <div className="space-y-4">
              {/* Language */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Language</label>
                <select
                  value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white focus:outline-none focus:border-saffron"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Telugu</option>
                </select>
              </div>

              {/* GPS */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <div className="flex gap-2">
                  <button
                    onClick={detectLocation}
                    className="flex items-center gap-1.5 px-3 py-2 bg-navyBlue/30 text-blue-300 rounded-lg hover:bg-navyBlue/50 text-sm flex-shrink-0"
                  >
                    <MapPin size={14} /> Auto-Detect GPS
                  </button>
                  <input
                    type="text" placeholder="Lat" value={manualLat} onChange={(e) => setManualLat(e.target.value)}
                    className="flex-1 px-2 py-2 bg-darkBg border border-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-saffron"
                  />
                  <input
                    type="text" placeholder="Lon" value={manualLon} onChange={(e) => setManualLon(e.target.value)}
                    className="flex-1 px-2 py-2 bg-darkBg border border-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-saffron"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">📍 Current: {locationLabel}</p>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-indiaGreen hover:bg-green-700 text-white rounded-xl font-bold text-base transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? <RefreshCw size={18} className="animate-spin" /> : <span>🚀</span>}
                {submitting ? 'Extracting & Triaging...' : 'Extract & Triage with AI'}
              </button>
            </div>
          </div>
        </section>

        {/* ── E. Analytics Dashboard ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 size={20} className="text-saffron" /> Analytics Dashboard
          </h2>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { icon: '📊', label: 'Total Active Issues', value: analytics?.totalActive ?? '—', bg: 'bg-saffron/20', border: 'border-saffron/40', textColor: 'text-saffron' },
              { icon: '🚨', label: 'Critical Hazards', value: analytics?.criticalCount ?? '—', bg: 'bg-red-600/20', border: 'border-red-600/40', textColor: 'text-red-400' },
              { icon: '📈', label: 'Avg Severity', value: analytics?.averageSeverity != null ? Number(analytics.averageSeverity).toFixed(1) : '—', bg: 'bg-navyBlue/30', border: 'border-navyBlue/50', textColor: 'text-blue-300' },
              { icon: '✅', label: 'SLA Compliance', value: analytics?.slaCompliance != null ? `${analytics.slaCompliance}%` : '—', bg: 'bg-indiaGreen/20', border: 'border-indiaGreen/40', textColor: 'text-indiaGreen' },
            ].map((kpi, i) => (
              <div key={i} className={`${kpi.bg} border ${kpi.border} rounded-xl p-4`}>
                <div className="text-2xl mb-1">{kpi.icon}</div>
                <div className="text-xs text-gray-400">{kpi.label}</div>
                <div className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart: Category Breakdown */}
            <div className="bg-cardBg border border-cardBorder rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Category Breakdown</h3>
              {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.categoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-20} textAnchor="end" height={60} interval={0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                    <Bar dataKey="count" fill="#FF9933" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No data to visualize yet</div>
              )}
            </div>

            {/* Pie Chart: Urgency Distribution */}
            <div className="bg-cardBg border border-cardBorder rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Urgency Distribution</h3>
              {analytics?.urgencyBreakdown && analytics.urgencyBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.urgencyBreakdown}
                      dataKey="count"
                      nameKey="urgency"
                      cx="50%" cy="50%"
                      outerRadius={90}
                      label={({ urgency, count }) => `${urgency}: ${count}`}
                    >
                      {analytics.urgencyBreakdown.map((entry, idx) => (
                        <Cell key={idx} fill={URGENCY_COLORS[entry.urgency] || PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No data to visualize yet</div>
              )}
            </div>
          </div>
        </section>

        {/* ── F. Triage Feed ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            📋 Live Civic Triage Feed
            {grievancesLoading && <RefreshCw size={14} className="animate-spin text-saffron" />}
          </h2>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeFilter === tab
                    ? 'bg-saffron text-darkBg'
                    : 'bg-cardBg border border-cardBorder text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Grievance Cards */}
          {filteredGrievances.length === 0 ? (
            <div className="bg-cardBg border border-cardBorder rounded-xl p-8 text-center">
              <Upload size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">{EMPTY_STATE_MSG}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-1">
              {filteredGrievances.map((g) => {
                const slaMs = getSlaRemaining(g.createdAt, g.slaHours);
                const slaBreach = slaMs !== null && slaMs <= 0;
                const slaHrsLeft = slaMs !== null ? Math.max(0, Math.round(slaMs / 3600000 * 10) / 10) : null;

                return (
                  <div key={g._id || g.id} className="bg-cardBg border border-cardBorder rounded-xl p-4 hover:border-slate-500 transition">
                    {/* Top row */}
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Urgency badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                            g.urgency === 'Critical' ? 'bg-red-600 animate-pulse-red' :
                            g.urgency === 'High' ? 'bg-saffron' :
                            g.urgency === 'Medium' ? 'bg-yellow-600' : 'bg-indiaGreen'
                          }`}
                        >
                          {g.urgency || 'Unknown'}
                        </span>
                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          g.status === 'Resolved' ? 'bg-indiaGreen/20 text-green-400' :
                          g.status === 'In Progress' ? 'bg-blue-600/20 text-blue-300' :
                          g.status === 'Triaged' ? 'bg-saffron/20 text-saffron' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {g.status || 'Pending'}
                        </span>
                        {/* Authenticity */}
                        {g.authenticityCheck && (
                          <span className="flex items-center gap-1 text-xs text-indiaGreen">
                            <Shield size={12} /> {typeof g.authenticityCheck === 'string' ? g.authenticityCheck : 'Verified'}
                          </span>
                        )}
                        {/* Source type */}
                        <FileTypeIcon type={g.sourceType || g.fileType} />
                      </div>
                      {/* SLA */}
                      {slaMs !== null && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${slaBreach ? 'text-red-400' : 'text-gray-400'}`}>
                          {slaBreach ? (
                            <><AlertTriangle size={12} /> ⚠️ SLA BREACHED</>
                          ) : (
                            <><Clock size={12} /> ⏰ {slaHrsLeft} hrs remaining</>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Title, category, department & Submitter Scope */}
                    <h3 className="text-white font-semibold text-base mb-1">{g.title || 'Untitled Grievance'}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-2">
                      {g.category && <span className="bg-darkBg px-2 py-0.5 rounded border border-cardBorder">{g.category}</span>}
                      {g.department && <span className="bg-darkBg px-2 py-0.5 rounded border border-cardBorder">{g.department}</span>}
                      {g.projectScope && (
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                          g.projectScope === 'Macro Capital Infrastructure'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800/80 text-gray-300 border-slate-700'
                        }`}>
                          {g.projectScope}
                        </span>
                      )}
                      {g.submittedBy?.name && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span>By:</span>
                          <span className="text-gray-300 font-medium">{g.submittedBy.name}</span>
                          {g.submittedBy.authProvider === 'google' && (
                            <span className="text-green-400 font-bold text-[10px]">✓ Google</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Severity bar */}
                    {g.severity != null && (
                      <div className="mb-3">
                        <span className="text-xs text-gray-400">Severity</span>
                        <SeverityBar score={g.severity} />
                      </div>
                    )}

                    {/* AI Analysis (collapsible) */}
                    {g.aiAnalysis && (
                      <div className="mb-2">
                        <button
                          onClick={() => toggleCard(g._id || g.id, 'analysis')}
                          className="flex items-center gap-1 text-xs text-saffron hover:underline"
                        >
                          {expandedCards[`${g._id || g.id}-analysis`] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          AI Analysis Summary
                        </button>
                        {expandedCards[`${g._id || g.id}-analysis`] && (
                          <div className="mt-1.5 p-3 bg-darkBg rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                            {typeof g.aiAnalysis === 'string' ? g.aiAnalysis : JSON.stringify(g.aiAnalysis, null, 2)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Citizen Explainer (collapsible) */}
                    {g.citizenExplainer && (
                      <div className="mb-2">
                        <button
                          onClick={() => toggleCard(g._id || g.id, 'explainer')}
                          className="flex items-center gap-1 text-xs text-indiaGreen hover:underline"
                        >
                          {expandedCards[`${g._id || g.id}-explainer`] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          Citizen Explainer
                        </button>
                        {expandedCards[`${g._id || g.id}-explainer`] && (
                          <div className="mt-1.5 p-3 bg-indiaGreen/10 border border-indiaGreen/30 rounded-lg text-sm text-gray-200 whitespace-pre-wrap">
                            {typeof g.citizenExplainer === 'string' ? g.citizenExplainer : JSON.stringify(g.citizenExplainer, null, 2)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Location & timestamp */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                      {(g.location || g.lat) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {typeof g.location === 'string' ? g.location : g.lat && g.lon ? `${g.lat}, ${g.lon}` : ''}
                        </span>
                      )}
                      {g.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(g.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Official Action Taken Report / Redressal Audit */}
                    {(g.redressalRemarks || g.resolvedBy) && (
                      <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                          <Shield size={13} /> Official Grievance Redressal Action
                        </div>
                        {g.resolvedBy && (
                          <div className="text-gray-300">
                            <span className="text-gray-400 font-medium">Authorized Officer:</span>{' '}
                            <span className="text-white font-semibold">{g.resolvedBy}</span>
                          </div>
                        )}
                        {g.redressalRemarks && (
                          <div className="text-gray-200 mt-1 bg-darkBg/60 p-2 rounded border border-emerald-500/20">
                            <span className="text-emerald-300 font-medium">Action Taken Report (ATR):</span>{' '}
                            {g.redressalRemarks}
                          </div>
                        )}
                        {g.resolvedAt && (
                          <div className="text-gray-400 text-[10px]">
                            Redressal Recorded: {new Date(g.resolvedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Redressal Action Console */}
                    {isLoggedIn && (
                      <div className="mt-3 pt-3 border-t border-cardBorder bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-saffron flex items-center gap-1.5">
                            <Shield size={14} /> Redressal Action Console
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Acting: {officer?.name || 'GRO Officer'}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            id={`status-sel-${g._id || g.id}`}
                            defaultValue={g.status || 'Pending'}
                            className="px-2.5 py-1.5 bg-darkBg border border-cardBorder rounded-lg text-xs text-white focus:outline-none focus:border-saffron sm:w-36 shrink-0"
                          >
                            <option>Pending</option>
                            <option>Triaged</option>
                            <option>In Progress</option>
                            <option>Resolved</option>
                          </select>
                          <input
                            id={`remarks-inp-${g._id || g.id}`}
                            type="text"
                            defaultValue={g.redressalRemarks || ''}
                            placeholder="Enter Action Taken Report (ATR) / Municipal remarks..."
                            className="flex-1 px-3 py-1.5 bg-darkBg border border-cardBorder rounded-lg text-xs text-white focus:outline-none focus:border-saffron"
                          />
                          <button
                            onClick={() => {
                              const sel = document.getElementById(`status-sel-${g._id || g.id}`)?.value;
                              const rem = document.getElementById(`remarks-inp-${g._id || g.id}`)?.value;
                              handleStatusUpdate(g._id || g.id, sel, rem);
                            }}
                            className="px-3.5 py-1.5 bg-indiaGreen hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition shrink-0 flex items-center justify-center gap-1.5 shadow"
                          >
                            <CheckCircle size={13} /> Record Redressal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── G. AI Chat Panel ── */}
        <section className="bg-cardBg border border-cardBorder rounded-xl overflow-hidden">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-700/50 transition"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-saffron" /> 🤖 Ask main-link AI Agent
            </h2>
            {chatOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {chatOpen && (
            <div className="border-t border-cardBorder">
              {/* Quick questions */}
              <div className="px-5 pt-3 flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendChat(q)}
                    className="px-3 py-1.5 bg-darkBg border border-cardBorder rounded-full text-xs text-gray-300 hover:text-saffron hover:border-saffron transition"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">Ask about live grievances, ward status, or civic rights in any language...</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indiaGreen/20 text-green-100 rounded-br-sm'
                        : 'bg-darkBg border border-cardBorder text-gray-200 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-darkBg border border-cardBorder rounded-xl px-4 py-2.5 text-sm text-gray-400">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>●</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-5 pb-4 flex gap-2">
                <select
                  value={chatLanguage} onChange={(e) => setChatLanguage(e.target.value)}
                  className="px-2 py-2 bg-darkBg border border-cardBorder rounded-lg text-sm text-white focus:outline-none focus:border-saffron w-24"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Telugu</option>
                </select>
                <input
                  type="text" value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder="Ask about live grievances, ward status, or civic rights in any language..."
                  className="flex-1 px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-saffron"
                />
                <button
                  onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-saffron text-darkBg rounded-lg font-semibold text-sm hover:bg-orange-400 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── I. Footer ── */}
      <footer className="border-t border-cardBorder mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-500">
          Built for <span className="text-saffron">FORGE 48-Hour Build-a-thon 2026</span> | <span className="text-white">main-link</span> | Powered by <span className="text-indiaGreen">Gemini 2.5 Flash</span>
        </div>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)' }} />
      </footer>
    </div>
  );
}
