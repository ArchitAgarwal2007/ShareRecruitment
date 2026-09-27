"use strict";

/*
  WAYFARER
  Weather → Decision engine

  APIs:
  1. Open-Meteo Geocoding
  2. Open-Meteo Forecast

  The important part of this project is NOT displaying numbers.
  The numbers are converted into plain-language advice.
*/


const GEO_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";


const state = {
  location: null,
  weather: null,

  startDate: null,
  endDate: null,

  days: [],

  unit: "celsius",

  lastSearch: null
};


const $ = selector => document.querySelector(selector);


/* =========================
ELEMENTS
========================= */

const cityInput = $("#cityInput");
const startDate = $("#startDate");
const endDate = $("#endDate");

const searchForm = $("#searchForm");
const submitBtn = $("#submitBtn");
const submitText = $("#submitText");
const loader = $("#loader");

const suggestions = $("#suggestions");
const clearCity = $("#clearCity");

const errorState = $("#errorState");
const errorTitle = $("#errorTitle");
const errorMessage = $("#errorMessage");
const retryBtn = $("#retryBtn");

const results = $("#results");

const countryName = $("#countryName");
const placeName = $("#placeName");
const tripDates = $("#tripDates");

const tripScore = $("#tripScore");

const tripVerdict = $("#tripVerdict");
const verdictIcon = $("#verdictIcon");
const verdictTag = $("#verdictTag");
const verdictTitle = $("#verdictTitle");
const verdictText = $("#verdictText");

const reasonChips = $("#reasonChips");

const dailyCards = $("#dailyCards");

const packingList = $("#packingList");

const bestDay = $("#bestDay");
const bestDayText = $("#bestDayText");

const worstDay = $("#worstDay");
const worstDayText = $("#worstDayText");

const unitBtn = $("#unitBtn");

const toast = $("#toast");


/* =========================
DATE HELPERS
========================= */

function localDate(daysFromNow = 0) {

  const date = new Date();

  date.setHours(12, 0, 0, 0);

  date.setDate(date.getDate() + daysFromNow);

  return date;
}


function dateValue(date) {

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}


function parseDate(value) {

  const [y, m, d] = value.split("-").map(Number);

  return new Date(y, m - 1, d);
}


function daysBetween(start, end) {

  const a = parseDate(start);
  const b = parseDate(end);

  return Math.floor(
    (b - a) / 86400000
  ) + 1;
}


function formatDate(value) {

  const date = parseDate(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short"
  }).format(date);
}


function formatLongDate(value) {

  const date = parseDate(value);

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}


function dayName(value) {

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short"
  }).format(parseDate(value));
}


/* =========================
INITIAL DATES
========================= */

function setupDates() {

  const today = localDate(0);

  const max = localDate(13);

  startDate.min = dateValue(today);
  startDate.max = dateValue(max);

  endDate.min = dateValue(today);
  endDate.max = dateValue(max);

  startDate.value = dateValue(today);
  endDate.value = dateValue(localDate(4));

}


setupDates();


/* =========================
API
========================= */

async function getJSON(url) {

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `API error ${response.status}`
    );
  }

  return response.json();
}


/* =========================
GEOCODING
========================= */

async function searchCities(name) {

  const url = new URL(GEO_API);

  url.searchParams.set("name", name);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await getJSON(url);

  return data.results || [];
}


function renderSuggestions(cities) {

  if (!cities.length) {

    suggestions.innerHTML = `
      <div class="suggestion">
        <span class="pin">?</span>
        <div>
          <strong>No city found</strong>
          <small>Try another spelling.</small>
        </div>
      </div>
    `;

    suggestions.classList.remove("hidden");

    return;
  }


  suggestions.innerHTML = cities.map((city, index) => {

    const location = [
      city.admin1,
      city.country
    ].filter(Boolean).join(", ");

    return `
      <div
        class="suggestion"
        data-index="${index}"
      >

        <span class="pin">⌖</span>

        <div>
          <strong>${escapeHTML(city.name)}</strong>
          <small>${escapeHTML(location)}</small>
        </div>

      </div>
    `;

  }).join("");


  suggestions.classList.remove("hidden");


  suggestions
    .querySelectorAll(".suggestion")
    .forEach(item => {

      item.addEventListener("click", () => {

        const city =
          cities[Number(item.dataset.index)];

        state.location = city;

        cityInput.value = city.name;

        clearCity.classList.remove("hidden");

        suggestions.classList.add("hidden");

      });

    });

}


