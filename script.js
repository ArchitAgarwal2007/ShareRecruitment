"use strict";

/* =========================================
   WAYFARER WEATHER APP
   Open-Meteo API
========================================= */

const API = {
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  forecast: "https://api.open-meteo.com/v1/forecast"
};

const state = {
  location: null,
  weather: null,
  forecastDays: [],
  unit: "celsius",
  isLoading: false,
  lastSearch: null,
  selectedStartDate: null,
  selectedEndDate: null,
  searchTimeout: null
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  body: document.body,

  searchForm: $("#searchForm"),
  destination: $("#destination"),
  startDate: $("#startDate"),
  endDate: $("#endDate"),
  forecastButton: $("#forecastButton"),
  buttonText: $(".button-text"),
  buttonArrow: $(".button-arrow"),
  buttonLoader: $(".button-loader"),
  clearDestination: $("#clearDestination"),

  locationSuggestions: $("#locationSuggestions"),

  errorPanel: $("#errorPanel"),
  errorTitle: $("#errorTitle"),
  errorMessage: $("#errorMessage"),
  retryButton: $("#retryButton"),

  resultsSection: $("#resultsSection"),
  lastUpdated: $("#lastUpdated"),

  locationName: $("#locationName"),
  locationCountry: $("#locationCountry"),
  locationCoordinates: $("#locationCoordinates"),
  dateRangeText: $("#dateRangeText"),

  currentTime: $("#currentTime"),
  currentWeatherIcon: $("#currentWeatherIcon"),
  currentTemperature: $("#currentTemperature"),
  currentCondition: $("#currentCondition"),
  feelsLike: $("#feelsLike"),
  currentHumidity: $("#currentHumidity"),
  currentWind: $("#currentWind"),
  currentUV: $("#currentUV"),
  currentLocationText: $("#currentLocationText"),

  decisionCard: $(".decision-card"),
  decisionBadge: $("#decisionBadge"),
  decisionBadgeText: $("#decisionBadgeText"),
  decisionTitle: $("#decisionTitle"),
  decisionDescription: $("#decisionDescription"),
  decisionScore: $("#decisionScore"),
  scoreFill: $("#scoreFill"),
  decisionFooter: $("#decisionFooter"),

  rangeMetric: $("#rangeMetric"),
  rainMetric: $("#rainMetric"),
  windMetric: $("#windMetric"),
  bestDayMetric: $("#bestDayMetric"),

  forecastCards: $("#forecastCards"),
  forecastScroll: $("#forecastScroll"),
  scrollLeft: $("#scrollLeft"),
  scrollRight: $("#scrollRight"),

  chartY1: $("#chartY1"),
  chartY2: $("#chartY2"),
  chartY3: $("#chartY3"),
  chartY4: $("#chartY4"),
  chartBars: $("#chartBars"),
  chartXLabels: $("#chartXLabels"),

  sunriseTime: $("#sunriseTime"),
  sunsetTime: $("#sunsetTime"),
  daylightDuration: $("#daylightDuration"),
  sunBall: $("#sunBall"),

  recommendationSubtitle: $("#recommendationSubtitle"),
  recommendationGrid: $("#recommendationGrid"),
  notesGrid: $("#notesGrid"),

  unitToggle: $("#unitToggle"),
  themeButton: $("#themeButton"),
  moonIcon: $(".moon-icon"),
  sunIcon: $(".sun-icon"),

  toast: $("#toast"),
  toastMessage: $("#toastMessage")
};

/* =========================================
   WEATHER CODE HELPERS
========================================= */

