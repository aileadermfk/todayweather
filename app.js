// SkyCast Pro Ultimate — Frontend-only
// Embedded API key for convenience. Consider moving to a proxy for public deployments.
const KEY = "6860a02b1fa796c549d5f9652ff8a0fc";
let unit = localStorage.getItem('UNIT') || 'metric';
let theme = localStorage.getItem('THEME') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light');
let lang = localStorage.getItem('LANG') || 'en';

const E = id => document.getElementById(id);
const els = {
  search:E('search'), suggestions:E('suggestions'), micBtn:E('micBtn'),
  useLocation:E('useLocation'), unitToggle:E('unitToggle'), themeToggle:E('themeToggle'),
  langToggle:E('langToggle'), installBtn:E('installBtn'),
  addFav:E('addFav'), favList:E('favList'),
  temp:E('temp'), desc:E('desc'), place:E('place'),
  humidity:E('humidity'), wind:E('wind'), feels:E('feels'),
  uv:E('uv'), sunrise:E('sunrise'), sunset:E('sunset'),
  aqiVal:E('aqiVal'), aqiLabel:E('aqiLabel'), aqiParts:E('aqiParts'),
  daily:E('daily'), hourly:E('hourlyScroller'), icon:E('icon'),
  alerts:E('alerts'), layerSelect:E('layerSelect'), recenter:E('recenter'),
  toast:E('toast')
};

const i18n = {
  en: {
    useLocation:'Use Current Location', favorites:'Favorites', addFav:'+ Add current',
    humidity:'Humidity', wind:'Wind', feels:'Feels', uv:'UV', sunrise:'Sunrise', sunset:'Sunset',
    alertsTitle:'Weather Alerts', noAlerts:'No active alerts.', aqiTitle:'Air Quality',
    next24:'Next 24 Hours', forecast7:'7-Day Forecast', radar:'Radar & Layers', recenter:'Recenter'
  },
  ur: {
    useLocation:'موجودہ مقام استعمال کریں', favorites:'پسندیدہ', addFav:'موجودہ شامل کریں +',
    humidity:'نمی', wind:'ہوا', feels:'محسوس', uv:'یووی', sunrise:'طلوع آفتاب', sunset:'غروب آفتاب',
    alertsTitle:'موسمی انتباہات', noAlerts:'کوئی فعال الرٹس نہیں۔', aqiTitle:'ہوا کا معیار',
    next24:'اگلے 24 گھنٹے', forecast7:'7 دن کی پیشگوئی', radar:'ریڈار اور تہیں', recenter:'ری سینٹر'
  }
};

function applyLang(){
  const dict = i18n[lang] || i18n.en;
  document.querySelectorAll('[data-translate]').forEach(el=>{
    const k = el.getAttribute('data-translate');
    if (dict[k]) el.textContent = dict[k];
  });
}
applyLang();

// Theme + Unit init
document.documentElement.classList.toggle('dark', theme==='dark');
els.unitToggle.checked = unit === 'imperial';

// Loading screen hide
window.addEventListener('load',()=>{ const l = document.getElementById('loading'); if(l) l.style.display='none'; });

// PWA
let deferredPrompt=null; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferredPrompt=e;});
els.installBtn.addEventListener('click',()=> deferredPrompt?.prompt());

// Helpers
const fmt = n => Math.round(n);
const compass = deg => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.floor((deg/22.5)+.5)%16];
const tstr=(ts,off,opt={hour:'2-digit',minute:'2-digit'})=> new Date((ts+off)*1000).toLocaleTimeString([],opt);
const weekday=(ts,off)=> new Date((ts+off)*1000).toLocaleDateString([],{weekday:'short'});
function toast(t){ els.toast.textContent=t; els.toast.classList.add('show'); setTimeout(()=>els.toast.classList.remove('show'),2200);}

// API
async function geo(q){const u=`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${KEY}`; const r=await fetch(u); if(!r.ok) throw 0; return r.json();}
async function rev(lat,lon){const u=`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${KEY}`; const r=await fetch(u); if(!r.ok) throw 0; return r.json();}
async function onecall(lat,lon){const u=`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=${unit}&appid=${KEY}`; const r=await fetch(u); if(!r.ok) throw 0; return r.json();}
async function aqi(lat,lon){const u=`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${KEY}`; const r=await fetch(u); if(!r.ok) throw 0; return r.json();}

// Voice search
els.micBtn.addEventListener('click',()=>{
  try{ const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR) return toast('Voice not supported');
    const r=new SR(); r.lang = lang==='ur' ? 'ur-PK' : 'en-US'; r.start();
    r.onresult = e => { els.search.value = e.results[0][0].transcript; doSearch(); };
  }catch(e){ toast('Voice not supported'); }
});

