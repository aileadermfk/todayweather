\
import React, { useEffect, useState } from "react";

/** WMO weather code map */
const WMO = {
  0: ["Clear sky", "sun"], 1: ["Mainly clear", "sun-cloud"], 2: ["Partly cloudy", "sun-cloud"], 3: ["Overcast", "cloud"],
  45: ["Fog", "fog"], 48: ["Depositing rime fog", "fog"],
  51: ["Light drizzle", "drizzle"], 53: ["Moderate drizzle", "drizzle"], 55: ["Dense drizzle", "drizzle"],
  56: ["Freezing drizzle", "sleet"], 57: ["Freezing drizzle", "sleet"],
  61: ["Slight rain", "rain"], 63: ["Moderate rain", "rain"], 65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "sleet"], 67: ["Freezing rain", "sleet"],
  71: ["Slight snow", "snow"], 73: ["Moderate snow", "snow"], 75: ["Heavy snow", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Rain showers", "rain"], 81: ["Moderate rain showers", "rain"], 82: ["Violent rain showers", "rain"],
  85: ["Snow showers", "snow"], 86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorm", "storm"], 96: ["Thunderstorm & hail", "storm"], 99: ["Thunderstorm & hail", "storm"],
};

const cToF = (c) => c * 9/5 + 32;
const degToDir = (d) => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d/22.5)%16];

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal];
}

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=8&language=en&format=json`;
  const r = await fetch(url); if(!r.ok) throw new Error("Geocoding failed");
  return r.json();
}
async function forecast(lat, lon, tz = "auto") {
  const base = "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: tz,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,dew_point_2m,sunrise,sunset",
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,uv_index,visibility,dew_point_2m,pressure_msl",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset",
  });
  const r = await fetch(`${base}?${params}`); if(!r.ok) throw new Error("Forecast failed");
  return r.json();
}
async function air(lat, lon, tz = "auto") {
  const base = "https://air-quality-api.open-meteo.com/v1/air-quality";
  const params = new URLSearchParams({ latitude: lat, longitude: lon, timezone: tz,
    current: "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide" });
  const r = await fetch(`${base}?${params}`); if(!r.ok) throw new Error("Air failed");
  return r.json();
}

export default function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [place, setPlace] = useLocalStorage("skyscope.place", null);
  const [unit, setUnit] = useLocalStorage("skyscope.unit", "C");
  const [wx, setWx] = useState(null);
  const [aq, setAq] = useState(null);

  const toUnit = (c) => (unit === "C" ? c : cToF(c));
  const fUnit = () => (unit === "C" ? "°C" : "°F");

  // initial load: saved place or Karachi
  useEffect(() => {
    async function boot() {
      if (!place) {
        try {
          const r = await geocode("Karachi");
          const first = r.results?.[0];
          if (first) await selectPlace(first);
        } catch {}
      } else {
        await selectPlace(place);
      }
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced search
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const id = setTimeout(() => {
      geocode(query.trim()).then(r => setSuggestions(r.results || [])).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  async function selectPlace(p) {
    setPlace(p);
    setSuggestions([]);
    try {
      const [f, a] = await Promise.all([forecast(p.latitude, p.longitude), air(p.latitude, p.longitude)]);
      setWx(f); setAq(a);
    } catch (e) {
      console.error(e);
      alert("Failed to load weather for this place.");
    }
  }

  function locateMe() {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      const p = { name: "My Location", country: "", latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      await selectPlace(p);
    }, err => alert("Location error: " + err.message));
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        <div className="text-xl font-bold">SkyScope</div>
        <div className="flex-1 relative">
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Search any city… (Karachi, Paris, Tokyo)"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 text-slate-100 px-3 py-2 outline-none"
          />
          {suggestions.length>0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/95 max-h-64 overflow-auto">
              {suggestions.map((s, i)=>(
                <button key={i} onClick={()=>selectPlace(s)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800">
                  {s.name}{s.admin1?`, ${s.admin1}`:''} · <span className="text-slate-400">{s.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={locateMe} className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
            Locate
          </button>
          <button onClick={()=>setUnit(unit==="C"?"F":"C")}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
            °{unit}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {/* Current Panel */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          {!wx ? (
            <div className="text-slate-400">Search a city to begin.</div>
          ) : (
            <>
              <div className="text-sm text-slate-400">
                {place?.name}{place?.admin1 ? `, ${place.admin1}` : ""}{place?.country ? ` · ${place.country}` : ""}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-6xl font-extrabold">
                  {Math.round(toUnit(wx.current.temperature_2m))}{fUnit()}
                </div>
                <div className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-slate-300">
                  {(WMO[wx.current.weather_code] ?? ["—"])[0]}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Feels {Math.round(toUnit(wx.current.apparent_temperature))}{fUnit()}
                </span>
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Wind {Math.round(wx.current.wind_speed_10m)} km/h {degToDir(wx.current.wind_direction_10m)}
                </span>
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Humidity {Math.round(wx.current.relative_humidity_2m)}%
                </span>
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Precip {wx.current.precipitation ?? 0} mm
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">Visibility</div>
                  <div className="font-semibold">{wx.current.visibility ? `${Math.round(wx.current.visibility/1000)} km` : "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">Pressure</div>
                  <div className="font-semibold">{wx.current.pressure_msl ? `${Math.round(wx.current.pressure_msl)} hPa` : "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">Dew Point</div>
                  <div className="font-semibold">{wx.current.dew_point_2m !== undefined ? `${Math.round(toUnit(wx.current.dew_point_2m))}${fUnit()}` : "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">Sunrise / Sunset</div>
                  <div className="font-semibold">
                    {new Date(wx.daily.sunrise[0]).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                    {" / "}
                    {new Date(wx.daily.sunset[0]).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 font-semibold">Next 24 hours</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(() => {
                    const h = wx.hourly; if (!h) return null;
                    const now = Date.now();
                    const idx = h.time.findIndex(t => new Date(t).getTime() >= now);
                    const end = Math.min(idx + 24, h.time.length);
                    const rows = [];
                    for (let i = idx; i < end; i++) {
                      rows.push(
                        <div key={i} className="min-w-[84px] text-center rounded-xl bg-slate-800/60 border border-slate-700 p-2">
                          <div className="text-xs text-slate-400">{new Date(h.time[i]).toLocaleTimeString([], {hour: "2-digit"})}</div>
                          <div className="font-bold">{Math.round(toUnit(h.temperature_2m[i]))}{fUnit()}</div>
                          <div className="text-xs text-slate-400">{h.precipitation_probability?.[i] ?? 0}% rain</div>
                        </div>
                      );
                    }
                    return rows;
                  })()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column: 7-day + Air */}
        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="font-semibold mb-2">7-Day Forecast</div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {wx?.daily?.time?.map((t, i) => (
                <div key={i} className="text-center rounded-xl bg-slate-800/60 border border-slate-700 p-3">
                  <div className="text-xs text-slate-400">{new Date(t).toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="font-extrabold">
                    {Math.round(toUnit(wx.daily.temperature_2m_max[i]))} / {Math.round(toUnit(wx.daily.temperature_2m_min[i]))}{fUnit()}
                  </div>
                  <div className="text-xs text-slate-400">{(WMO[wx.daily.weather_code[i]] ?? ["—"])[0]}</div>
                  <div className="text-xs text-slate-500">Rain {wx.daily.precipitation_probability_max?.[i] ?? 0}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="font-semibold mb-2">Air Quality</div>
            {!aq?.current ? (
              <div className="text-slate-400 text-sm">—</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">AQI (EU)</div>
                  <div className="font-semibold">{aq.current.european_aqi ?? "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">PM2.5</div>
                  <div className="font-semibold">{aq.current.pm2_5 ? Math.round(aq.current.pm2_5) + " µg/m³" : "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">PM10</div>
                  <div className="font-semibold">{aq.current.pm10 ? Math.round(aq.current.pm10) + " µg/m³" : "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
                  <div className="text-slate-400">O₃</div>
                  <div className="font-semibold">{aq.current.ozone ? Math.round(aq.current.ozone) + " µg/m³" : "—"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-400 text-sm mt-6">
        Data by Open-Meteo (no API key). • Built with ❤️
      </div>
    </div>
  );
}