function getWeatherInfo(code, isDay = true) {
  const weatherMap = {
    0: {
      label: isDay ? "Clear sky" : "Clear night",
      icon: isDay ? "☀️" : "🌙",
      type: "clear"
    },
    1: {
      label: "Mainly clear",
      icon: isDay ? "🌤️" : "🌙",
      type: "clear"
    },
    2: {
      label: "Partly cloudy",
      icon: "⛅",
      type: "cloud"
    },
    3: {
      label: "Overcast",
      icon: "☁️",
      type: "cloud"
    },
    45: {
      label: "Fog",
      icon: "🌫️",
      type: "fog"
    },
    48: {
      label: "Rime fog",
      icon: "🌫️",
      type: "fog"
    },
    51: {
      label: "Light drizzle",
      icon: "🌦️",
      type: "rain"
    },
    53: {
      label: "Drizzle",
      icon: "🌦️",
      type: "rain"
    },
    55: {
      label: "Heavy drizzle",
      icon: "🌧️",
      type: "rain"
    },
    56: {
      label: "Freezing drizzle",
      icon: "🌧️",
      type: "rain"
    },
    57: {
      label: "Heavy freezing drizzle",
      icon: "🌧️",
      type: "rain"
    },
    61: {
      label: "Light rain",
      icon: "🌦️",
      type: "rain"
    },
    63: {
      label: "Rain",
      icon: "🌧️",
      type: "rain"
    },
    65: {
      label: "Heavy rain",
      icon: "🌧️",
      type: "rain"
    },
    66: {
      label: "Freezing rain",
      icon: "🌧️",
      type: "rain"
    },
    67: {
      label: "Heavy freezing rain",
      icon: "🌧️",
      type: "rain"
    },
    71: {
      label: "Light snow",
      icon: "🌨️",
      type: "snow"
    },
    73: {
      label: "Snow",
      icon: "❄️",
      type: "snow"
    },
    75: {
      label: "Heavy snow",
      icon: "❄️",
      type: "snow"
    },
    77: {
      label: "Snow grains",
      icon: "🌨️",
      type: "snow"
    },
    80: {
      label: "Light showers",
      icon: "🌦️",
      type: "rain"
    },
    81: {
      label: "Rain showers",
      icon: "🌧️",
      type: "rain"
    },
    82: {
      label: "Heavy showers",
      icon: "⛈️",
      type: "rain"
    },
    85: {
      label: "Snow showers",
      icon: "🌨️",
      type: "snow"
    },
    86: {
      label: "Heavy snow showers",
      icon: "❄️",
      type: "snow"
    },
    95: {
      label: "Thunderstorm",
      icon: "⛈️",
      type: "storm"
    },
    96: {
      label: "Thunderstorm with hail",
      icon: "⛈️",
      type: "storm"
    },
    99: {
      label: "Heavy thunderstorm",
      icon: "⛈️",
      type: "storm"
    }
  };

  return weatherMap[code] || {
    label: "Unknown conditions",
    icon: "🌡️",
    type: "unknown"
  };
}

/* =========================================
   DATE HELPERS
========================================= */

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateToInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseLocalDate(dateString) {
  if (!dateString) return null;

  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateString, options = {}) {
  const date = parseLocalDate(dateString);

  if (!date || Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    ...options
  }).format(date);
}

function formatLongDate(dateString) {
  const date = parseLocalDate(dateString);

  if (!date) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

function formatDay(dateString) {
  const date = parseLocalDate(dateString);

  if (!date) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short"
  }).format(date);
}

function formatTime(dateTimeString) {
  if (!dateTimeString) return "--:--";

  const time = dateTimeString.split("T")[1];

  if (!time) return "--:--";

  return time.slice(0, 5);
}

function getToday() {
  return new Date();
}

function getDateAfterDays(days) {
  const date = getToday();
  date.setDate(date.getDate() + days);
  return date;
}

function isDateInRange(dateString, startDate, endDate) {
  return dateString >= startDate && dateString <= endDate;
}

function getDaysBetween(startDate, endDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (!start || !end) return 0;

  const difference = end.getTime() - start.getTime();

  return Math.floor(difference / 86400000) + 1;
}

/* =========================================
   UNIT HELPERS
========================================= */

function convertTemperature(celsius) {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) {
    return "--";
  }

  if (state.unit === "fahrenheit") {
    return Math.round((celsius * 9) / 5 + 32);
  }

  return Math.round(celsius);
}

function temperatureUnit() {
  return state.unit === "fahrenheit" ? "°F" : "°C";
}

function formatTemperature(value) {
  return `${convertTemperature(value)}${temperatureUnit()}`;
}

