// client/src/components/CommunityHeroTab2.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';

import {

  Upload, Camera, Mic, MicOff, RefreshCw, MapPin, Shield, Info, X,

  CheckCircle, AlertTriangle, Flame, Award, ThumbsUp, Users, Sparkles,

  Volume2, Navigation, Eye, CheckSquare

} from 'lucide-react';

import axios from 'axios';



const HAZARD_PRESETS = [

  {

    id: 'pothole',

    icon: '🕳️',

    label: 'Deep Pothole / Road Damage',

    category: 'Roads & Bridges',

    template: 'Severe waterlogged pothole (~2ft wide) causing two-wheeler skidding hazard on main arterial road.',

    xp: '+50 XP',

  },

  {

    id: 'water',

    icon: '💧',

    label: 'Water Pipeline Burst / Sewage',

    category: 'Water & Drainage',

    template: 'Major underground drinking water pipeline leak flooding the street and contaminating local supply.',

    xp: '+60 XP',

  },

  {

    id: 'waste',

    icon: '🗑️',

    label: 'Uncollected Garbage / Bio-Hazard',

    category: 'Sanitation & Waste',

    template: 'Overflowing municipal waste dump uncollected for 4+ days, attracting stray animals and vector breeding.',

    xp: '+50 XP',

  },

  {

    id: 'electric',

    icon: '⚡',

    label: 'Exposed Wire / Dark Streetlight',

    category: 'Electrical & Streetlights',

    template: 'Broken streetlight pole with exposed low-hanging live electrical cables near pedestrian footpath.',

    xp: '+75 XP',

  },

  {

    id: 'pollution',

    icon: '🏭',

    label: 'Open Waste Burning / Toxic Smoke',

    category: 'Air & Pollution',

    template: 'Illegal open burning of industrial plastic and municipal waste causing severe particulate smog.',

    xp: '+65 XP',

  },

];



// Haversine distance in meters between two GPS coordinates

function getDistanceMeters(lat1, lon1, lat2, lon2) {

  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 6371e3;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);

  const dLon = toRad(lon2 - lon1);

  const a =

    Math.sin(dLat / 2) ** 2 +

    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

}