let searchTimer;


cityInput.addEventListener("input", () => {

  const value = cityInput.value.trim();

  clearCity.classList.toggle(
    "hidden",
    !value
  );

  state.location = null;

  clearTimeout(searchTimer);

  if (value.length < 2) {

    suggestions.classList.add("hidden");

    return;
  }


  searchTimer = setTimeout(async () => {

    try {

      const cities =
        await searchCities(value);

      renderSuggestions(cities);

    } catch {

      suggestions.classList.add("hidden");

    }

  }, 300);

});


clearCity.addEventListener("click", () => {

  cityInput.value = "";

  state.location = null;

  clearCity.classList.add("hidden");

  suggestions.classList.add("hidden");

  cityInput.focus();

});


document.addEventListener("click", event => {

  if (!event.target.closest(".destination-field")) {

    suggestions.classList.add("hidden");

  }

});


/* =========================
FORECAST
========================= */

async function getWeather(location) {

  const url = new URL(WEATHER_API);

  url.searchParams.set(
    "latitude",
    location.latitude
  );

  url.searchParams.set(
    "longitude",
    location.longitude
  );


  /*
    DAILY VALUES

    We use exactly the signals the brief
    makes available to us.
  */

  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "uv_index_max",
      "wind_speed_10m_max",
      "weather_code",
      "sunrise",
      "sunset"
    ].join(",")
  );


  /*
    HOURLY VALUES

    These are important because they let us
    say things such as:

    "Avoid being outside before 4pm"

    instead of only saying "hot day".
  */

  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "uv_index"
    ].join(",")
  );


  url.searchParams.set(
    "timezone",
    "auto"
  );

  url.searchParams.set(
    "start_date",
    state.startDate
  );

  url.searchParams.set(
    "end_date",
    state.endDate
  );

  url.searchParams.set(
    "temperature_unit",
    "celsius"
  );

  url.searchParams.set(
    "wind_speed_unit",
    "kmh"
  );

  url.searchParams.set(
    "precipitation_unit",
    "mm"
  );


  return getJSON(url);

}


/* =========================
WEATHER CODES
========================= */

function weatherInfo(code) {

  const map = {

    0: ["☀️", "Clear sky"],
    1: ["🌤️", "Mostly clear"],
    2: ["⛅", "Partly cloudy"],
    3: ["☁️", "Overcast"],

    45: ["🌫️", "Foggy"],
    48: ["🌫️", "Foggy"],

    51: ["🌦️", "Light drizzle"],
    53: ["🌦️", "Drizzle"],
    55: ["🌧️", "Heavy drizzle"],

    61: ["🌦️", "Light rain"],
    63: ["🌧️", "Rain"],
    65: ["🌧️", "Heavy rain"],

    66: ["🌧️", "Freezing rain"],
    67: ["🌧️", "Heavy freezing rain"],

    71: ["🌨️", "Light snow"],
    73: ["❄️", "Snow"],
    75: ["❄️", "Heavy snow"],

    77: ["🌨️", "Snow grains"],

    80: ["🌦️", "Light showers"],
    81: ["🌧️", "Showers"],
    82: ["⛈️", "Heavy showers"],

    85: ["🌨️", "Snow showers"],
    86: ["❄️", "Heavy snow showers"],

    95: ["⛈️", "Thunderstorm"],
    96: ["⛈️", "Thunderstorm + hail"],
    99: ["⛈️", "Severe thunderstorm"]

  };

  return map[code] || ["🌡️", "Variable weather"];

}


/* =========================
HOURLY HELPERS
========================= */