function formatWind(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)} km/h`;
}

/* =========================================
   DEFAULT DATES
========================================= */

function initializeDates() {
  const today = getToday();
  const end = getDateAfterDays(6);
  const maxDate = getDateAfterDays(13);

  const todayValue = dateToInputValue(today);
  const endValue = dateToInputValue(end);
  const maxValue = dateToInputValue(maxDate);

  elements.startDate.min = todayValue;
  elements.startDate.max = maxValue;

  elements.endDate.min = todayValue;
  elements.endDate.max = maxValue;

  elements.startDate.value = todayValue;
  elements.endDate.value = endValue;

  state.selectedStartDate = todayValue;
  state.selectedEndDate = endValue;
}

/* =========================================
   API HELPERS
========================================= */

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function searchLocations(query) {
  const url = new URL(API.geocoding);

  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await fetchJSON(url);

  return data.results || [];
}

async function fetchWeather(latitude, longitude) {
  const url = new URL(API.forecast);

  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);

  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m"
    ].join(",")
  );

  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m",
      "uv_index"
    ].join(",")
  );

  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "sunrise",
      "sunset",
      "daylight_duration",
      "precipitation_sum",
      "rain_sum",
      "showers_sum",
      "snowfall_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "uv_index_max"
    ].join(",")
  );

  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "14");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");

  return fetchJSON(url);
}

/* =========================================
   UI STATE
========================================= */

function setLoading(isLoading) {
  state.isLoading = isLoading;

  elements.forecastButton.disabled = isLoading;
  elements.destination.disabled = isLoading;
  elements.startDate.disabled = isLoading;
  elements.endDate.disabled = isLoading;

  if (isLoading) {
    elements.buttonText.classList.add("hidden");
    elements.buttonArrow.classList.add("hidden");
    elements.buttonLoader.classList.remove("hidden");
  } else {
    elements.buttonText.classList.remove("hidden");
    elements.buttonArrow.classList.remove("hidden");
    elements.buttonLoader.classList.add("hidden");
  }
}

function showError(title, message) {
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.errorPanel.classList.remove("hidden");
  elements.resultsSection.classList.add("hidden");
}

function hideError() {
  elements.errorPanel.classList.add("hidden");
}

function showResults() {
  elements.resultsSection.classList.remove("hidden");
  hideError();
}

function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove("hidden");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3000);
}

/* =========================================
   LOCATION SEARCH
========================================= */

function renderLocationSuggestions(results) {
  if (!results.length) {
    elements.locationSuggestions.innerHTML = `
      <div class="suggestion-item">
        <div class="suggestion-pin">?</div>
        <div class="suggestion-text">
          <strong>No locations found</strong>
          <span>Try another city name</span>
        </div>
      </div>
    `;

    elements.locationSuggestions.classList.remove("hidden");
    return;
  }

  elements.locationSuggestions.innerHTML = results
    .map((location, index) => {
      const country = location.country || "";
      const admin = location.admin1 || "";

      return `
        <div
          class="suggestion-item"
          data-location-index="${index}"
          role="button"
          tabindex="0"
        >
          <div class="suggestion-pin">⌖</div>
          <div class="suggestion-text">
            <strong>${escapeHTML(location.name || "Unknown")}</strong>
            <span>${escapeHTML([admin, country].filter(Boolean).join(", "))}</span>
          </div>
        </div>
      `;
    })
    .join("");

  elements.locationSuggestions.classList.remove("hidden");

  elements.locationSuggestions.querySelectorAll("[data-location-index]").forEach((item) => {
    item.addEventListener("click", () => {
      const index = Number(item.dataset.locationIndex);
      const location = results[index];

      state.location = location;
      elements.destination.value = location.name;
      elements.clearDestination.classList.remove("hidden");
      elements.locationSuggestions.classList.add("hidden");
    });
  });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function handleDestinationInput() {
  const query = elements.destination.value.trim();

  elements.clearDestination.classList.toggle("hidden", !query);

  state.location = null;

  if (query.length < 2) {
    elements.locationSuggestions.classList.add("hidden");
    return;
  }

  clearTimeout(state.searchTimeout);

  state.searchTimeout = setTimeout(async () => {
    try {
      const results = await searchLocations(query);
      renderLocationSuggestions(results);
    } catch (error) {
      elements.locationSuggestions.classList.add("hidden");
    }
  }, 350);
}

/* =========================================
   MAIN SEARCH
========================================= */

async function handleSearch(event) {
  event.preventDefault();

  if (state.isLoading) return;

  const destination = elements.destination.value.trim();
  const startDate = elements.startDate.value;
  const endDate = elements.endDate.value;

  if (!destination) {
    showError("Destination required", "Please enter a city to view its forecast.");
    return;
  }

  if (!startDate || !endDate) {
    showError("Dates required", "Please select both a start and end date.");
    return;
  }

  if (endDate < startDate) {
    showError("Invalid date range", "The end date must be after the start date.");
    return;
  }

  const days = getDaysBetween(startDate, endDate);

  if (days > 14) {
    showError(
      "Forecast range too long",
      "Please select a range of 14 days or fewer. Open-Meteo provides forecasts up to 14 days here."
    );
    return;
  }

  state.selectedStartDate = startDate;
  state.selectedEndDate = endDate;

  setLoading(true);

  try {
    let location = state.location;

    if (!location || location.name.toLowerCase() !== destination.toLowerCase()) {
      const results = await searchLocations(destination);

      if (!results.length) {
        throw new Error("No location found");
      }

      location = results[0];
      state.location = location;
    }

    const weather = await fetchWeather(location.latitude, location.longitude);

    state.weather = weather;
    state.lastSearch = {
      destination,
      startDate,
      endDate
    };

    renderAll();
    showResults();

    elements.resultsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    showToast("Forecast updated successfully");
  } catch (error) {
    console.error(error);

    showError(
      "Forecast unavailable",
      "We couldn't retrieve weather data for this location. Please check your city name or try again."
    );
  } finally {
    setLoading(false);
  }
}

/* =========================================
   RENDER ALL
========================================= */

function renderAll() {
  renderLocation();
  renderCurrentWeather();
  renderDecision();
  renderMetrics();
  renderForecastCards();
  renderChart();
  renderSunData();
  renderRecommendations();
  renderWeatherNotes();

  elements.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

/* =========================================
   LOCATION RENDER
========================================= */

function renderLocation() {
  const location = state.location;

  if (!location) return;

  elements.locationName.textContent = location.name || "Unknown location";

  elements.locationCountry.textContent = (
    location.country_code ||
    location.country ||
    "WORLD"
  ).toUpperCase();

  elements.locationCoordinates.textContent =
    `${Number(location.latitude).toFixed(2)}° ${location.latitude >= 0 ? "N" : "S"}   ` +
    `${Number(Math.abs(location.longitude)).toFixed(2)}° ${location.longitude >= 0 ? "E" : "W"}`;

  const start = state.selectedStartDate;
  const end = state.selectedEndDate;

  if (start === end) {
    elements.dateRangeText.textContent = formatLongDate(start);
  } else {
    elements.dateRangeText.textContent =
      `${formatDate(start)} — ${formatDate(end)} · ${getDaysBetween(start, end)} days`;
  }

  elements.currentLocationText.textContent =
    `${location.name || "Your destination"} · Live conditions`;
}

/* =========================================
   CURRENT WEATHER
========================================= */

function renderCurrentWeather() {
  const weather = state.weather;

  if (!weather || !weather.current) return;

  const current = weather.current;
  const weatherInfo = getWeatherInfo(current.weather_code, Boolean(current.is_day));

  elements.currentWeatherIcon.textContent = weatherInfo.icon;
  elements.currentTemperature.textContent = convertTemperature(current.temperature_2m);
  elements.currentCondition.textContent = weatherInfo.label;
  elements.feelsLike.textContent = formatTemperature(current.apparent_temperature);
  elements.currentHumidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  elements.currentWind.textContent = formatWind(current.wind_speed_10m);

  const todayIndex = getTodayForecastIndex();

  if (
    todayIndex !== -1 &&
    weather.daily &&
    weather.daily.uv_index_max
  ) {
    elements.currentUV.textContent = formatUV(weather.daily.uv_index_max[todayIndex]);
  } else {
    elements.currentUV.textContent = "--";
  }

  const timezone = weather.timezone_abbreviation || weather.timezone || "";

  elements.currentTime.textContent = timezone
    ? `${formatTime(current.time)} ${timezone}`
    : formatTime(current.time);
}

function formatUV(uv) {
  if (uv === null || uv === undefined) return "--";

  const value = Number(uv);

  if (value < 3) return `${Math.round(value)} · Low`;
  if (value < 6) return `${Math.round(value)} · Moderate`;
  if (value < 8) return `${Math.round(value)} · High`;
  if (value < 11) return `${Math.round(value)} · Very high`;

  return `${Math.round(value)} · Extreme`;
}

function getTodayForecastIndex() {
  if (!state.weather || !state.weather.daily) return -1;

  const today = dateToInputValue(new Date());

  return state.weather.daily.time.indexOf(today);
}

/* =========================================
   FORECAST DATA
========================================= */

function getForecastDays() {
  const daily = state.weather?.daily;

  if (!daily || !daily.time) return [];

  return daily.time.map((date, index) => ({
    date,
    weatherCode: daily.weather_code?.[index] ?? 0,
    high: daily.temperature_2m_max?.[index] ?? null,
    low: daily.temperature_2m_min?.[index] ?? null,
    feelsHigh: daily.apparent_temperature_max?.[index] ?? null,
    feelsLow: daily.apparent_temperature_min?.[index] ?? null,
    sunrise: daily.sunrise?.[index] ?? null,
    sunset: daily.sunset?.[index] ?? null,
    daylightDuration: daily.daylight_duration?.[index] ?? null,
    precipitation: daily.precipitation_sum?.[index] ?? 0,
    rain: daily.rain_sum?.[index] ?? 0,
    showers: daily.showers_sum?.[index] ?? 0,
    snow: daily.snowfall_sum?.[index] ?? 0,
    rainProbability: daily.precipitation_probability_max?.[index] ?? 0,
    windMax: daily.wind_speed_10m_max?.[index] ?? 0,
    uvMax: daily.uv_index_max?.[index] ?? 0
  }));
}

function getSelectedForecastDays() {
  const allDays = state.forecastDays.length
    ? state.forecastDays
    : getForecastDays();

  return allDays.filter((day) =>
    isDateInRange(
      day.date,
      state.selectedStartDate,
      state.selectedEndDate
    )
  );
}

/* =========================================
   DECISION ENGINE
========================================= */

function calculateTravelScore(days) {
  if (!days.length) {
    return {
      score: 0,
      category: "moderate",
      title: "Not enough data",
      description: "We need a valid forecast period to make a recommendation.",
      footer: "Select a valid date range and try again."
    };
  }

  let score = 100;

  let rainyDays = 0;
  let stormDays = 0;
  let snowDays = 0;
  let extremeHeatDays = 0;
  let extremeColdDays = 0;
  let highWindDays = 0;
  let highUVDays = 0;

  let totalRainProbability = 0;
  let totalRainAmount = 0;

  days.forEach((day) => {
    const info = getWeatherInfo(day.weatherCode);

    totalRainProbability += Number(day.rainProbability || 0);
    totalRainAmount += Number(day.precipitation || 0);

    if (info.type === "rain") {
      rainyDays++;
      score -= 7;
    }

    if (info.type === "storm") {
      stormDays++;
      score -= 18;
    }

    if (info.type === "snow") {
      snowDays++;
      score -= 10;
    }

    if (day.high >= 40) {
      extremeHeatDays++;
      score -= 8;
    } else if (day.high >= 36) {
      score -= 3;
    }

    if (day.low <= 2) {
      extremeColdDays++;
      score -= 7;
    }

    if (day.windMax >= 40) {
      highWindDays++;
      score -= 6;
    }

    if (day.uvMax >= 8) {
      highUVDays++;
      score -= 2;
    }
  });

  const averageRainProbability = totalRainProbability / days.length;

  if (averageRainProbability > 65) {
    score -= 8;
  } else if (averageRainProbability > 45) {
    score -= 4;
  }

  if (totalRainAmount > 50) {
    score -= 10;
  } else if (totalRainAmount > 25) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let category = "good";
  let title = "Looks good to go.";
  let description = "The forecast looks friendly for making plans.";
  let footer = "Pack thoughtfully and enjoy the journey.";

  if (score < 45) {
    category = "bad";
    title = "Consider another window.";
    description = "Several challenging conditions could affect your plans.";
    footer = "If you travel, keep your plans flexible and check updates.";
  } else if (score < 70) {
    category = "moderate";
    title = "Go, with a little planning.";
    description = "There are some weather variables worth preparing for.";
    footer = "A flexible itinerary and the right gear will help.";
  }

  if (stormDays > 0) {
    category = "bad";
    title = "Storms are in the picture.";
    description = "Thunderstorm conditions may affect outdoor activities.";
    footer = "Keep an eye on local alerts before heading out.";
  }

  if (extremeHeatDays >= Math.ceil(days.length / 2)) {
    category = score >= 55 ? "moderate" : "bad";
    title = "Plan around the heat.";
    description = "High temperatures could make outdoor plans uncomfortable.";
    footer = "Prioritise shade, hydration and early or late activities.";
  }

  return {
    score,
    category,
    title,
    description,
    footer,
    rainyDays,
    stormDays,
    snowDays,
    extremeHeatDays,
    extremeColdDays,
    highWindDays,
    highUVDays,
    averageRainProbability,
    totalRainAmount
  };
}

function renderDecision() {
  const days = getSelectedForecastDays();
  const result = calculateTravelScore(days);

  elements.decisionCard.classList.remove("good", "moderate", "bad");
  elements.decisionCard.classList.add(result.category);

  elements.decisionBadgeText.textContent =
    result.category === "good"
      ? "FAVOURABLE CONDITIONS"
      : result.category === "moderate"
        ? "MIXED CONDITIONS"
        : "CAUTION ADVISED";

  elements.decisionTitle.textContent = result.title;
  elements.decisionDescription.textContent = result.description;
  elements.decisionScore.textContent = result.score;
  elements.scoreFill.style.width = `${result.score}%`;
  elements.decisionFooter.textContent = result.footer;
}

/* =========================================
   METRICS
========================================= */

function renderMetrics() {
  const days = getSelectedForecastDays();

  if (!days.length) return;

  const highs = days.map((day) => day.high).filter(Number.isFinite);
  const lows = days.map((day) => day.low).filter(Number.isFinite);
  const rainProbabilities = days.map((day) => day.rainProbability).filter(Number.isFinite);
  const winds = days.map((day) => day.windMax).filter(Number.isFinite);

  const minTemp = Math.min(...lows);
  const maxTemp = Math.max(...highs);

  const averageRain = rainProbabilities.length
    ? Math.round(rainProbabilities.reduce((a, b) => a + b, 0) / rainProbabilities.length)
    : 0;

  const averageWind = winds.length
    ? Math.round(winds.reduce((a, b) => a + b, 0) / winds.length)
    : 0;

  const bestDay = [...days].sort((a, b) => {
    const scoreA = getDayComfortScore(a);
    const scoreB = getDayComfortScore(b);
    return scoreB - scoreA;
  })[0];

  elements.rangeMetric.textContent =
    `${formatTemperature(minTemp)} / ${formatTemperature(maxTemp)}`;

  elements.rainMetric.textContent = `${averageRain}%`;
  elements.windMetric.textContent = `${averageWind} km/h`;
  elements.bestDayMetric.textContent = bestDay ? formatDay(bestDay.date) : "--";
}

function getDayComfortScore(day) {
  let score = 100;

  const info = getWeatherInfo(day.weatherCode);

  if (info.type === "rain") score -= 30;
  if (info.type === "storm") score -= 60;
  if (info.type === "snow") score -= 25;
  if (day.rainProbability > 60) score -= 20;
  if (day.high > 38) score -= 20;
  if (day.high > 42) score -= 25;
  if (day.low < 4) score -= 15;
  if (day.windMax > 35) score -= 15;
  if (day.uvMax > 9) score -= 5;

  const idealDistance = Math.abs((day.high + day.low) / 2 - 25);
  score -= idealDistance * 1.5;

  return score;
}

/* =========================================
   FORECAST CARDS
========================================= */

function renderForecastCards() {
  const days = getSelectedForecastDays();

  if (!days.length) {
    elements.forecastCards.innerHTML = `
      <div class="forecast-card">
        No forecast available.
      </div>
    `;
    return;
  }

  const today = dateToInputValue(new Date());

  elements.forecastCards.innerHTML = days
    .map((day) => {
      const info = getWeatherInfo(day.weatherCode);
      const isToday = day.date === today;

      return `
        <div class="forecast-card ${isToday ? "today" : ""}">
          <div class="forecast-day">${isToday ? "TODAY" : formatDay(day.date).toUpperCase()}</div>
          <div class="forecast-date">${formatDate(day.date)}</div>
          <div class="forecast-icon">${info.icon}</div>
          <div class="forecast-condition">${info.label}</div>
          <div class="forecast-temperatures">
            <span class="forecast-high">${formatTemperature(day.high)}</span>
            <span class="forecast-low">${formatTemperature(day.low)}</span>
          </div>
          <div class="forecast-rain">
            <span>💧</span>
            <span>${Math.round(day.rainProbability)}%</span>
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================================
   TEMPERATURE CHART
