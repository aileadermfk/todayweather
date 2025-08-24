const API_KEY = "6860a02b1fa796c549d5f9652ff8a0fc"; // Your OpenWeather API key

async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) {
    alert("Please enter a city name!");
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod && data.cod !== 200) {
      document.getElementById("weatherResult").innerHTML = `<p style="color:red;">City not found</p>`;
      return;
    }
    document.getElementById("weatherResult").innerHTML = `
      <div class="card">
        <h3>${data.name}, ${data.sys.country}</h3>
        <p>🌡 Temp: ${data.main.temp} °C</p>
        <p>☁ Condition: ${data.weather[0].description}</p>
        <p>💨 Wind: ${data.wind.speed} m/s</p>
        <p>💧 Humidity: ${data.main.humidity}%</p>
      </div>
    `;
  } catch (error) {
    document.getElementById("weatherResult").innerHTML = `<p style="color:red;">Error fetching data</p>`;
    console.error(error);
  }
}

// attach to button and Enter key
document.getElementById("searchBtn").addEventListener("click", getWeather);
document.getElementById("cityInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") getWeather();
});
