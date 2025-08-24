// SkyCast Pro
// Put your OpenWeather API key into localStorage: 
// localStorage.setItem('OPENWEATHER_KEY','YOUR_KEY')
const KEY = localStorage.getItem('OPENWEATHER_KEY') || 'YOUR_OPENWEATHER_API_KEY';
let unit = localStorage.getItem('UNIT') || 'metric';
let theme = localStorage.getItem('THEME') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light');

// Elements
const E = id => document.getElementById(id);
const els = {
  search: E('search'), suggestions: E('suggestions'), micBtn: E('micBtn'),
  useLocation: E('useLocation'), unitToggle: E('unitToggle'),
  themeToggle: E('themeToggle'), installBtn: E('installBtn'),
  addFav: E('addFav'), favList: E('favList'),
  temp: E('temp'), desc: E('desc'), place: E('place'),
  humidity: E('humidity'), wind: E('wind'), feels: E('feels'),
  uv: E('uv'), sunrise: E('sunrise'), sunset: E('sunset'),
  aqiVal: E('aqiVal'), aqiLabel: E('aqiLabel'), aqiParts: E('aqiParts'),
  daily: E('daily'), hourly: E('hourlyScroller'), icon: E('icon'),
  alerts: E('alerts'), layerSelect: E('layerSelect'), recenter: E('recenter'),
  toast: E('toast')
};

// Init theme + unit
document.documentElement.classList.toggle('dark', theme==='dark');
els.unitToggle.checked = unit === 'imperial';

// PWA
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
els.installBtn.addEventListener('click', () => deferredPrompt?.prompt());

// Helpers
const fmt = (n) => Math.round(n);
const compass = (deg)=>["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.floor((deg/22.5)+.5)%16];
function toast(t){ els.toast.textContent=t; els.toast.classList.add('show'); setTimeout(()=>els.toast.classList.remove('show'),2200);}
function tstr(ts, off, opt={hour:'2-digit',minute:'2-digit'}){ return new Date((ts+off)*1000).toLocaleTimeString([],opt); }
function weekday(ts, off){ return new Date((ts+off)*1000).toLocaleDateString([], {weekday:'short'}); }

// API
async function geo(q){
  const u=`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${KEY}`;
  const r=await fetch(u); if(!r.ok) throw 0; return r.json();
}
async function rev(lat,lon){
  const u=`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${KEY}`;
  const r=await fetch(u); if(!r.ok) throw 0; return r.json();
}
async function onecall(lat,lon){
  const u=`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=${unit}&appid=${KEY}`; // includes current,hourly,daily; alerts if available
  const r=await fetch(u); if(!r.ok) throw 0; return r.json();
}
async function aqi(lat,lon){
  const u=`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${KEY}`;
  const r=await fetch(u); if(!r.ok) throw 0; return r.json();
}

// Voice search
els.micBtn.addEventListener('click', () => {
  try{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Voice not supported');
    const r = new SR(); r.lang='en-US'; r.start();
    r.onresult = (e)=> { els.search.value = e.results[0][0].transcript; doSearch(); };
  }catch(e){ toast('Voice not supported'); }
});

// Theme
els.themeToggle.addEventListener('click',()=>{
  theme = theme==='dark'?'light':'dark';
  document.documentElement.classList.toggle('dark', theme==='dark');
  localStorage.setItem('THEME', theme);
});

// Unit
els.unitToggle.addEventListener('change',()=>{
  unit = els.unitToggle.checked?'imperial':'metric';
  localStorage.setItem('UNIT', unit);
  const last=JSON.parse(localStorage.getItem('LAST')||'{}');
  if(last.lat) load(last.lat,last.lon,last.name);
});

// Favorites
function getFavs(){ return JSON.parse(localStorage.getItem('FAVS')||'[]'); }
function setFavs(f){ localStorage.setItem('FAVS', JSON.stringify(f)); renderFavs(); }
function renderFavs(){
  const favs = getFavs();
  els.favList.innerHTML = favs.map((f,i)=>`<span class="chip" data-i="${i}">${f.name}</span>`).join('') || '<span class="muted">No favorites yet</span>';
}
els.favList.addEventListener('click',(e)=>{
  const chip = e.target.closest('.chip'); if(!chip) return;
  const f = getFavs()[parseInt(chip.dataset.i,10)];
  if (f) load(f.lat, f.lon, f.name);
});
els.addFav.addEventListener('click',()=>{
  const last=JSON.parse(localStorage.getItem('LAST')||'{}');
  if(!last.lat) return toast('Load a place first');
  const favs = getFavs();
  if (!favs.some(x=>x.name===last.name)) { favs.push(last); setFavs(favs); toast('Added to favorites'); }
  else toast('Already in favorites');
});

// Search
let st;
function doSearch(){
  clearTimeout(st);
  const q = els.search.value.trim();
  if(!q){ els.suggestions.classList.add('hidden'); return; }
  st=setTimeout(async()=>{
    try{
      const res = await geo(q);
      els.suggestions.innerHTML = res.map(r=>`<li data-lat="${r.lat}" data-lon="${r.lon}">${r.name}${r.state?', '+r.state:''}, ${r.country}</li>`).join('');
      els.suggestions.classList.remove('hidden');
    }catch(e){}
  }, 250);
}
els.search.addEventListener('input', doSearch);
els.search.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const first = els.suggestions.querySelector('li');
    if (first) first.click();
  }
});
els.suggestions.addEventListener('click',(e)=>{
  const li=e.target.closest('li'); if(!li) return;
  els.suggestions.classList.add('hidden');
  const lat=+li.dataset.lat, lon=+li.dataset.lon, name=li.textContent;
  load(lat,lon,name);
});