========================================= */

function renderChart() {
  const days = getSelectedForecastDays();

  if (!days.length) return;

  const highs = days.map((day) => convertTemperature(day.high));
  const lows = days.map((day) => convertTemperature(day.low));

  const allValues = [...highs, ...lows].filter(Number.isFinite);

  if (!allValues.length) return;

  const max = Math.max(...allValues);
  const min = Math.min(...allValues);

  const padding = Math.max(4, Math.round((max - min) * 0.18));
  const chartMax = max + padding;
  const chartMin = min - padding;
  const chartRange = Math.max(1, chartMax - chartMin);

  const chartLabels = [
    chartMax,
    Math.round(chartMax - chartRange / 3),
    Math.round(chartMax - (chartRange * 2) / 3),
    chartMin
  ];

  elements.chartY1.textContent = `${chartLabels[0]}°`;
  elements.chartY2.textContent = `${chartLabels[1]}°`;
  elements.chartY3.textContent = `${chartLabels[2]}°`;
  elements.chartY4.textContent = `${chartLabels[3]}°`;

  elements.chartBars.innerHTML = days
    .map((day) => {
      const high = convertTemperature(day.high);
      const low = convertTemperature(day.low);

      const highHeight = ((high - chartMin) / chartRange) * 100;
      const lowHeight = ((low - chartMin) / chartRange) * 100;

      return `
        <div class="chart-bar-group">
          <div class="chart-tooltip">${high}${temperatureUnit()}</div>
          <div class="chart-bar low" style="height: ${Math.max(5, lowHeight)}%"></div>
          <div class="chart-bar high" style="height: ${Math.max(5, highHeight)}%"></div>
        </div>
      `;
    })
    .join("");

  elements.chartXLabels.innerHTML = days
    .map((day) => {
      return `<span>${formatDay(day.date)}</span>`;
    })
    .join("");
}