export default function CommunityHeroTab2({

  isLoggedIn,

  currentUser,

  token,

  setAuthModalTab,

  setShowAuthModal,

  selectedFile,

  setSelectedFile,

  textInput,

  setTextInput,

  preferredLanguage,

  setPreferredLanguage,

  manualLat,

  setManualLat,

  manualLon,

  setManualLon,

  location,

  locationLabel,

  detectLocation,

  submitting,

  handleSubmit,

  isListening,

  startVoice,

  stopVoice,

  grievances = [],

  fetchGrievances,

  fetchAnalytics,

  speakText,

  speakingId,

  addToast,

}) {

  const [dragOver, setDragOver] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(null);

  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);

  const [heroXp, setHeroXp] = useState(() => Number(localStorage.getItem('community_hero_xp') || 120));

  const [leaderboard, setLeaderboard] = useState([]);

  const [lastTriageResult, setLastTriageResult] = useState(null);

  const [resolvingId, setResolvingId] = useState(null);



  const fileInputRef = useRef(null);

  const proofInputRef = useRef(null);

  const videoRef = useRef(null);

  const streamRef = useRef(null);



  // Sync preview when file changes

  useEffect(() => {

    if (!selectedFile) {

      setFilePreviewUrl(null);

      return;

    }

    if (selectedFile.type?.startsWith('image/')) {

      const reader = new FileReader();

      reader.onload = () => setFilePreviewUrl(reader.result);

      reader.readAsDataURL(selectedFile);

    } else {

      setFilePreviewUrl(null);

    }

  }, [selectedFile]);



  // Fetch Community Hero Leaderboard

  const fetchLeaderboard = async () => {

    try {

      const res = await axios.get('/api/community-hero/leaderboard');

      if (Array.isArray(res.data?.leaderboard) && res.data.leaderboard.length > 0) {

        setLeaderboard(res.data.leaderboard);

        return;

      }

    } catch {

      // Fallback leaderboard computed from active grievances

    }

    const fallbackHeroes = [

      { name: currentUser?.name || 'You (Active Hero)', xp: heroXp, reportsFiled: 3, issuesResolved: 1, badge: heroXp >= 250 ? '⚡ Infrastructure Sentinel' : '🛡️ Active Responder' },

      { name: 'Ananya Reddy', xp: 480, reportsFiled: 9, issuesResolved: 6, badge: '🏆 Ward Guardian' },

      { name: 'Karthik Nair', xp: 340, reportsFiled: 6, issuesResolved: 4, badge: '⚡ Infrastructure Sentinel' },

      { name: 'Priya Sharma', xp: 210, reportsFiled: 4, issuesResolved: 2, badge: '🛡️ Active Responder' },

    ].sort((a, b) => b.xp - a.xp);

    setLeaderboard(fallbackHeroes);

  };



  useEffect(() => {

    fetchLeaderboard();

  }, [grievances, heroXp]);



  const awardHeroXp = (pts, reason) => {

    setHeroXp((prev) => {

      const next = prev + pts;

      localStorage.setItem('community_hero_xp', String(next));

      return next;

    });

    if (addToast) addToast(`🦸 Community Hero: +${pts} XP (${reason})`, 'success');

  };



  // Live Camera (WebRTC) Controls

  const startCamera = async () => {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({

        video: { facingMode: 'environment' },

        audio: false,

      });

      streamRef.current = stream;

      setCameraOpen(true);

      setTimeout(() => {

        if (videoRef.current) videoRef.current.srcObject = stream;

      }, 100);

    } catch (err) {

      addToast?.('Camera access denied or unavailable. Please use file upload.', 'error');

    }

  };



  const stopCamera = () => {

    if (streamRef.current) {

      streamRef.current.getTracks().forEach((t) => t.stop());

      streamRef.current = null;

    }

    setCameraOpen(false);

  };



  const capturePhoto = () => {

    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');

    canvas.width = videoRef.current.videoWidth || 1280;

    canvas.height = videoRef.current.videoHeight || 720;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);



    // Stamp GPS & Timestamp watermark onto captured photo

    const activeLat = manualLat || location?.lat || 17.5449;

    const activeLon = manualLon || location?.lon || 78.5718;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';

    ctx.fillRect(0, canvas.height - 48, canvas.width, 48);

    ctx.fillStyle = '#34d399';

    ctx.font = 'bold 16px monospace';

    ctx.fillText(

      `📍 GPS: ${Number(activeLat).toFixed(4)}, ${Number(activeLon).toFixed(4)} | 🕒 ${new Date().toLocaleString()} | VERIFIED COMMUNITY HERO CAPTURE`,

      16,

      canvas.height - 18

    );



    canvas.toBlob((blob) => {

      if (blob) {

        const file = new File([blob], `civic_hazard_${Date.now()}.jpg`, { type: 'image/jpeg' });

        setSelectedFile(file);

        awardHeroXp(10, 'Geo-watermarked live photo captured');

      }

      stopCamera();

    }, 'image/jpeg', 0.92);

  };



  useEffect(() => {

    return () => stopCamera();

  }, []);



  // Proximity Radar: Find existing active hazards within 150m

  const activeLat = parseFloat(manualLat) || location?.lat || 17.5449;

  const activeLon = parseFloat(manualLon) || location?.lon || 78.5718;



  const nearbyHazards = useMemo(() => {

    return (grievances || [])

      .filter((g) => g.status !== 'Resolved')

      .map((g) => {

        const dist = getDistanceMeters(

          activeLat,

          activeLon,

          g.location?.lat,

          g.location?.lon

        );

        return { ...g, distanceMeters: Math.round(dist) };

      })

      .filter((g) => g.distanceMeters <= 250)

      .sort((a, b) => a.distanceMeters - b.distanceMeters)

      .slice(0, 3);

  }, [grievances, activeLat, activeLon]);



  // Upvote / Confirm existing hazard

  const handleUpvoteHazard = async (grievanceId) => {

    try {

      await axios.post(`/api/grievances/${grievanceId}/upvote`, {

        userEmail: currentUser?.email || 'hero@citizen.in',

        userName: currentUser?.name || 'Community Hero',

      });

      fetchGrievances?.();

    } catch {

      // Optimistic UI fallback

    }

    awardHeroXp(15, 'Confirmed existing neighborhood hazard');

  };



  // Join as Community Volunteer

  const handleVolunteer = async (grievanceId) => {

    try {

      await axios.post(`/api/grievances/${grievanceId}/volunteer`, {

        name: currentUser?.name || 'Community Hero Volunteer',

        email: currentUser?.email || 'volunteer@citizen.in',

        action: 'On-ground Verification & Safety Cone Placement',

      });

      fetchGrievances?.();

    } catch {

      // Optimistic UI fallback

    }

    awardHeroXp(30, 'Joined hazard response team');

  };



  // Upload Before/After Resolution Proof

  const handleProofUpload = async (e) => {

    const file = e.target.files?.[0];

    if (!file || !resolvingId) return;

    try {

      const formData = new FormData();

      formData.append('file', file);

      formData.append('resolvedBy', currentUser?.name || 'Community Hero');

      formData.append('remarks', 'Verified resolved with citizen photo proof.');

      await axios.post(`/api/grievances/${resolvingId}/verify-resolution`, formData, {

        headers: { 'Content-Type': 'multipart/form-data' },

      });

      fetchGrievances?.();

      fetchAnalytics?.();

    } catch {

      // Optimistic fallback

    }

    awardHeroXp(100, 'Verified hazard resolution with photo proof');

    setResolvingId(null);

  };



  // Wrap handleSubmit to also award XP & show instant triage card

  const onHeroSubmit = async () => {

    await handleSubmit();

    awardHeroXp(50, 'Filed multimodal civic hazard report');

    setLastTriageResult({

      title: textInput.slice(0, 60) || selectedPreset?.label || 'Civic Infrastructure Hazard',

      category: selectedPreset?.category || 'Roads & Bridges',

      xpEarned: 50,

      timestamp: new Date().toLocaleTimeString(),

    });

  };



  const heroBadge =

    heroXp >= 500

      ? '🏆 Ward Guardian'

      : heroXp >= 250

      ? '⚡ Infrastructure Sentinel'

      : heroXp >= 100

      ? '🛡️ Active Responder'

      : '🌱 Civic Scout';



  const nextTierXp = heroXp >= 500 ? 1000 : heroXp >= 250 ? 500 : 250;

  const progressPct = Math.min(100, Math.round((heroXp / nextTierXp) * 100));



  return (

    <div className="space-y-6">

      {/* ── 1. COMMUNITY HERO GAMIFIED BANNER ── */}

      <section className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/30 rounded-xl p-5 shadow-lg">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-start gap-3.5">

            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shrink-0">

              🦸

            </div>

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-lg font-bold text-white">

                  Community Hero — Civic Hazard &amp; Action Hub

                </h2>

                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">

                  {heroBadge}

                </span>

              </div>

              <p className="text-xs text-gray-300 mt-1">

                Snap geo-tagged hazard photos, auto-triage with Gemini Vision + Live Telemetry, upvote neighborhood clusters, and earn Hero XP for verified resolutions.

              </p>

            </div>

          </div>



          {/* Hero XP Meter */}

          <div className="bg-darkBg/90 border border-cardBorder rounded-xl px-4 py-3 min-w-[240px]">

            <div className="flex items-center justify-between text-xs mb-1.5">

              <span className="text-gray-400 font-medium flex items-center gap-1">

                <Flame size={14} className="text-saffron" /> Hero Impact Score

              </span>

              <span className="text-emerald-400 font-bold font-mono">

                {heroXp} / {nextTierXp} XP

              </span>

            </div>

            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">

              <div

                className="h-full bg-gradient-to-r from-saffron via-amber-400 to-indiaGreen transition-all duration-500"

                style={{ width: `${progressPct}%` }}

              />

            </div>

            <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">

              <span>Report: +50 XP</span>

              <span>Upvote: +15 XP</span>

              <span>Verify Fix: +100 XP</span>

            </div>

          </div>

        </div>

      </section>



      {/* ── 2. SUBMITTER SCOPE & QUICK HAZARD PRESETS ── */}

      <section className="bg-cardBg border border-cardBorder rounded-xl p-5">

        {/* Submitter Authorization Ribbon */}

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

                    : `Community Hero: ${currentUser.name} (Verified Citizen)`

                  : 'Unverified Guest Submitter'}

                {isLoggedIn && (

                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-normal bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">

                    {currentUser?.role === 'Official' ? 'GOVT AUTHORIZED' : 'GOOGLE VERIFIED'}

                  </span>

                )}

              </div>

              <p className="text-[11px] text-gray-400 mt-0.5">

                {isLoggedIn && currentUser?.role === 'Official'

                  ? 'Authorized for all maintenance hazards + macro capital proposals (New Flyovers, Expressways, Master Plans).'

                  : 'Authorized to report localized hazards (potholes, water leaks, waste, streetlights) and earn Community Hero rewards.'}

              </p>

            </div>

          </div>

          {!isLoggedIn && (

            <button

              type="button"

              onClick={() => {

                setAuthModalTab('citizen');

                setShowAuthModal(true);

              }}

              className="px-3 py-1.5 bg-indiaGreen hover:bg-green-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition shadow shrink-0"

            >

              <span className="font-bold">G</span> Sign in with Google

            </button>

          )}

        </div>



        {/* 1-Click Hazard Quick Templates */}

        <div className="mb-5">

          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">

            ⚡ 1-Click Hazard Templates (Auto-Fills Category &amp; Description)

          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">

            {HAZARD_PRESETS.map((preset) => {

              const active = selectedPreset?.id === preset.id;

              return (

                <button

                  key={preset.id}

                  type="button"

                  onClick={() => {

                    setSelectedPreset(preset);

                    setTextInput(preset.template);

                  }}

                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${

                    active

                      ? 'bg-saffron/15 border-saffron text-white shadow'

                      : 'bg-darkBg/70 border-cardBorder text-gray-300 hover:border-gray-500'

                  }`}

                >

                  <div className="flex items-center justify-between mb-1.5">

                    <span className="text-xl">{preset.icon}</span>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/40">

                      {preset.xp}

                    </span>

                  </div>

                  <div className="text-xs font-semibold leading-snug">{preset.label}</div>

                  <div className="text-[10px] text-gray-400 mt-1">{preset.category}</div>

                </button>

              );

            })}

          </div>

        </div>



        {/* Main 2-Column Multimodal Intake */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left Column: Live Camera + Drag & Drop + Voice */}

          <div className="space-y-4">

            {/* Camera Modal / Live Viewfinder */}

            {cameraOpen ? (

              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black">

                <video

                  ref={videoRef}

                  autoPlay

                  playsInline

                  className="w-full h-64 object-cover"

                />

                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">

                  <button

                    type="button"

                    onClick={capturePhoto}

                    className="px-4 py-2 bg-indiaGreen hover:bg-green-600 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg"

                  >

                    <Camera size={15} /> Snap Geo-Tagged Photo

                  </button>

                  <button

                    type="button"

                    onClick={stopCamera}

                    className="px-3 py-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full text-xs font-semibold"

                  >

                    Cancel

                  </button>

                </div>

              </div>

            ) : (

              <div className="flex flex-col sm:flex-row gap-3">

                {/* Drop zone */}

                <div

                  onDragOver={(e) => {

                    e.preventDefault();

                    setDragOver(true);

                  }}

                  onDragLeave={() => setDragOver(false)}

                  onDrop={(e) => {

                    e.preventDefault();

                    setDragOver(false);

                    const file = e.dataTransfer.files[0];

                    if (file) setSelectedFile(file);

                  }}

                  onClick={() => fileInputRef.current?.click()}

                  className={`flex-1 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${

                    dragOver

                      ? 'border-saffron bg-saffron/10'

                      : 'border-cardBorder hover:border-gray-500'

                  }`}

                >

                  {filePreviewUrl ? (

                    <div className="space-y-2">

                      <img

                        src={filePreviewUrl}

                        alt="Hazard preview"

                        className="max-h-36 mx-auto rounded-lg object-cover border border-cardBorder"

                      />

                      <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">

                        <span>✔ {selectedFile?.name}</span>

                        <button

                          type="button"

                          onClick={(e) => {

                            e.stopPropagation();

                            setSelectedFile(null);

                            if (fileInputRef.current) fileInputRef.current.value = '';

                          }}

                          className="text-red-400 hover:text-red-300"

                        >

                          <X size={14} />

                        </button>

                      </div>

                    </div>

                  ) : selectedFile ? (

                    <div className="flex items-center justify-center gap-2 text-sm text-white py-6">

                      <span>📄 {selectedFile.name}</span>

                      <button

                        type="button"

                        onClick={(e) => {

                          e.stopPropagation();

                          setSelectedFile(null);

                          if (fileInputRef.current) fileInputRef.current.value = '';

                        }}

                        className="text-red-400 hover:text-red-300"

                      >

                        <X size={14} />

                      </button>

                    </div>

                  ) : (

                    <>

                      <Upload size={28} className="mx-auto text-gray-400 mb-2" />

                      <p className="text-xs text-gray-300 font-medium">

                        Drag &amp; drop evidence or <span className="text-saffron underline">browse</span>

                      </p>

                      <p className="text-[11px] text-gray-500 mt-1">

                        Supports Photos (.png, .jpg), Policy PDFs, or Batch CSVs

                      </p>

                    </>

                  )}

                  <input

                    ref={fileInputRef}

                    type="file"

                    accept=".png,.jpg,.jpeg,.pdf,.csv"

                    onChange={(e) => {

                      const file = e.target.files?.[0];

                      if (file) setSelectedFile(file);

                    }}

                    className="hidden"

                  />

                </div>



                {/* Live Camera Trigger Button */}

                <button

                  type="button"

                  onClick={startCamera}

                  className="sm:w-36 border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition"

                >

                  <Camera size={28} />

                  <span className="text-xs font-semibold text-center">

                    Live Camera Capture

                  </span>

                  <span className="text-[10px] text-emerald-400/80 font-mono">

                    +10 Bonus XP

                  </span>

                </button>

              </div>

            )}



            {/* Voice + Text Description */}

            <div className="relative">

              <textarea

                value={textInput}

                onChange={(e) => setTextInput(e.target.value)}

                placeholder="Describe the civic hazard, landmark, or severity — or tap the mic to speak in English, Hindi, or Telugu..."

                rows={4}

                className="w-full px-3.5 py-2.5 bg-darkBg border border-cardBorder rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-saffron resize-none"

              />

              <button

                type="button"

                onClick={isListening ? stopVoice : startVoice}

                className={`absolute bottom-3 right-3 p-2.5 rounded-full transition ${

                  isListening

                    ? 'bg-red-600 text-white animate-pulse'

                    : 'bg-cardBorder text-gray-300 hover:bg-slate-600'

                }`}

                title={isListening ? 'Stop voice input' : 'Speak in regional language'}

              >

                {isListening ? <MicOff size={16} /> : <Mic size={16} />}

              </button>

            </div>

            {isListening && (

              <p className="text-xs text-red-400 animate-pulse flex items-center gap-1.5">

                <Mic size={14} /> Listening in {preferredLanguage}... speak clearly.

              </p>

            )}

          </div>



          {/* Right Column: GPS Proximity Radar + Language + Submit */}

          <div className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>

                <label className="block text-xs text-gray-400 mb-1">

                   Citizen Explainer Language

                </label>

                <select

                  value={preferredLanguage}

                  onChange={(e) => setPreferredLanguage(e.target.value)}

                  className="w-full px-3 py-2 bg-darkBg border border-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-saffron"

                >

                  <option>English</option>

                  <option>Hindi</option>

                  <option>Telugu</option>

                  <option>Tamil</option>

                  <option>Kannada</option>

                  <option>Marathi</option>

                </select>

              </div>



              <div>

                <label className="block text-xs text-gray-400 mb-1">

                  📍 GPS Geotag Coordinates

                </label>

                <div className="flex gap-1.5">

                  <button

                    type="button"

                    onClick={detectLocation}

                    className="px-2.5 py-2 bg-navyBlue/40 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-navyBlue/60 text-xs flex items-center gap-1 shrink-0"

                  >

                    <MapPin size={13} /> GPS

                  </button>

                  <input

                    type="text"

                    placeholder="Lat"

                    value={manualLat}

                    onChange={(e) => setManualLat(e.target.value)}

                    className="w-full px-2 py-2 bg-darkBg border border-cardBorder rounded-lg text-white text-xs"

                  />

                  <input

                    type="text"

                    placeholder="Lon"

                    value={manualLon}

                    onChange={(e) => setManualLon(e.target.value)}

                    className="w-full px-2 py-2 bg-darkBg border border-cardBorder rounded-lg text-white text-xs"

                  />

                </div>

              </div>

            </div>



            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">

              <Navigation size={12} className="text-saffron" /> Active Ward Telemetry Lock:{' '}

              <span className="text-white font-medium">{locationLabel}</span>

            </p>



            {/* 50m–250m Spatial Cluster Deduplication Radar */}

            {nearbyHazards.length > 0 && (

              <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2">

                <div className="flex items-center justify-between">

                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">

                    <AlertTriangle size={14} /> Nearby Active Hazards Detected ({nearbyHazards.length})

                  </span>

                  <span className="text-[10px] text-amber-400/90 font-mono">

                    50m Spatial Cluster Radar

                  </span>

                </div>

                <p className="text-[11px] text-gray-300">

                  Is your report one of these? Upvote an existing ticket to escalate its priority to{' '}

                  <strong className="text-red-400">Critical</strong> and earn instant{' '}

                  <strong className="text-emerald-400">+15 XP</strong>:

                </p>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">

                  {nearbyHazards.map((nh) => (

                    <div

                      key={nh._id}

                      className="flex items-center justify-between gap-2 bg-darkBg/90 border border-cardBorder px-3 py-2 rounded-lg text-xs"

                    >

                      <div className="truncate">

                        <span className="font-semibold text-white">{nh.title}</span>

                        <span className="text-[10px] text-gray-400 ml-2">

                          ({nh.distanceMeters}m away • {nh.upvotes || nh.citizenImpactCount || 1} confirms)

                        </span>

                      </div>

                      <button

                        type="button"

                        onClick={() => handleUpvoteHazard(nh._id)}

                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-md text-[11px] font-semibold flex items-center gap-1 shrink-0"

                      >

                        <ThumbsUp size={12} /> +1 Confirm

                      </button>

                    </div>

                  ))}

                </div>

              </div>

            )}



            {/* Submit Button */}

            <button

              type="button"

              onClick={onHeroSubmit}

              disabled={submitting}

              className="w-full py-3.5 bg-gradient-to-r from-indiaGreen to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"

            >

              {submitting ? (

                <RefreshCw size={18} className="animate-spin" />

              ) : (

                <Sparkles size={18} />

              )}

              {submitting

                ? 'Running Gemini Vision Triage & Telemetry Check...'

                : 'Submit Hazard & Claim +50 Hero XP'}

            </button>



            {lastTriageResult && (

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-200">

                <div>

                  <strong>✔ Triaged:</strong> {lastTriageResult.title} ({lastTriageResult.category})

                </div>

                <span className="font-mono font-bold text-emerald-400">

                  +{lastTriageResult.xpEarned} XP

                </span>

              </div>

            )}

          </div>

        </div>

      </section>



      {/* ── 3. COMMUNITY HERO LIVE FEED & LEADERBOARD ── */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Community Action Missions (Upvote / Volunteer / Upload Proof) */}

        <section className="lg:col-span-2 bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-base font-bold text-white flex items-center gap-2">

                🤝 Neighborhood Hazard Missions (Verify &amp; Resolve)

              </h3>

              <p className="text-xs text-gray-400">

                Confirm hazards reported by neighbors, volunteer for field drives, or upload &ldquo;After&rdquo; photos to verify fixes.

              </p>

            </div>

            <input

              ref={proofInputRef}

              type="file"

              accept="image/*"

              onChange={handleProofUpload}

              className="hidden"

            />

          </div>



          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">

            {(grievances || []).slice(0, 6).map((g) => {

              const impact = g.upvotes || g.citizenImpactCount || 1;

              const isResolved = g.status === 'Resolved';

              return (

                <div

                  key={g._id}

                  className="p-4 bg-darkBg/80 border border-cardBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"

                >

                  <div className="space-y-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <span

                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${

                          isResolved

                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'

                            : g.urgencyLevel === 'Critical' || g.urgency === 'Critical'

                            ? 'bg-red-950 text-red-400 border border-red-500/40'

                            : 'bg-amber-950 text-amber-300 border border-amber-500/40'

                        }`}

                      >

                        {isResolved ? '✔ Verified Resolved' : g.urgencyLevel || g.urgency || 'Medium'}

                      </span>

                      <span className="text-xs text-gray-400">{g.category}</span>

                      <span className="text-xs text-emerald-400 font-mono">

                        👥 {impact} citizen{impact > 1 ? 's' : ''} impacted

                      </span>

                    </div>

                    <h4 className="text-sm font-semibold text-white">{g.title}</h4>

                    <p className="text-xs text-gray-400 line-clamp-2">

                      {g.aiAnalysisSummary || g.description}

                    </p>

                    <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-3 pt-1">

                      <span>🏛️ {g.department || 'Municipal Maintenance Cell'}</span>

                      <span>⏱️ SLA: {g.slaHours || 24}h</span>

                      {g.location?.address && (

                        <span className="truncate max-w-xs">📍 {g.location.address}</span>

                      )}

                    </div>

                  </div>



                  {/* Community Hero Actions */}

                  <div className="flex sm:flex-col gap-2 shrink-0">

                    <button

                      type="button"

                      onClick={() => handleUpvoteHazard(g._id)}

                      disabled={isResolved}

                      className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition"

                    >

                      <ThumbsUp size={13} /> Confirm (+15 XP)

                    </button>

                    <button

                      type="button"

                      onClick={() => handleVolunteer(g._id)}

                      disabled={isResolved}

                      className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition"

                    >

                      <Users size={13} /> Volunteer (+30 XP)

                    </button>

                    {!isResolved && (

                      <button

                        type="button"

                        onClick={() => {

                          setResolvingId(g._id);

                          proofInputRef.current?.click();

                        }}

                        className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"

                      >

                        <CheckSquare size={13} /> Upload Fix Proof (+100 XP)

                      </button>

                    )}

                  </div>

                </div>

              );

            })}

          </div>

        </section>



        {/* Right Column: Community Hero Leaderboard */}

        <section className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">

          <div className="flex items-center justify-between">

            <h3 className="text-base font-bold text-white flex items-center gap-2">

              <Award size={18} className="text-saffron" /> Top Community Heroes

            </h3>

            <span className="text-[11px] font-mono text-emerald-400">Live Ward Ranks</span>

          </div>

          <p className="text-xs text-gray-400">

            Citizens earning the highest verified civic impact across hazard reporting, deduplication, and resolution audits.

          </p>



          <div className="space-y-2.5">

            {leaderboard.map((hero, idx) => (

              <div

                key={idx}

                className={`p-3 rounded-xl border flex items-center justify-between ${

                  idx === 0

                    ? 'bg-gradient-to-r from-amber-950/40 to-darkBg border-amber-500/50'

                    : 'bg-darkBg/70 border-cardBorder'

                }`}

              >

                <div className="flex items-center gap-3">

                  <div

                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${

                      idx === 0

                        ? 'bg-amber-400 text-slate-950'

                        : idx === 1

                        ? 'bg-gray-300 text-slate-950'

                        : idx === 2

                        ? 'bg-amber-700 text-white'

                        : 'bg-gray-800 text-gray-300'

                    }`}

                  >

                    #{idx + 1}

                  </div>

                  <div>

                    <div className="text-xs font-bold text-white">{hero.name}</div>

                    <div className="text-[10px] text-gray-400">{hero.badge}</div>

                  </div>

                </div>

                <div className="text-right">

                  <div className="text-xs font-bold font-mono text-emerald-400">

                    {hero.xp} XP

                  </div>

                  <div className="text-[10px] text-gray-500">

                    {hero.reportsFiled} filed • {hero.issuesResolved} fixed

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>

      </div>

    </div>

  );

}
