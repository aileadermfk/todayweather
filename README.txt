SkyCast PRO
=============
Features
- Pro design with glassmorphism + animated weather backgrounds
- Dark/Light theme toggle (auto detects)
- City search with suggestions + voice search (Web Speech API)
- Current location
- °C/°F toggle (persists)
- 7-day forecast + 24h scroller + hourly chart (Chart.js)
- AQI with pollutant breakdown (PM2.5, PM10, NO2, SO2, O3, CO)
- UV index, sunrise/sunset, wind
- Weather alerts (if available)
- Favorites (multiple saved cities)
- Radar map (Leaflet) with OpenWeather tile layers: precipitation, clouds, temp, wind
- PWA offline caching & install prompt

Setup
1) Open the site and set your OpenWeather API key in the browser console:
   localStorage.setItem('OPENWEATHER_KEY','YOUR_KEY')
   Then reload.
2) For geolocation + PWA install, host over HTTPS (any static host works).

Notes
- Radar tiles use your OpenWeather key (free tier has rate limits).
- Voice search depends on browser support.