/* =========================================
   SUN DATA
========================================= */

function renderSunData() {
  const days = getSelectedForecastDays();

  if (!days.length) return;

  const firstDay = days[0];

  elements.sunriseTime.textContent = formatTime(firstDay.sunrise);
  elements.sunsetTime.textContent = formatTime(firstDay.sunset);

  const duration = Number(firstDay.daylightDuration || 0);

  if (duration > 0) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.round((duration % 3600) / 60);

    elements.daylightDuration.textContent =
      `${hours}h ${pad(minutes)}m`;
  } else {
    elements.daylightDuration.textContent = "-- hours";
  }

  const sunriseHour = Number(formatTime(firstDay.sunrise).split(":")[0]) || 6;
  const sunsetHour = Number(formatTime(firstDay.sunset).split(":")[0]) || 18;

  const currentHour = new Date().getHours();
  const daylightProgress =
    ((currentHour - sunriseHour) / Math.max(1, sunsetHour - sunriseHour)) * 100;

  const clampedProgress = Math.max(10, Math.min(90, daylightProgress));

  elements.sunBall.style.left = `${clampedProgress}%`;
}

/* =========================================
   RECOMMENDATIONS
========================================= */

function renderRecommendations() {
  const days = getSelectedForecastDays();
  const result = calculateTravelScore(days);

  if (!days.length) return;

  const averageHigh =
    days.reduce((sum, day) => sum + Number(day.high || 0), 0) / days.length;

  const averageLow =
    days.reduce((sum, day) => sum + Number(day.low || 0), 0) / days.length;

  const averageRain =
    days.reduce((sum, day) => sum + Number(day.rainProbability || 0), 0) / days.length;

  let clothingIcon = "🧥";
  let clothingTitle = "Layer up";
  let clothingText = "Bring light layers so you can adjust comfortably through the day.";

  if (averageHigh >= 34) {
    clothingIcon = "🧢";
    clothingTitle = "Keep it light";
    clothingText = "Breathable clothing, sunglasses and sun protection are a good idea.";
  } else if (averageHigh >= 25) {
    clothingIcon = "👕";
    clothingTitle = "Comfortable layers";
    clothingText = "Light clothing with a thin layer for cooler mornings should work well.";
  } else if (averageHigh <= 12) {
    clothingIcon = "🧣";
    clothingTitle = "Dress warmly";
    clothingText = "Pack warm layers, especially for mornings and evenings.";
  }

  let activityIcon = "🥾";
  let activityTitle = "Outdoor plans";
  let activityText = "The forecast supports exploring outdoors and making the most of the day.";

  if (result.stormDays > 0) {
    activityIcon = "🏠";
    activityTitle = "Keep plans flexible";
    activityText = "Thunderstorm conditions may interrupt outdoor plans. Have an indoor backup.";
  } else if (averageRain >= 60) {
    activityIcon = "☔";
    activityTitle = "Rain-ready itinerary";
    activityText = "Choose activities with shelter nearby and keep an umbrella or rain jacket handy.";
  } else if (averageHigh >= 37) {
    activityIcon = "🌴";
    activityTitle = "Beat the heat";
    activityText = "Plan outdoor activities early or late and keep indoor breaks in your schedule.";
  }

  let essentialsIcon = "🎒";
  let essentialsTitle = "Travel essentials";
  let essentialsText = "Carry water, comfortable shoes and a small day bag for your plans.";

  if (averageRain >= 50) {
    essentialsIcon = "☔";
    essentialsTitle = "Rain protection";
    essentialsText = "An umbrella, waterproof bag cover and quick-drying footwear will help.";
  } else if (result.highUVDays > 0) {
    essentialsIcon = "🧴";
    essentialsTitle = "Sun protection";
    essentialsText = "Sunscreen, sunglasses and a hat are worth packing for brighter hours.";
  } else if (averageLow <= 8) {
    essentialsIcon = "🧤";
    essentialsTitle = "Warmth for evenings";
    essentialsText = "Keep a warm outer layer nearby for after sunset.";
  }

  elements.recommendationSubtitle.textContent =
    `${formatDate(state.selectedStartDate)} to ${formatDate(state.selectedEndDate)} · Personalised from your forecast`;

  elements.recommendationGrid.innerHTML = `
    <div class="recommendation-item">
      <div class="recommendation-item-icon">${clothingIcon}</div>
      <h3>${clothingTitle}</h3>
      <p>${clothingText}</p>
    </div>

    <div class="recommendation-item">
      <div class="recommendation-item-icon">${activityIcon}</div>
      <h3>${activityTitle}</h3>
      <p>${activityText}</p>
    </div>

    <div class="recommendation-item">
      <div class="recommendation-item-icon">${essentialsIcon}</div>
      <h3>${essentialsTitle}</h3>
      <p>${essentialsText}</p>
    </div>
  `;
}