// Theme + Unit + Lang
els.themeToggle.addEventListener('click',()=>{ theme = theme==='dark'?'light':'dark'; document.documentElement.classList.toggle('dark', theme==='dark'); localStorage.setItem('THEME',theme); });
els.unitToggle.addEventListener('change',()=>{ unit = els.unitToggle.checked?'imperial':'metric'; localStorage.setItem('UNIT',unit); const last=JSON.parse(localStorage.getItem('LAST')||'{}'); if(last.lat) load(last.lat,last.lon,last.name); });
els.langToggle.addEventListener('click',()=>{ lang = lang==='en'?'ur':'en'; localStorage.setItem('LANG',lang); applyLang(); const last=JSON.parse(localStorage.getItem('LAST')||'{}'); if(last.lat) load(last.lat,last.lon,last.name); });

// Favorites
function favs(){ return JSON.parse(localStorage.getItem('FAVS')||'[]'); }
function setFavs(f){ localStorage.setItem('FAVS', JSON.stringify(f)); renderFavs(); }
function renderFavs(){ const f=favs(); els.favList.innerHTML = f.map((x,i)=>`<span class="chip" data-i="${i}">${x.name}</span>`).join('') || '<span class="muted">—</span>'; }
els.favList.addEventListener('click',(e)=>{ const chip=e.target.closest('.chip'); if(!chip) return; const f=favs()[parseInt(chip.dataset.i,10)]; if(f) load(f.lat,f.lon,f.name); });
document.getElementById('addFav').addEventListener('click',()=>{ const last=JSON.parse(localStorage.getItem('LAST')||'{}'); if(!last.lat) return toast('Load a place first'); const f=favs(); if(!f.some(x=>x.name===last.name)){ f.push(last); setFavs(f); toast('Added'); } else toast('Already added'); });

// Search
let st;
function doSearch(){ clearTimeout(st); const q=els.search.value.trim(); if(!q){ document.getElementById('suggestions').classList.add('hidden'); return; } st=setTimeout(async()=>{ try{ const res=await geo(q); document.getElementById('suggestions').innerHTML = res.map(r=>`<li data-lat="${r.lat}" data-lon="${r.lon}">${r.name}${r.state?', '+r.state:''}, ${r.country}</li>`).join(''); document.getElementById('suggestions').classList.remove('hidden'); }catch(e){} }, 250); }
els.search.addEventListener('input', doSearch);
els.search.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ const first=document.getElementById('suggestions').querySelector('li'); if(first) first.click(); } });
document.getElementById('suggestions').addEventListener('click',(e)=>{ const li=e.target.closest('li'); if(!li) return; document.getElementById('suggestions').classList.add('hidden'); load(+li.dataset.lat, +li.dataset.lon, li.textContent); });

// Location
els.useLocation.addEventListener('click',()=>{ if(!navigator.geolocation) return toast('Geolocation not supported'); navigator.geolocation.getCurrentPosition(async pos=>{ const {latitude:lat, longitude:lon}=pos.coords; const name = await rev(lat,lon).then(j=>j?.[0]?.name||'My Location').catch(()=> 'My Location'); load(lat,lon,name); }, err=>toast(err.message)); });

// Visuals by condition
function setVisual(main){
  const m=(main||'').toLowerCase();
  document.body.classList.remove('rainy','snowy');
  if(m.includes('rain')) document.body.classList.add('rainy');
  if(m.includes('snow')) document.body.classList.add('snowy');
  const el=els.icon; el.className='icon';
  if(m.includes('clear')) el.classList.add('sun');
  else if(m.includes('cloud')) el.style.background='radial-gradient(circle at 50% 40%, #fff, #cdd7ff 60%)';
  else if(m.includes('rain')) el.style.background='radial-gradient(circle at 50% 40%, #96b3ff, #5b7cff 60%)';
  else if(m.includes('snow')) el.style.background='radial-gradient(circle at 50% 40%, #fff, #e6f1ff 60%)';
  else el.style.background='radial-gradient(circle at 50% 40%, #ffd86b, #ffab00 60%)';
}