// Location
els.useLocation.addEventListener('click',()=>{
  if(!navigator.geolocation) return toast('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude:lat, longitude:lon}=pos.coords;
    const name = await rev(lat,lon).then(j=>j?.[0]?.name||'My Location').catch(()=> 'My Location');
    load(lat,lon,name);
  },err=>toast(err.message));
});

// Icon + background by condition
function setConditionVisual(main){
  const m=(main||'').toLowerCase();
  document.body.classList.remove('rainy','snowy');
  if(m.includes('rain')) document.body.classList.add('rainy');
  if(m.includes('snow')) document.body.classList.add('snowy');
  const el = els.icon;
  el.className='icon';
  if(m.includes('clear')) el.classList.add('sun');
  else if(m.includes('cloud')) el.style.background='radial-gradient(circle at 50% 40%, #fff, #cdd7ff 60%)';
  else if(m.includes('rain')) el.style.background='radial-gradient(circle at 50% 40%, #9dd1ff, #4fa8ff 60%)';
  else if(m.includes('snow')) el.style.background='radial-gradient(circle at 50% 40%, #fff, #d9f0ff 60%)';
  else el.style.background='radial-gradient(circle at 50% 40%, #ffe08a, #ff6b00 60%)';
}

// Hourly scroller
function renderHourly(hours, off){
  els.hourly.innerHTML = hours.slice(0,24).map(h=>`<div class="hour">
    <div>${new Date((h.dt+off)*1000).toLocaleTimeString([],{hour:'2-digit'})}</div>
    <div style="font-size:20px">${iconEmoji(h.weather?.[0]?.main)}</div>
    <div><b>${fmt(h.temp)}°</b></div>
    <div>${Math.round((h.pop||0)*100)}%</div>
  </div>`).join('');
  // Chart
  const labels = hours.slice(0,24).map(h=>new Date((h.dt+off)*1000).toLocaleTimeString([],{hour:'2-digit'}));
  const temps = hours.slice(0,24).map(h=>fmt(h.temp));
  const pop = hours.slice(0,24).map(h=>Math.round((h.pop||0)*100));
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  if (window.hch) window.hch.destroy();
  window.hch = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Temp', data:temps, borderWidth:2, tension:.3 },
      { label:'Precip %', data:pop, borderDash:[6,6], borderWidth:1.5, yAxisID:'y1'}
    ]},
    options:{
      responsive:true,
      scales:{ y:{ ticks:{ callback:(v)=>v + (unit==='metric'?'°C':'°F') } }, y1:{ position:'right', beginAtZero:true, ticks:{ callback:(v)=>v+'%' } } },
      plugins:{ legend:{ labels:{ color: getComputedStyle(document.documentElement).getPropertyValue('--text') } } }
    }
  });
}

function iconEmoji(main){
  const m=(main||'').toLowerCase();
  if(m.includes('cloud')) return '☁️';
  if(m.includes('rain')) return '🌧️';
  if(m.includes('snow')) return '❄️';
  if(m.includes('storm')||m.includes('thunder')) return '⛈️';
  if(m.includes('drizzle')) return '🌦️';
  if(m.includes('clear')) return '☀️';
  if(m.includes('mist')||m.includes('fog')||m.includes('haze')) return '🌫️';
  return '🌡️';
}