/* =========================================
   WEATHER NOTES
========================================= */

function renderWeatherNotes() {
  const days = getSelectedForecastDays();
  const result = calculateTravelScore(days);

  if (!days.length) return;

  const hottestDay = [...days].sort((a, b) => b.high - a.high)[0];
  const wettestDay = [...days].sort((a, b) => b.precipitation - a.precipitation)[0];
  const windiestDay = [...days].sort((a, b) => b.windMax - a.windMax)[0];

  const notes = [];

  if (hottestDay) {
    notes.push({
      title: "Warmest day",
      text: `${formatDay(hottestDay.date)} looks warmest, reaching ${formatTemperature(hottestDay.high)}.`
    });
  }

  if (wettestDay && wettestDay.precipitation > 0) {
    notes.push({
      title: "Rain watch",
      text: `${formatDay(wettestDay.date)} has the highest expected precipitation at ${Math.round(wettestDay.rainProbability)}% probability.`
    });
  } else {
    notes.push({
      title: "Rain outlook",
      text: "The selected period shows little or no expected precipitation."
    });
  }

  if (result.highWindDays > 0) {
    notes.push({
      title: "Wind advisory",
      text: "Some days may be breezy. Take extra care with exposed outdoor activities."
    });
  } else if (result.highUVDays > 0) {
    notes.push({
      title: "UV awareness",
      text: "UV levels may be high on some days. Plan shade breaks and use sun protection."
    });
  } else {
    notes.push({
      title: "Comfort outlook",
      text: "No major weather disruptions stand out across the selected forecast period."
    });
  }

  elements.notesGrid.innerHTML = notes
    .map((note) => {
      return `
        <div class="note-item">
          <h3>${note.title}</h3>
          <p>${note.text}</p>
        </div>
      `;
    })
    .join("");
}