function hoursForDate(date) {

  const hourly = state.weather.hourly;

  const result = [];

  for (
    let i = 0;
    i < hourly.time.length;
    i++
  ) {

    if (
      hourly.time[i].startsWith(date)
    ) {

      result.push({
        time: hourly.time[i],

        temperature:
          hourly.temperature_2m[i],

        apparent:
          hourly.apparent_temperature[i],

        rainProbability:
          hourly.precipitation_probability[i] || 0,

        precipitation:
          hourly.precipitation[i] || 0,

        weatherCode:
          hourly.weather_code[i],

        wind:
          hourly.wind_speed_10m[i] || 0,

        uv:
          hourly.uv_index[i] || 0
      });

    }

  }

  return result;
}


/* =========================
DAILY DATA
========================= */

function createDay(index) {

  const daily = state.weather.daily;

  const date = daily.time[index];

  const hours = hoursForDate(date);


  return {

    date,

    high:
      daily.temperature_2m_max[index],

    low:
      daily.temperature_2m_min[index],

    feelsHigh:
      daily.apparent_temperature_max[index],

    feelsLow:
      daily.apparent_temperature_min[index],

    rainProbability:
      daily.precipitation_probability_max[index],

    precipitation:
      daily.precipitation_sum[index],

    uv:
      daily.uv_index_max[index],

    wind:
      daily.wind_speed_10m_max[index],

    weatherCode:
      daily.weather_code[index],

    sunrise:
      daily.sunrise[index],

    sunset:
      daily.sunset[index],

    hours

  };

}


/* =========================
VERDICT ENGINE
========================= */

/*
  WHO ARE WE ADVISING?

  General traveller / tourist.

  This is deliberately NOT a generic weather
  label. It answers:

  "What should I do?"
*/


