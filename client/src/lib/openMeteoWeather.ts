/**
 * Open-Meteo Weather API Integration - REAL DATA ONLY
 * Location: Kulosaari, Helsinki (61.6575, 26.3728)
 * Documentation: https://open-meteo.com/en/docs
 * 
 * Features:
 * - Real-time weather data
 * - Hourly and daily forecasts
 * - No API key required
 * - Auto timezone detection
 */

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  timestamp: string;
}

export interface HourlyForecast {
  time: string; // Hour only (e.g., "14")
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  rain: number;
  snowfall: number;
  cloudCover: number;
  visibility: number;
  uvIndex: number;
  isDay: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  windSpeedMax: number;
  windGustsMax: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  daylightDuration: number;
}

/**
 * Fetch current weather from Open-Meteo API - REAL DATA ONLY
 * Location: Kulosaari, Helsinki (61.6575, 26.3728)
 */
export async function fetchCurrentWeather(): Promise<WeatherData> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=61.6575&longitude=26.3728&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation,rain,showers,snowfall,weather_code,cloud_cover&timezone=auto';
  
  console.log('🌡️ Fetching REAL weather data from Open-Meteo API for Kulosaari, Helsinki');
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.current) {
    throw new Error('No current weather data available');
  }

  const current = data.current;
  
  const weatherData: WeatherData = {
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    windSpeed: Math.round(current.wind_speed_10m * 3.6), // Convert m/s to km/h
    windGusts: Math.round(current.wind_gusts_10m * 3.6),
    precipitation: current.precipitation || 0,
    rain: current.rain || 0,
    showers: current.showers || 0,
    snowfall: current.snowfall || 0,
    weatherCode: current.weather_code,
    cloudCover: current.cloud_cover || 0,
    timestamp: current.time
  };

  console.log('✅ REAL weather data fetched:', weatherData);
  return weatherData;
}


/**
 * Fetch hourly weather forecast - REAL DATA ONLY
 * Returns next 24 hours with correct Finland timezone
 */
export async function fetchHourlyForecast(hours: number = 24): Promise<HourlyForecast[]> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=61.6575&longitude=26.3728&hourly=temperature_2m,rain,snowfall,weather_code,cloud_cover,visibility,uv_index,is_day,apparent_temperature&timezone=auto&forecast_days=2';
  
  console.log('🌤️ Fetching REAL hourly forecast from Open-Meteo');
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Forecast API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.hourly || !data.hourly.time) {
    throw new Error('No hourly forecast data available');
  }

  const hourly = data.hourly;
  const forecasts: HourlyForecast[] = [];
  
  // Get current time in Finland timezone
  const now = new Date();
  const currentTime = now.getTime();
  
  // Process hourly data - show only hours without minutes
  for (let i = 0; i < Math.min(hourly.time.length, hours); i++) {
    const timeStr = hourly.time[i];
    const forecastDate = new Date(timeStr);
    
    // Only include future hours
    if (forecastDate.getTime() >= currentTime) {
      const hour = forecastDate.getHours();
      
      forecasts.push({
        time: hour.toString(), // Just the hour number (e.g., "14")
        temperature: Math.round(hourly.temperature_2m[i]),
        apparentTemperature: Math.round(hourly.apparent_temperature[i]),
        weatherCode: hourly.weather_code[i],
        rain: hourly.rain[i] || 0,
        snowfall: hourly.snowfall[i] || 0,
        cloudCover: hourly.cloud_cover[i] || 0,
        visibility: hourly.visibility[i] || 10000,
        uvIndex: hourly.uv_index[i] || 0,
        isDay: hourly.is_day[i] || 0
      });
    }
    
    if (forecasts.length >= hours) break;
  }

  console.log(`✅ Fetched ${forecasts.length} REAL hourly forecast entries`);
  return forecasts;
}

/**
 * Fetch daily weather forecast - REAL DATA ONLY
 */
export async function fetchDailyForecast(days: number = 7): Promise<DailyForecast[]> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=61.6575&longitude=26.3728&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max,daylight_duration&timezone=auto';
  
  console.log('📅 Fetching REAL daily forecast from Open-Meteo');
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Daily forecast API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.daily || !data.daily.time) {
    throw new Error('No daily forecast data available');
  }

  const daily = data.daily;
  const forecasts: DailyForecast[] = [];
  
  for (let i = 0; i < Math.min(daily.time.length, days); i++) {
    forecasts.push({
      date: daily.time[i],
      weatherCode: daily.weather_code[i],
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      apparentTempMax: Math.round(daily.apparent_temperature_max[i]),
      apparentTempMin: Math.round(daily.apparent_temperature_min[i]),
      windSpeedMax: Math.round(daily.wind_speed_10m_max[i] * 3.6), // Convert to km/h
      windGustsMax: Math.round(daily.wind_gusts_10m_max[i] * 3.6),
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
      uvIndexMax: daily.uv_index_max[i] || 0,
      daylightDuration: daily.daylight_duration[i] || 0
    });
  }

  console.log(`✅ Fetched ${forecasts.length} REAL daily forecast entries`);
  return forecasts;
}


/**
 * Convert WMO weather code to icon name
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
export function getWeatherIcon(code: number): string {
  if (code === 0) return 'sun'; // Clear sky
  if (code <= 3) return 'cloud-sun'; // Partly cloudy
  if (code <= 48) return 'cloud'; // Fog
  if (code <= 57) return 'cloud-drizzle'; // Drizzle
  if (code <= 67) return 'cloud-rain'; // Rain
  if (code <= 77) return 'cloud-snow'; // Snow
  if (code <= 82) return 'cloud-rain'; // Rain showers
  if (code <= 86) return 'cloud-snow'; // Snow showers
  if (code <= 99) return 'cloud-lightning'; // Thunderstorm
  return 'cloud';
}

/**
 * Get weather description in Finnish based on WMO code
 */
export function getWeatherDescription(code: number): string {
  if (code === 0) return 'Selkeää';
  if (code === 1) return 'Enimmäkseen selkeää';
  if (code === 2) return 'Puolipilvistä';
  if (code === 3) return 'Pilvistä';
  if (code === 45 || code === 48) return 'Sumua';
  if (code === 51 || code === 53 || code === 55) return 'Tihkusadetta';
  if (code === 56 || code === 57) return 'Jäätävää tihkua';
  if (code === 61) return 'Heikkoa sadetta';
  if (code === 63) return 'Sadetta';
  if (code === 65) return 'Voimakasta sadetta';
  if (code === 66 || code === 67) return 'Jäätävää sadetta';
  if (code === 71) return 'Heikkoa lumisadetta';
  if (code === 73) return 'Lumisadetta';
  if (code === 75) return 'Voimakasta lumisadetta';
  if (code === 77) return 'Lumijyväsiä';
  if (code === 80 || code === 81 || code === 82) return 'Sadekuuroja';
  if (code === 85 || code === 86) return 'Lumikuuroja';
  if (code === 95) return 'Ukkosta';
  if (code === 96 || code === 99) return 'Ukkosta ja rakeita';
  return 'Pilvistä';
}

/**
 * Get wind direction as text
 */
export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Get wind direction in Finnish
 */
export function getWindDirectionFinnish(degrees: number): string {
  const directions = ['Pohjoinen', 'Koillinen', 'Itä', 'Kaakko', 'Etelä', 'Lounas', 'Länsi', 'Luode'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