/* =========================================
   THEME
========================================= */

function initializeTheme() {
  const savedTheme = localStorage.getItem("wayfarer-theme");

  if (savedTheme === "light") {
    elements.body.classList.add("light-theme");
    elements.moonIcon.classList.add("hidden");
    elements.sunIcon.classList.remove("hidden");
  }
}

function toggleTheme() {
  const isLight = elements.body.classList.toggle("light-theme");

  localStorage.setItem("wayfarer-theme", isLight ? "light" : "dark");

  elements.moonIcon.classList.toggle("hidden", isLight);
  elements.sunIcon.classList.toggle("hidden", !isLight);
}

/* =========================================
   UNIT TOGGLE
========================================= */

function updateUnitToggle() {
  const isFahrenheit = state.unit === "fahrenheit";

  elements.unitToggle.innerHTML = `
    <span class="${!isFahrenheit ? "unit-active" : ""}">°C</span>
    <span>/</span>
    <span class="${isFahrenheit ? "unit-active" : ""}">°F</span>
  `;
}

function toggleUnit() {
  state.unit = state.unit === "celsius" ? "fahrenheit" : "celsius";

  updateUnitToggle();

  if (state.weather) {
    renderAll();
    showToast(`Temperature switched to ${state.unit === "celsius" ? "Celsius" : "Fahrenheit"}`);
  }
}