function analyzeDay(day) {

  const rain =
    Number(day.rainProbability || 0);

  const precipitation =
    Number(day.precipitation || 0);

  const high =
    Number(day.high);

  const feelsHigh =
    Number(day.feelsHigh || high);

  const wind =
    Number(day.wind || 0);

  const uv =
    Number(day.uv || 0);


  const thunderstorm =
    day.hours.some(
      h =>
        h.weatherCode >= 95
    );


  const heavyRain =
    day.hours.some(
      h =>
        h.rainProbability >= 75 &&
        h.precipitation >= 1
    );


  /*
    HOT HOURS

    Find when it becomes uncomfortable.

    This is what allows the product to say:

    "Avoid being outside before 4pm."

    We don't simply make up 4pm.
    We inspect the hourly forecast.
  */

  const hotHours =
    day.hours.filter(
      h =>
        h.apparent >= 36 ||
        h.temperature >= 36
    );


  let hotUntilHour = null;

  if (hotHours.length >= 2) {

    const lastHot =
      hotHours[hotHours.length - 1];

    hotUntilHour =
      Number(
        lastHot.time.split("T")[1].slice(0,2)
      );

  }


  /*
    STRONG WIND
  */

  const windy =
    wind >= 35;


  /*
    VERY HIGH UV
  */

  const highUV =
    uv >= 8;


  /*
    SCORING

    Score is only used to resolve
    competing conditions.
  */

  let score = 100;

  if (rain >= 70) score -= 22;
  else if (rain >= 45) score -= 10;

  if (precipitation >= 15) score -= 15;
  else if (precipitation >= 5) score -= 7;

  if (thunderstorm) score -= 35;

  if (high >= 40) score -= 20;
  else if (high >= 36) score -= 10;

  if (wind >= 45) score -= 15;
  else if (wind >= 35) score -= 7;

  if (uv >= 10) score -= 8;
  else if (uv >= 8) score -= 4;

  score = Math.max(
    0,
    Math.min(100, score)
  );


  /*
    CLEAR, SPECIFIC VERDICTS

    Priority matters.

    If there is a thunderstorm,
    "good day outdoors" should NOT win.

    If there is heavy rain,
    "carry sunglasses" should NOT win.

    If it is extremely hot,
    we give timing advice.
  */


  if (thunderstorm) {

    return {
      score,
      level: "danger",

      text:
        "Keep outdoor plans flexible.",

      detail:
        "Thunderstorms are possible. Have an indoor backup and check local conditions before heading out.",

      reason:
        "Thunderstorms expected",

      type: "storm"
    };

  }


  if (
    heavyRain ||
    rain >= 70 ||
    precipitation >= 15
  ) {

    return {
      score,
      level: "danger",

      text:
        "Carry a raincoat.",

      detail:
        `Rain is likely, with up to ${Math.round(rain)}% precipitation probability.`,

      reason:
        "High rain risk",

      type: "rain"
    };

  }


  /*
    HOT DAY

    If the hottest period finishes around
    4pm, we produce the requested kind
    of sentence.
  */

  if (
    high >= 38 &&
    hotUntilHour !== null &&
    hotUntilHour >= 15
  ) {

    const displayHour =
      hotUntilHour >= 12
        ? hotUntilHour > 12
          ? hotUntilHour - 12
          : 12
        : hotUntilHour;

    return {
      score,
      level: "warning",

      text:
        `Avoid being outside before ${displayHour}pm.`,

      detail:
        `It may feel very hot for much of the afternoon. Plan sightseeing for later in the day.`,

      reason:
        "Very hot afternoon",

      type: "heat"
    };

  }


  if (high >= 36) {

    return {
      score,
      level: "warning",

      text:
        "Plan outdoor activities early or late.",

      detail:
        "Temperatures will be high, especially around the afternoon.",

      reason:
        "High temperatures",

      type: "heat"
    };

  }


  if (rain >= 45 || precipitation >= 5) {

    return {
      score,
      level: "warning",

      text:
        "Carry a raincoat.",

      detail:
        "There is a meaningful chance of rain, so keep weather protection handy.",

      reason:
        "Possible rain",

      type: "rain"
    };

  }


  if (wind >= 35) {

    return {
      score,
      level: "warning",

      text:
        "Expect a breezy day.",

      detail:
        "Strong winds may make exposed outdoor activities less comfortable.",

      reason:
        "Strong winds",

      type: "wind"
    };

  }


  if (highUV) {

    return {
      score,
      level: "warning",

      text:
        "Good day outdoors — bring sun protection.",

      detail:
        "UV levels may be high. Carry sunscreen, sunglasses and a hat.",

      reason:
        "High UV",

      type: "uv"
    };

  }


  /*
    NORMAL DAY

    This is important because the brief
    specifically says most days are
    unremarkable and the app still needs
    useful wording.
  */

  return {
    score,
    level: "good",

    text:
      "Good day to be outdoors.",

    detail:
      "Conditions look comfortable for sightseeing and outdoor plans.",

    reason:
      "Favourable conditions",

    type: "good"
  };

}


/* =========================
PACKING ENGINE
========================= */

function buildPackingList(days) {

  const items = new Map();


  function add(
    key,
    icon,
    title,
    description
  ) {

    if (!items.has(key)) {

      items.set(key, {
        icon,
        title,
        description
      });

    }

  }


  let rain = false;
  let hot = false;
  let sun = false;
  let cold = false;
  let wind = false;
  let storm = false;


  days.forEach(day => {

    const verdict =
      analyzeDay(day);


    if (
      day.rainProbability >= 40 ||
      day.precipitation >= 3
    ) {
      rain = true;
    }


    if (
      day.high >= 34 ||
      day.feelsHigh >= 34
    ) {
      hot = true;
    }


    if (day.uv >= 6) {
      sun = true;
    }


    if (day.low <= 10) {
      cold = true;
    }


    if (day.wind >= 30) {
      wind = true;
    }


    if (
      verdict.type === "storm"
    ) {
      storm = true;
    }

  });


  /*
    ALWAYS useful
  */

  add(
    "water",
    "💧",
    "Reusable water bottle",
    "Stay hydrated while you're out."
  );


  add(
    "shoes",
    "👟",
    "Comfortable walking shoes",
    "Useful for sightseeing and long walking days."
  );


  if (rain) {

    add(
      "raincoat",
      "🧥",
      "Raincoat or compact umbrella",
      "Rain is possible during the trip."
    );

  }


  if (hot) {

    add(
      "light-clothes",
      "👕",
      "Light breathable clothing",
      "Several days may feel warm or hot."
    );

  }


  if (sun) {

    add(
      "sunscreen",
      "🧴",
      "Sunscreen",
      "UV levels may be strong."
    );

    add(
      "sunglasses",
      "🕶️",
      "Sunglasses",
      "Useful during brighter hours."
    );

    add(
      "hat",
      "🧢",
      "Hat or cap",
      "Helpful for sun exposure."
    );

  }


  if (cold) {

    add(
      "warm-layer",
      "🧣",
      "Warm layer",
      "Cool mornings or evenings are expected."
    );

  }


  if (wind) {

    add(
      "wind-layer",
      "🧥",
      "Light windproof layer",
      "Some days may be quite windy."
    );

  }


  if (storm) {

    add(
      "indoor-plan",
      "🏠",
      "Indoor backup plans",
      "Thunderstorms may disrupt outdoor activities."
    );

  }


  return [...items.values()];

}