function renderDaily(days, off){
  els.daily.innerHTML = days.slice(0,7).map(d=>`
    <div class="day">
      <div>${weekday(d.dt, off)}</div>
      <div style="font-size:24px">${iconEmoji(d.weather?.[0]?.main)}</div>
      <div class="t">${fmt(d.temp.max)}° / ${fmt(d.temp.min)}°</div>
    </div>
  `).join('');
}

// AQI
function renderAQI(aqiData){
  const aqi = aqiData?.list?.[0];
  if(!aqi){ els.aqiVal.textContent='--'; els.aqiLabel.textContent=''; return; }
  const level = aqi.main.aqi; const names=['—','Good','Fair','Moderate','Poor','Very Poor'];
  els.aqiVal.textContent=level; els.aqiLabel.textContent=names[level]||'';
  const c = aqi.components || {};
  const parts = { 'PM2.5': c.pm2_5, 'PM10': c.pm10, 'NO₂': c.no2, 'SO₂': c.so2, 'O₃': c.o3, 'CO': c.co };
  els.aqiParts.innerHTML = Object.entries(parts).map(([k,v])=>`<span class="chip">${k}: ${Math.round(v)}</span>`).join('');
}

// Alerts
function renderAlerts(alerts){
  if(!alerts || !alerts.length){ els.alerts.classList.add('empty'); els.alerts.innerHTML='No active alerts.'; return; }
  els.alerts.classList.remove('empty');
  els.alerts.innerHTML = alerts.map(a=>`<div class="alert"><b>${a.event||'Alert'}</b><div>${a.sender_name||''}</div><div>${a.description||''}</div></div>`).join('');
}

// Map
let map, layer;
function initMap(lat,lon){
  if(!map){ map = L.map('map').setView([lat,lon], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap'}).addTo(map);
  } else map.setView([lat,lon], 6);
  setLayer();
}
function setLayer(){
  const layerName = els.layerSelect.value;
  if(layer) layer.remove();
  layer = L.tileLayer(`https://tile.openweathermap.org/map/${layerName}/{z}/{x}/{y}.png?appid=${KEY}`, {opacity:0.6});
  layer.addTo(map);
}
els.layerSelect?.addEventListener('change', setLayer);
els.recenter?.addEventListener('click',()=>{
  const last=JSON.parse(localStorage.getItem('LAST')||'{}');
  if(last.lat) map.setView([last.lat,last.lon], 6);
});

// Load
async function load(lat,lon,nameHint){
  try{
    const data = await onecall(lat,lon);
    const aqiData = await aqi(lat,lon);
    const off = data.timezone_offset||0;
    const cur = data.current;
    const weather = cur.weather?.[0] || {};
    els.temp.textContent = fmt(cur.temp);
    els.desc.textContent = (weather.description||'').replace(/\b\w/g,c=>c.toUpperCase());
    els.place.textContent = nameHint || (data.timezone?.split('/')?.pop()?.replace('_',' ')||'—');
    els.humidity.textContent = cur.humidity + '%';
    els.wind.textContent = `${fmt(cur.wind_speed)} ${unit==='metric'?'m/s':'mph'} ${compass(cur.wind_deg||0)}`;
    els.feels.textContent = fmt(cur.feels_like) + '°';
    els.uv.textContent = fmt(cur.uvi);
    els.sunrise.textContent = tstr(cur.sunrise, off);
    els.sunset.textContent = tstr(cur.sunset, off);

    renderAQI(aqiData);
    renderDaily(data.daily||[], off);
    renderHourly(data.hourly||[], off);
    renderAlerts(data.alerts||[]);
    setConditionVisual(weather.main);

    localStorage.setItem('LAST', JSON.stringify({lat,lon,name:nameHint}));
    initMap(lat,lon);
  }catch(e){
    console.error(e); toast('Could not load data (check API key)');
  }
}

// Init
renderFavs();
document.addEventListener('keydown',(e)=>{ if(e.key==='/'){ e.preventDefault(); els.search.focus(); }});
// default
(async()=>{
  const last=JSON.parse(localStorage.getItem('LAST')||'{}');
  if(last.lat) load(last.lat,last.lon,last.name);
  else{
    const res = await geo('New York'); if(res?.[0]) load(res[0].lat,res[0].lon,`${res[0].name}, ${res[0].country}`);
  }
})();