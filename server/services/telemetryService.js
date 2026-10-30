/**
 * Telemetry Service — fetches live weather, air quality, and geocoding data
 * from free public APIs. Every sub-call is individually wrapped so a single
 * API outage never crashes the whole request.
 */

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API responded with status ${res.status}`);
  }
  const data = await res.json();
  const c = data.current;
  return {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    rain: c.rain,
    wind_speed: c.wind_speed_10m,
  };
}

async function fetchAirQuality(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,european_aqi`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Air Quality API responded with status ${res.status}`);
  }
  const data = await res.json();
  const c = data.current;
  return {
    pm10: c.pm10,
    pm2_5: c.pm2_5,
    carbon_monoxide: c.carbon_monoxide,
    nitrogen_dioxide: c.nitrogen_dioxide,
    european_aqi: c.european_aqi,
  };
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "main-link-ForgeHackathon/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Nominatim API responded with status ${res.status}`);
  }
  const data = await res.json();
  const address = data.display_name || "";
  const ward =
    (data.address && (data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.county)) || "";
  return { address, ward };
}

async function fetchAllTelemetry(lat, lon) {
  let weather = null;
  let airQuality = null;
  let geo = null;

  try {
    weather = await fetchWeather(lat, lon);
  } catch (err) {
    console.error("[Telemetry] Weather fetch failed:", err.message);
  }

  try {
    airQuality = await fetchAirQuality(lat, lon);
  } catch (err) {
    console.error("[Telemetry] Air quality fetch failed:", err.message);
  }

  try {
    geo = await reverseGeocode(lat, lon);
  } catch (err) {
    console.error("[Telemetry] Reverse geocode failed:", err.message);
  }

  return {
    weather,
    airQuality,
    geo,
    merged: {
      temperature: weather?.temperature ?? null,
      humidity: weather?.humidity ?? null,
      precipitation: weather?.precipitation ?? null,
      wind_speed: weather?.wind_speed ?? null,
      pm10: airQuality?.pm10 ?? null,
      pm2_5: airQuality?.pm2_5 ?? null,
      carbon_monoxide: airQuality?.carbon_monoxide ?? null,
      nitrogen_dioxide: airQuality?.nitrogen_dioxide ?? null,
      european_aqi: airQuality?.european_aqi ?? null,
      fetchedAt: new Date(),
    },
  };
}

module.exports = {
  fetchWeather,
  fetchAirQuality,
  reverseGeocode,
  fetchAllTelemetry,
};