/* =========================
TRIP VERDICT
========================= */

function analyzeTrip(days) {

  const analyses =
    days.map(analyzeDay);


  const average =
    analyses.reduce(
      (sum, item) => sum + item.score,
      0
    ) / analyses.length;


  const dangerDays =
    analyses.filter(
      item => item.level === "danger"
    ).length;


  const warningDays =
    analyses.filter(
      item => item.level === "warning"
    ).length;


  let score =
    Math.round(average);


  /*
    Several bad days should affect
    the trip verdict.
  */

  if (
    dangerDays >=
    Math.ceil(days.length * .5)
  ) {

    score = Math.min(score, 45);

  }


  if (
    dangerDays >=
    Math.ceil(days.length * .7)
  ) {

    score = Math.min(score, 30);

  }


  let level;
  let title;
  let text;
  let icon;
  let tag;


  if (score >= 75) {

    level = "good";

    tag = "LOOKS GOOD";

    icon = "✓";

    title =
      "This trip looks good to go.";

    text =
      `${days.filter((_, i) => analyses[i].level === "good").length} of ${days.length} days look favourable for being out, with no major weather pattern dominating the trip.`;

  }

  else if (score >= 50) {

    level = "moderate";

    tag = "PLAN AROUND IT";

    icon = "◐";

    title =
      "Go, but plan around the weather.";

    text =
      `There are some weather interruptions across the trip. Keep your itinerary flexible and use the daily advice below.`;

  }

  else {

    level = "bad";

    tag = "WEATHER CONCERN";

    icon = "!";

    title =
      "This trip needs careful planning.";

    text =
      `Several days have conditions that could make outdoor travel uncomfortable or disruptive.`;

  }


  return {
    score,
    level,
    title,
    text,
    icon,
    tag,
    dangerDays,
    warningDays,
    analyses
  };

}


/* =========================
RENDER RESULTS
========================= */

function renderLocation() {

  const location =
    state.location;

  countryName.textContent =
    (
      location.country_code ||
      location.country ||
      ""
    ).toUpperCase();

  placeName.textContent =
    location.name;

  tripDates.textContent =
    state.startDate === state.endDate
      ? formatLongDate(state.startDate)
      : `${formatDate(state.startDate)} — ${formatDate(state.endDate)} · ${daysBetween(state.startDate, state.endDate)} days`;

}


/* =========================
RENDER TRIP
========================= */

function renderTripVerdict() {

  const analysis =
    analyzeTrip(state.days);


  tripScore.textContent =
    analysis.score;


  tripVerdict.className =
    `trip-verdict ${analysis.level}`;


  verdictIcon.textContent =
    analysis.icon;

  verdictTag.textContent =
    analysis.tag;

  verdictTitle.textContent =
    analysis.title;

  verdictText.textContent =
    analysis.text;


  const good =
    analysis.analyses.filter(
      item => item.level === "good"
    ).length;


  const warning =
    analysis.warningDays;


  const danger =
    analysis.dangerDays;


  reasonChips.innerHTML = `

    <span class="reason-chip good">
      ✓ ${good}/${state.days.length} days look favourable
    </span>

    ${
      warning
        ? `
          <span class="reason-chip warn">
            ! ${warning} day${warning > 1 ? "s" : ""} need extra planning
          </span>
        `
        : ""
    }

    ${
      danger
        ? `
          <span class="reason-chip bad">
            ! ${danger} day${danger > 1 ? "s" : ""} have major weather concerns
          </span>
        `
        : ""
    }

  `;

}