// Hourly
let chart;
function renderHourly(hours,off){
  document.getElementById('hourlyScroller').innerHTML = hours.slice(0,24).map(h=>`<div class="hour"><div>${new Date((h.dt+off)*1000).toLocaleTimeString([],{hour:'2-digit'})}</div><div style="font-size:20px">${iconEmoji(h.weather?.[0]?.main)}</div><div><b>${fmt(h.temp)}°</b></div><div>${Math.round((h.pop||0)*100)}%</div></div>`).join('');
  const labels=hours.slice(0,24).map(h=>new Date((h.dt+off)*1000).toLocaleTimeString([],{hour:'2-digit'}));
  const temps=hours.slice(0,24).map(h=>Math.round(h.temp));
  if(chart) chart.destroy();
  chart = new Chart(document.getElementById('hourlyChart'), {
    type:'line',
    data:{labels, datasets:[{label:'Temp', data:temps, tension:.35, fill:false}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
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

function renderDaily(days,off){
  document.getElementById('daily').innerHTML = days.slice(0,7).map(d=>`<div class="day"><div>${weekday(d.dt,off)}</div><div style="font-size:24px">${iconEmoji(d.weather?.[0]?.main)}</div><div class="t">${fmt(d.temp.max)}° / ${fmt(d.temp.min)}°</div></div>`).join('');
}

// AQI
function renderAQI(aqiData){
  const aqi=aqiData?.list?.[0];
  if(!aqi){ document.getElementById('aqiVal').textContent='--'; document.getElementById('aqiLabel').textContent=''; return; }
  const level=aqi.main.aqi;
  const names=['—','Good','Fair','Moderate','Poor','Very Poor'];
  document.getElementById('aqiVal').textContent=level;
  document.getElementById('aqiLabel').textContent=names[level]||'';
  const c=aqi.components||{};
  const parts={'PM2.5':c.pm2_5,'PM10':c.pm10,'NO₂':c.no2,'SO₂':c.so2,'O₃':c.o3,'CO':c.co};
  document.getElementById('aqiParts').innerHTML = Object.entries(parts).map(([k,v])=>`<span class='chip'>${k}: ${Math.round(v||0)}</span>`).join('');
}

// Alerts
function renderAlerts(alerts){
  if(!alerts || !alerts.length){ els.alerts.classList.add('empty'); els.alerts.innerHTML = i18n[lang].noAlerts; return; }
  els.alerts.classList.remove('empty');
  els.alerts.innerHTML = alerts.map(a=>`<div class='alert'><b>${a.event||'Alert'}</b><div>${a.sender_name||''}</div><div>${a.description||''}</div></div>`).join('');
}

// Map
let map, layer;
function initMap(lat,lon){
  if(!map){
    map = L.map('map').setView([lat,lon], 6);
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
els.recenter?.addEventListener('click',()=>{ const last=JSON.parse(localStorage.getItem('LAST')||'{}'); if(last.lat) map.setView([last.lat,last.lon],6); });

// Load pipeline
async function load(lat,lon,nameHint){
  try{
    const data=await onecall(lat,lon);
    const aqiData=await aqi(lat,lon);
    const off=data.timezone_offset||0;
    const cur=data.current;
    const w=cur.weather?.[0]||{};
    els.temp.textContent=fmt(cur.temp);
    els.desc.textContent=(w.description||'').replace(/\\b\\w/g,c=>c.toUpperCase());
    els.place.textContent=nameHint || (data.timezone?.split('/')?.pop()?.replace('_',' ')||'—');
    els.humidity.textContent=cur.humidity + '%';
    els.wind.textContent = `${fmt(cur.wind_speed)} {unit:'imperial'?'mph':'m/s'}`; // fixed below after replacement
    els.feels.textContent = fmt(cur.feels_like) + '°';
    els.uv.textContent = cur.uvi;
    els.sunrise.textContent = tstr(cur.sunrise, off);
    els.sunset.textContent = tstr(cur.sunset, off);
    setVisual(w.main);

    renderHourly(data.hourly||[], off);
    renderDaily(data.daily||[], off);
    renderAQI(aqiData);
    renderAlerts(data.alerts||[]);

    localStorage.setItem('LAST', JSON.stringify({lat,lon,name:nameHint||els.place.textContent}));
    initMap(lat,lon);
  }catch(e){ toast('Failed to load data'); console.error(e); }
}

// Fix wind unit label properly
function windUnit(){ return (unit==='imperial') ? 'mph' : 'm/s'; }

// Re-run after graph creation
function finalizeWind(){ els.wind.textContent = els.wind.textContent.replace("{unit:'imperial'?'mph':'m/s'}", windUnit()); }

// Init + bindings
document.addEventListener('keydown',e=>{ if(e.key==='/'){ e.preventDefault(); els.search.focus(); } });

// Bootstrap
(async()=>{
  renderFavs();
  const last=JSON.parse(localStorage.getItem('LAST')||'{}');
  if(last.lat) await load(last.lat,last.lon,last.name);
  else{
    try{
      const res=await geo('New York');
      if(res?.[0]) await load(res[0].lat,res[0].lon, `${res[0].name}, ${res[0].country}`);
    }catch(e){}
  }
  setTimeout(finalizeWind, 800);
})();
