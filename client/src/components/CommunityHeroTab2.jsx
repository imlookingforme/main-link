// client/src/components/CommunityHeroTab2.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';

import {
  Upload, Camera, Mic, MicOff, RefreshCw, MapPin, Shield, Info, X,
  CheckCircle, AlertTriangle, Flame, Award, ThumbsUp, Users, Sparkles,
  Volume2, Navigation, Eye, CheckSquare, Activity, Wind, Droplets,
  Search, ChevronDown, ChevronUp, HeartPulse, Compass
} from 'lucide-react';
import {
  calculateEcoQI,
  getGrade,
  getGradeBadgeStyle,
  getWindDirectionCompass,
  evaluateHealthAdvice,
  predictTomorrowAQI,
  getEnvironmentalCorrelation
} from '../services/ecoScoreEngine';
import indianCitiesAqi from '../data/indianCitiesAqi.json';

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
  telemetry,
  telemetryLoading,
  fetchTelemetry,
  setLocation,
  setLocationLabel,
}) {

  const [dragOver, setDragOver] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('Hyderabad');
  const [showAdvisories, setShowAdvisories] = useState(false);
  const [advisoryTab, setAdvisoryTab] = useState('health'); // 'health' | 'forecast'

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return indianCitiesAqi.slice(0, 50);
    const q = citySearch.toLowerCase();
    return indianCitiesAqi.filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)).slice(0, 50);
  }, [citySearch]);

  const handleCitySelect = (cityName) => {
    const found = indianCitiesAqi.find(c => c.name === cityName);
    if (found) {
      setSelectedCityName(found.name);
      if (setLocation) setLocation({ lat: found.lat, lon: found.lon });
      if (setLocationLabel) setLocationLabel(`${found.name}, ${found.state}`);
      if (setManualLat) setManualLat(found.lat);
      if (setManualLon) setManualLon(found.lon);
      if (fetchTelemetry) setTimeout(() => fetchTelemetry(), 50);
      if (addToast) addToast(`Switched telemetry to ${found.name} (CPCB AQI: ${found.latest_aqi})`, 'info');
    }
  };

  const handleUseLiveGps = () => {
    if (detectLocation) detectLocation();
    if (fetchTelemetry) setTimeout(() => fetchTelemetry(), 200);
    if (addToast) addToast('Synchronizing with local GPS coordinates...', 'info');
  };

  const [selectedPreset, setSelectedPreset] = useState(null);

  const aqiVal = telemetry?.europeanAqi ?? 48;
  const pm25Val = telemetry?.pm25 ?? 38.0;
  const ecoqiVal = telemetry?.ecoqi ?? calculateEcoQI(aqiVal);
  const ecoGrade = telemetry?.grade ?? getGrade(ecoqiVal);
  const gradeBadgeStyle = getGradeBadgeStyle(ecoGrade);
  const healthAdvice = useMemo(() => evaluateHealthAdvice(aqiVal || pm25Val), [aqiVal, pm25Val]);
  const predictiveForecast = useMemo(() => predictTomorrowAQI(aqiVal || pm25Val, telemetry?.windSpeed || 12), [aqiVal, pm25Val, telemetry?.windSpeed]);
  const envCorrelation = useMemo(() => getEnvironmentalCorrelation(selectedPreset?.category || 'Roads & Bridges', telemetry), [selectedPreset, telemetry]);

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



      {/* ── 1.5. LIVEMETEOROLOGICAL & ECO-SCORE INDIA AIR QUALITY HUB (CS50x Final Project) ── */}
      <section className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4 shadow-lg">
        {/* Hub Header & City Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-cardBorder">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-saffron" />
                Live Environmental Telemetry &amp; EcoScore India
              </h2>
              <p className="text-xs text-gray-400">
                CPCB 298-City Monitoring Network &bull; Real-time particulate dispersion &amp; civic hazard correlation
              </p>
            </div>
          </div>

          {/* City Selector, Live GPS & Refresh Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedCityName}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="bg-darkBg border border-cardBorder text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-saffron cursor-pointer"
              >
                <optgroup label="Major Monitoring Hubs">
                  <option value="Hyderabad">Hyderabad (Telangana)</option>
                  <option value="Delhi">Delhi (NCR)</option>
                  <option value="Mumbai">Mumbai (Maharashtra)</option>
                  <option value="Bengaluru">Bengaluru (Karnataka)</option>
                  <option value="Chennai">Chennai (Tamil Nadu)</option>
                  <option value="Kolkata">Kolkata (West Bengal)</option>
                  <option value="Pune">Pune (Maharashtra)</option>
                  <option value="Ahmedabad">Ahmedabad (Gujarat)</option>
                </optgroup>
                <optgroup label="All 298 CPCB Monitored Cities">
                  {filteredCities.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name} &bull; AQI {c.latest_aqi} ({c.grade})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={handleUseLiveGps}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-darkBg border border-cardBorder hover:border-gray-500 text-xs text-gray-300 rounded-lg transition-colors"
              title="Detect device GPS coordinates"
            >
              <Navigation size={12} className="text-cyan-400" />
              <span>Use GPS</span>
            </button>

            <button
              type="button"
              onClick={fetchTelemetry}
              disabled={telemetryLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-saffron/20 border border-saffron/40 hover:bg-saffron/30 text-xs text-saffron rounded-lg transition-colors disabled:opacity-50"
              title="Refresh environmental sensors"
            >
              <RefreshCw size={12} className={telemetryLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 7 Core Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* 1. Temperature */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between">
            <div className="text-xl mb-0.5">🌡️</div>
            <div className="text-[11px] text-gray-400">Temperature</div>
            <div className="text-sm font-bold text-white mt-1">
              {telemetry?.temperature != null ? `${telemetry.temperature}°C` : '28.5°C'}
            </div>
          </div>

          {/* 2. Precipitation */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between">
            <div className="text-xl mb-0.5">💧</div>
            <div className="text-[11px] text-gray-400">Precipitation</div>
            <div className="text-sm font-bold text-white mt-1">
              {telemetry?.precipitation != null ? `${telemetry.precipitation} mm` : '0.0 mm'}
            </div>
          </div>

          {/* 3. Wind Speed & Compass */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between">
            <div className="text-xl mb-0.5">💨</div>
            <div className="text-[11px] text-gray-400">Wind &amp; Compass</div>
            <div className="text-sm font-bold text-white mt-1">
              {telemetry?.windSpeed != null ? `${telemetry.windSpeed} km/h` : '12.4 km/h'}{' '}
              <span className="text-xs font-mono text-cyan-400">{telemetry?.windCompass || 'ENE'}</span>
            </div>
          </div>

          {/* 4. PM2.5 */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between">
            <div className="text-xl mb-0.5">🫁</div>
            <div className="text-[11px] text-gray-400">PM2.5 Sensor</div>
            <div className="text-sm font-bold text-amber-300 mt-1">
              {telemetry?.pm25 != null ? `${telemetry.pm25} μg/m³` : '38.0 μg/m³'}
            </div>
          </div>

          {/* 5. PM10 */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between">
            <div className="text-xl mb-0.5">🏭</div>
            <div className="text-[11px] text-gray-400">PM10 Sensor</div>
            <div className="text-sm font-bold text-gray-200 mt-1">
              {telemetry?.pm10 != null ? `${telemetry.pm10} μg/m³` : '72.0 μg/m³'}
            </div>
          </div>

          {/* 6. EcoScore (EcoQI 0-100) */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between relative overflow-hidden">
            <div className="text-xl mb-0.5">🌿</div>
            <div className="text-[11px] text-emerald-400 font-medium">EcoScore India</div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-sm font-bold text-emerald-300">{ecoqiVal}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${gradeBadgeStyle}`}>
                {ecoGrade}
              </span>
            </div>
          </div>

          {/* 7. European / CPCB AQI */}
          <div className="bg-darkBg/90 border border-cardBorder rounded-lg p-3 text-center flex flex-col justify-between">
            <div className="text-xl mb-0.5">🌍</div>
            <div className="text-[11px] text-gray-400">CPCB Air AQI</div>
            <div className="text-sm font-bold text-cyan-300 mt-1">
              {aqiVal} <span className="text-[10px] text-gray-400 font-normal">({aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Moderate' : 'Poor'})</span>
            </div>
          </div>
        </div>

        {/* Predictive AI Forecast & Health Advisory Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvisories(!showAdvisories)}
            className="w-full py-2 px-3 bg-darkBg/60 hover:bg-darkBg border border-cardBorder rounded-lg flex items-center justify-between text-xs text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <HeartPulse size={14} className="text-red-400" />
              <span>EcoScore AI Predictive Forecast &amp; CPCB Health Advisories</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-600/40 rounded text-[10px] font-mono">
                Trend: {predictiveForecast.trend.toUpperCase()}
              </span>
            </span>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[11px]">{showAdvisories ? 'Collapse' : 'Expand Details'}</span>
              {showAdvisories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {/* Expandable Panel */}
          {showAdvisories && (
            <div className="mt-3 p-4 bg-darkBg/95 border border-cardBorder rounded-xl space-y-3 text-xs animate-in fade-in duration-200">
              {/* Tab Selector */}
              <div className="flex gap-2 border-b border-cardBorder pb-2">
                <button
                  type="button"
                  onClick={() => setAdvisoryTab('health')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    advisoryTab === 'health'
                      ? 'bg-saffron text-slate-950 font-bold'
                      : 'bg-cardBg text-gray-300 hover:text-white'
                  }`}
                >
                  🏥 CPCB Health &amp; Activity Advisories
                </button>
                <button
                  type="button"
                  onClick={() => setAdvisoryTab('forecast')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    advisoryTab === 'forecast'
                      ? 'bg-saffron text-slate-950 font-bold'
                      : 'bg-cardBg text-gray-300 hover:text-white'
                  }`}
                >
                  🔮 24-Hour AI Predictive AQI &amp; Dispersion
                </button>
              </div>

              {advisoryTab === 'health' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                    <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                      🏃 <span>Outdoor Cardio &amp; Jogging</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {healthAdvice.jogging}
                    </p>
                  </div>

                  <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                    <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                      👶 <span>Children &amp; Seniors</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {healthAdvice.children}
                    </p>
                  </div>

                  <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                    <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                      😷 <span>N95 Respirator Guidance</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {healthAdvice.mask}
                    </p>
                  </div>

                  <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                    <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                      🏠 <span>Indoor Air Purifier / HEPA</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {healthAdvice.airPurifier}
                    </p>
                  </div>
                </div>
              )}

              {advisoryTab === 'forecast' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                      <div className="text-gray-400 text-[11px]">24-Hour Projected AQI</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {predictiveForecast.predictedAqi}{' '}
                        <span className="text-xs text-gray-400 font-normal">CPCB Index</span>
                      </div>
                    </div>
                    <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                      <div className="text-gray-400 text-[11px]">Projected EcoQI &amp; Grade</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-2">
                        <span>{predictiveForecast.predictedEcoqi} / 100</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${getGradeBadgeStyle(predictiveForecast.grade)}`}>
                          {predictiveForecast.grade}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-cardBg/60 border border-cardBorder rounded-lg">
                      <div className="text-gray-400 text-[11px]">Confidence &amp; Dispersion</div>
                      <div className="text-lg font-bold text-cyan-300 mt-1">
                        {predictiveForecast.confidencePct}%{' '}
                        <span className="text-xs text-gray-400 font-normal">
                          ({telemetry?.windSpeed || 12} km/h {telemetry?.windCompass || 'ENE'})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg text-[11px] text-blue-200 leading-relaxed">
                    <strong>💨 Meteorological Dispersion Analysis:</strong> Wind speeds at {telemetry?.windSpeed || 12} km/h blowing toward {telemetry?.windCompass || 'ENE'} are actively dispersing localized particulate emissions. Reports filed under <em>Air &amp; Pollution</em> or <em>Sanitation &amp; Waste</em> will be triaged with wind vector modeling to alert downwind municipal wards.
                  </div>
                </div>
              )}
            </div>
          )}
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
