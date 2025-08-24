async function getWeather() {
  const city = document.getElementById('cityInput').value;
  if (!city) {
    alert('Please enter a city');
    return;
  }
  const apiKey = "6860a02b1fa796c549d5f9652ff8a0fc"; // Your OpenWeatherMap API key
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod === "404") {
      alert("City not found!");
      return;
    }
    document.getElementById("cityName").textContent = data.name;
    document.getElementById("temperature").textContent = data.main.temp + "°C";
    document.getElementById("condition").textContent = data.weather[0].description;
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }
}