/* =========================
RENDER DAILY
========================= */

function renderDaily() {

  const analyses =
    state.days.map(analyzeDay);


  dailyCards.innerHTML =
    state.days.map((day, index) => {

      const result =
        analyses[index];

      const info =
        weatherInfo(day.weatherCode);


      const high =
        convertTemperature(day.high);

      const low =
        convertTemperature(day.low);


      return `

        <article
          class="day-card ${result.level === "good" ? "best" : ""}"
        >

          <div class="day-top">

            <div>
              <div class="day-name">
                ${dayName(day.date).toUpperCase()}
              </div>

              <div class="day-date">
                ${formatDate(day.date)}
              </div>
            </div>

          </div>


          <div class="day-weather">

            <div class="weather-icon">
              ${info[0]}
            </div>

            <div>

              <div class="temperature">
                ${high}°
                <small>${low}°</small>
              </div>

              <div class="condition">
                ${info[1]}
              </div>

            </div>

          </div>


          <div
            class="
              day-verdict
              ${result.level === "warning" ? "warning" : ""}
              ${result.level === "danger" ? "danger" : ""}
            "
          >

            <div class="verdict-text">
              ${result.text}
            </div>

            <div class="verdict-detail">
              ${result.detail}
            </div>

          </div>


          <div class="day-metrics">

            <div class="day-metric">

              <span>RAIN</span>

              <strong>
                ${Math.round(day.rainProbability)}%
              </strong>

            </div>


            <div class="day-metric">

              <span>WIND</span>

              <strong>
                ${Math.round(day.wind)} km/h
              </strong>

            </div>


            <div class="day-metric">

              <span>UV</span>

              <strong>
                ${Math.round(day.uv)}
              </strong>

            </div>

          </div>

        </article>

      `;

    }).join("");

}


/* =========================
RENDER PACKING
========================= */

function renderPacking() {

  const items =
    buildPackingList(state.days);


  packingList.innerHTML =
    items.map(item => `

      <div class="pack-item">

        <div class="pack-icon">
          ${item.icon}
        </div>

        <strong>
          ${item.title}
        </strong>

        <p>
          ${item.description}
        </p>

      </div>

    `).join("");

}


/* =========================
BEST / WORST
========================= */

function renderHighlights() {

  const ranked =
    state.days
      .map(day => ({
        day,
        result: analyzeDay(day)
      }))
      .sort(
        (a,b) =>
          b.result.score -
          a.result.score
      );


  const best =
    ranked[0];

  const worst =
    ranked[ranked.length - 1];


  if (best) {

    bestDay.textContent =
      `${dayName(best.day.date)}, ${formatDate(best.day.date)}`;

    bestDayText.textContent =
      best.result.text;

  }


  if (worst) {

    worstDay.textContent =
      `${dayName(worst.day.date)}, ${formatDate(worst.day.date)}`;

    worstDayText.textContent =
      worst.result.text;

  }

}


/* =========================
TEMPERATURE
========================= */

function convertTemperature(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "--";
  }


  if (
    state.unit === "fahrenheit"
  ) {

    return Math.round(
      value * 9 / 5 + 32
    );

  }


  return Math.round(value);

}


/* =========================
SEARCH
========================= */

