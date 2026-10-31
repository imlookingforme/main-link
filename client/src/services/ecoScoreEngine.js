/**
 * EcoScore India (CPCB Air Quality & Meteorological Engine)
 * Integrated from CS50x Final Project for main-link Civic Triage & Community Hero (Tab 2)
 */

export function calculateEcoQI(aqi) {
  if (aqi == null) return 0.0;
  const val = Number(aqi);
  if (isNaN(val)) return 0.0;
  let score;
  if (val <= 50) score = 100 - (val * 0.4);
  else if (val <= 100) score = 80 - ((val - 50) * 0.6);
  else if (val <= 200) score = 50 - ((val - 100) * 0.35);
  else if (val <= 300) score = 15 - ((val - 200) * 0.1);
  else if (val <= 400) score = Math.max(5.0, 5 - ((val - 300) * 0.03));
  else score = Math.max(0.0, 2 - ((val - 400) * 0.005));
  return Math.round(score * 10) / 10;
}

export function getGrade(ecoqi) {
  const val = Number(ecoqi);
  if (val >= 95) return "A+";
  if (val >= 85) return "A";
  if (val >= 70) return "B";
  if (val >= 55) return "C";
  if (val >= 40) return "D";
  return "F";
}

export function getGradeBadgeStyle(grade) {
  switch (grade) {
    case "A+":
    case "A":
      return "bg-emerald-950/80 text-emerald-300 border-emerald-600/60";
    case "B":
      return "bg-cyan-950/80 text-cyan-300 border-cyan-600/60";
    case "C":
      return "bg-amber-950/80 text-amber-300 border-amber-600/60";
    case "D":
      return "bg-orange-950/80 text-orange-300 border-orange-600/60";
    case "F":
    default:
      return "bg-red-950/80 text-red-300 border-red-600/60";
  }
}

export function getWindDirectionCompass(degrees) {
  if (degrees == null) return "N/A";
  const sectors = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(Number(degrees) / 22.5) % 16;
  return sectors[idx] || "N";
}

export function evaluateHealthAdvice(aqi) {
  const val = Number(aqi) || 50;
  if (val <= 50) {
    return {
      jogging: "Safe for outdoor running anytime today.",
      children: "Ideal air quality for outdoor school activities and play.",
      mask: "No mask required.",
      airPurifier: "Windows can remain open for natural ventilation."
    };
  } else if (val <= 100) {
    return {
      jogging: "Good conditions for outdoor activities; minor caution for asthma patients.",
      children: "Safe for children and elderly individuals.",
      mask: "Generally not required.",
      airPurifier: "Natural ventilation is acceptable."
    };
  } else if (val <= 200) {
    return {
      jogging: "Reduce prolonged outdoor exertion; exercise indoors if sensitive.",
      children: "Limit continuous outdoor play past 2 hours.",
      mask: "Cloth or standard surgical mask recommended in heavy traffic.",
      airPurifier: "Run purifier in bedrooms overnight."
    };
  } else if (val <= 300) {
    return {
      jogging: "Avoid outdoor running or cardio; work out indoors.",
      children: "Keep children and seniors indoors during peak hours.",
      mask: "N95 or FFP2 mask strongly recommended outdoors.",
      airPurifier: "Keep indoor air purifiers running continuously."
    };
  } else if (val <= 400) {
    return {
      jogging: "Avoid all outdoor physical activity.",
      children: "Children and elderly should strictly remain indoors.",
      mask: "N95 / FFP2 mask mandatory for any outdoor exposure.",
      airPurifier: "Run HEPA purifiers on high; seal door and window gaps."
    };
  } else {
    return {
      jogging: "Hazardous emergency conditions. Do not exercise outdoors.",
      children: "Emergency air quality; all vulnerable groups must stay indoors.",
      mask: "N95/FFP3 respirator required outdoors.",
      airPurifier: "Continuous HEPA filtration required; avoid opening windows."
    };
  }
}

export function predictTomorrowAQI(currentAQI, windSpeed = 12) {
  const base = Number(currentAQI) || 75;
  let windFactor = 1.0;
  if (windSpeed > 15) windFactor = 0.92;
  else if (windSpeed < 5) windFactor = 1.08;
  const predictedAqi = Math.round(base * windFactor);
  const predictedEcoqi = calculateEcoQI(predictedAqi);
  const grade = getGrade(predictedEcoqi);
  const confidence = 85;
  return {
    predictedAqi,
    predictedEcoqi,
    grade,
    confidencePct: confidence,
    trend: predictedAqi < base ? "improving" : (predictedAqi > base ? "deteriorating" : "stable")
  };
}

/**
 * Cross-references a citizen hazard report with live environmental telemetry
 */
export function getEnvironmentalCorrelation(category, telemetry) {
  if (!telemetry) return null;
  const cat = (category || "").toLowerCase();
  const precip = Number(telemetry.precipitation) || 0;
  const pm25 = Number(telemetry.pm25) || 0;
  const windSpeed = Number(telemetry.windSpeed) || 0;
  const windCompass = telemetry.windCompass || "N";

  if (cat.includes("air") || cat.includes("pollution") || cat.includes("waste") || cat.includes("sanitation")) {
    if (pm25 > 50) {
      return {
        type: "CRITICAL_AIR",
        badge: "Critical Environmental Correlation",
        message: `Hazard coincides with elevated local PM2.5 (${pm25} µg/m³). Particulate smoke is dispersing ${windCompass} at ${windSpeed} km/h toward adjacent wards.`,
        urgencyEscalation: "High",
      };
    }
  }

  if (cat.includes("water") || cat.includes("drainage") || cat.includes("road") || cat.includes("bridge")) {
    if (precip > 0.5) {
      return {
        type: "FLOOD_RISK",
        badge: "Rain / Subsurface Waterlogging Escalation",
        message: `Active precipitation (${precip} mm) reported. Unrepaired potholes/drainage failures face accelerated structural erosion and waterlogging.`,
        urgencyEscalation: "Critical",
      };
    }
  }

  return {
    type: "NORMAL",
    badge: "Environmental Telemetry Cross-Verified",
    message: `Conditions stable (${telemetry.temperature}°C, ${telemetry.humidity}% RH, PM2.5: ${pm25} µg/m³). Proceeding with standard municipal SLA triage.`,
    urgencyEscalation: null,
  };
}