/* =========================================
   EVENT LISTENERS
========================================= */

elements.searchForm.addEventListener("submit", handleSearch);

elements.destination.addEventListener("input", handleDestinationInput);

elements.destination.addEventListener("focus", () => {
  if (elements.destination.value.trim().length >= 2) {
    handleDestinationInput();
  }
});

elements.clearDestination.addEventListener("click", () => {
  elements.destination.value = "";
  elements.destination.focus();
  state.location = null;
  elements.clearDestination.classList.add("hidden");
  elements.locationSuggestions.classList.add("hidden");
});

elements.retryButton.addEventListener("click", () => {
  if (state.lastSearch) {
    elements.destination.value = state.lastSearch.destination;
    elements.startDate.value = state.lastSearch.startDate;
    elements.endDate.value = state.lastSearch.endDate;

    handleSearch(new Event("submit", {
      cancelable: true
    }));
  } else {
    handleSearch(new Event("submit", {
      cancelable: true
    }));
  }
});

elements.themeButton.addEventListener("click", toggleTheme);
elements.unitToggle.addEventListener("click", toggleUnit);

elements.scrollLeft.addEventListener("click", () => {
  elements.forecastScroll.scrollBy({
    left: -350,
    behavior: "smooth"
  });
});

elements.scrollRight.addEventListener("click", () => {
  elements.forecastScroll.scrollBy({
    left: 350,
    behavior: "smooth"
  });
});

elements.startDate.addEventListener("change", () => {
  const start = elements.startDate.value;

  if (!start) return;

  elements.endDate.min = start;

  if (elements.endDate.value < start) {
    elements.endDate.value = start;
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".destination-field")) {
    elements.locationSuggestions.classList.add("hidden");
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    elements.locationSuggestions.classList.add("hidden");
  }
});

/* =========================================
   INITIALIZATION
========================================= */

async function initializeApp() {
  initializeDates();
  initializeTheme();
  updateUnitToggle();

  elements.destination.value = "Delhi";
  elements.clearDestination.classList.remove("hidden");

  try {
    const results = await searchLocations("Delhi");

    if (results.length) {
      state.location = results[0];
    }
  } catch (error) {
    console.warn("Default location lookup failed.");
  }
}

initializeApp();