async function search() {

  const city =
    cityInput.value.trim();


  if (!city) {

    showError(
      "Destination required",
      "Enter a city to analyse your trip."
    );

    return;

  }


  const start =
    startDate.value;

  const end =
    endDate.value;


  if (!start || !end) {

    showError(
      "Choose your dates",
      "Select both your start and end date."
    );

    return;

  }


  if (end < start) {

    showError(
      "Invalid dates",
      "Your end date must be after your start date."
    );

    return;

  }


  const numberOfDays =
    daysBetween(start, end);


  if (numberOfDays > 14) {

    showError(
      "That's too far ahead",
      "Choose a trip of 14 days or fewer. Forecast data beyond the available range should not be presented as reliable."
    );

    return;

  }


  state.startDate = start;
  state.endDate = end;


  setLoading(true);


  try {

    let location =
      state.location;


    /*
      IMPORTANT:

      Don't silently accept a stale selection.
    */

    if (
      !location ||
      location.name.toLowerCase() !==
      city.toLowerCase()
    ) {

      const cities =
        await searchCities(city);


      if (!cities.length) {

        throw new Error(
          "CITY_NOT_FOUND"
        );

      }


      /*
        If multiple meaningful locations
        exist, show choices rather than
        silently choosing the first one.
      */

      if (
        cities.length > 1 &&
        !state.location
      ) {

        renderSuggestions(cities);

        setLoading(false);

        showError(
          "Choose your destination",
          "We found several places with that name. Select the correct city from the suggestions."
        );

        return;

      }


      location =
        cities[0];

      state.location =
        location;

    }


    state.weather =
      await getWeather(location);


    state.days =
      state.weather.daily.time
        .map((_, index) =>
          createDay(index)
        );


    state.lastSearch = {
      city,
      start,
      end
    };


    renderLocation();

    renderTripVerdict();

    renderDaily();

    renderPacking();

    renderHighlights();


    errorState.classList.add(
      "hidden"
    );

    results.classList.remove(
      "hidden"
    );


    results.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


    showToast(
      "Trip analysed successfully"
    );


  } catch (error) {

    console.error(error);


    if (
      error.message ===
      "CITY_NOT_FOUND"
    ) {

      showError(
        "We couldn't find that city",
        "Check the spelling or try including the country name."
      );

    } else {

      showError(
        "Weather unavailable",
        "The live weather service didn't respond. Check your connection and try again."
      );

    }

  } finally {

    setLoading(false);

  }

}


/* =========================
LOADING
========================= */

function setLoading(loading) {

  submitBtn.disabled =
    loading;

  cityInput.disabled =
    loading;

  startDate.disabled =
    loading;

  endDate.disabled =
    loading;


  if (loading) {

    submitText.classList.add(
      "hidden"
    );

    loader.classList.remove(
      "hidden"
    );

  } else {

    submitText.classList.remove(
      "hidden"
    );

    loader.classList.add(
      "hidden"
    );

  }

}


/* =========================
ERROR
========================= */

function showError(title, message) {

  errorTitle.textContent =
    title;

  errorMessage.textContent =
    message;

  errorState.classList.remove(
    "hidden"
  );


  results.classList.add(
    "hidden"
  );


  errorState.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


/* =========================
SUBMIT
========================= */

searchForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    search();

  }
);


/* =========================
RETRY
========================= */

retryBtn.addEventListener(
  "click",
  () => {

    if (state.lastSearch) {

      cityInput.value =
        state.lastSearch.city;

      startDate.value =
        state.lastSearch.start;

      endDate.value =
        state.lastSearch.end;

    }

    search();

  }
);


/* =========================
SCROLL
========================= */

$("#scrollLeft").addEventListener(
  "click",
  () => {

    dailyCards.scrollBy({
      left: -320,
      behavior: "smooth"
    });

  }
);


$("#scrollRight").addEventListener(
  "click",
  () => {

    dailyCards.scrollBy({
      left: 320,
      behavior: "smooth"
    });

  }
);


/* =========================
UNIT
========================= */

unitBtn.addEventListener(
  "click",
  () => {

    state.unit =
      state.unit === "celsius"
        ? "fahrenheit"
        : "celsius";


    unitBtn.textContent =
      state.unit === "celsius"
        ? "°C"
        : "°F";


    if (state.days.length) {

      renderDaily();

    }

  }
);


/* =========================
TOAST
========================= */

function showToast(message) {

  toast.textContent =
    message;

  toast.classList.remove(
    "hidden"
  );


  setTimeout(() => {

    toast.classList.add(
      "hidden"
    );

  }, 2800);

}


/* =========================
ESCAPE HTML
========================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}