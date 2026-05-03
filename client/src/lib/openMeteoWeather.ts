/**
 * Open-Meteo Weather API Integration - COMPREHENSIVE DATA
 * Location: Kulosaari, Helsinki (61.6575, 26.3728)
 * Documentation: https://open-meteo.com/en/docs
 * 
 * Features:
 * - Real-time weather data with ALL parameters
 * - Hourly, daily, and 15-minute forecasts
 * - No API key required
 * - Auto timezone detection
 * - NO MOCK DATA - Shows error if API fails
 */

// Comprehensive API URL with ALL parameters including humidity and pressure
const COMPREHENSIVE_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=61.6575&longitude=26.3728&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max,daylight_duration,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,rain,showers,snowfall,snow_depth,weather_code,pressure_msl,surface_pressure,cloud_cover,visibility,uv_index,is_day,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&minutely_15=temperature_2m,rain,snowfall,wind_speed_10m,wind_speed_80m,wind_direction_80m,wind_direction_10m&timezone=auto&wind_speed_unit=ms';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  humidity: number;
  pressure: number;
  surfacePressure: number;
  isDay: number;
  timestamp: string;
}

export interface HourlyForecast {
  time: string; // Hour only (e.g., "14")
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  rain: number;
  showers: number;
  snowfall: number;
  snowDepth: number;
  cloudCover: number;
  visibility: number;
  uvIndex: number;
  isDay: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitationProbability: number;
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
  precipitationSum: number;
  rainSum: number;
  showersSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
}

export interface MinutelyForecast {
  time: string;
  temperature: number;
  rain: number;
  snowfall: number;
  windSpeed10m: number;
  windSpeed80m: number;
  windDirection10m: number;
  windDirection80m: number;
}

export interface ComprehensiveWeatherData {
  current: WeatherData;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  minutely: MinutelyForecast[];
}

/**
 * Fetch comprehensive weather data from Open-Meteo API - REAL DATA ONLY
 * Location: Kulosaari, Helsinki (61.6575, 26.3728)
 * Returns current, hourly, daily, and 15-minute forecasts
 */
export async function fetchComprehensiveWeather(): Promise<ComprehensiveWeatherData> {
  console.log('🌡️ Fetching COMPREHENSIVE weather data from Open-Meteo API for Kulosaari, Helsinki');
  
  const response = await fetch(COMPREHENSIVE_API_URL);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.current) {
    throw new Error('No current weather data available');
  }

  // Parse current weather
  const current = data.current;
  const currentWeather: WeatherData = {
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    windSpeed: Math.round(current.wind_speed_10m), // Already in m/s from API
    windGusts: Math.round(current.wind_gusts_10m),
    windDirection: current.wind_direction_10m || 0,
    precipitation: current.precipitation || 0,
    rain: current.rain || 0,
    showers: current.showers || 0,
    snowfall: current.snowfall || 0,
    weatherCode: current.weather_code,
    cloudCover: current.cloud_cover || 0,
    humidity: current.relative_humidity_2m || 0,
    pressure: Math.round(current.pressure_msl || current.surface_pressure || 1013),
    surfacePressure: Math.round(current.surface_pressure || 1013),
    isDay: current.is_day || 1,
    timestamp: current.time
  };

  // Parse hourly forecast (next 24 hours)
  const hourly = data.hourly;
  const hourlyForecasts: HourlyForecast[] = [];
  
  if (hourly && hourly.time) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find the index of the current hour
    let startIndex = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      const forecastDate = new Date(hourly.time[i]);
      if (forecastDate.getHours() === currentHour && forecastDate.getDate() === now.getDate()) {
        startIndex = i;
        break;
      }
    }
    
    // Get 24 hours starting from current hour
    for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
      const timeStr = hourly.time[i];
      const forecastDate = new Date(timeStr);
      const hour = forecastDate.getHours();
      
      hourlyForecasts.push({
        time: hour.toString().padStart(2, '0'),
        temperature: Math.round(hourly.temperature_2m[i]),
        apparentTemperature: Math.round(hourly.apparent_temperature[i]),
        weatherCode: hourly.weather_code[i],
        rain: hourly.rain[i] || 0,
        showers: hourly.showers[i] || 0,
        snowfall: hourly.snowfall[i] || 0,
        snowDepth: hourly.snow_depth[i] || 0,
        cloudCover: hourly.cloud_cover[i] || 0,
        visibility: hourly.visibility[i] || 10000,
        uvIndex: hourly.uv_index[i] || 0,
        isDay: hourly.is_day[i] || 0,
        humidity: hourly.relative_humidity_2m[i] || 0,
        pressure: Math.round(hourly.pressure_msl[i] || hourly.surface_pressure[i] || 1013),
        windSpeed: Math.round(hourly.wind_speed_10m[i] || 0),
        windDirection: hourly.wind_direction_10m[i] || 0,
        precipitationProbability: hourly.precipitation_probability[i] || 0,
      });
    }
  }

  // Parse daily forecast (next 7 days)
  const daily = data.daily;
  const dailyForecasts: DailyForecast[] = [];
  
  if (daily && daily.time) {
    for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
      dailyForecasts.push({
        date: daily.time[i],
        weatherCode: daily.weather_code[i],
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        apparentTempMax: Math.round(daily.apparent_temperature_max[i]),
        apparentTempMin: Math.round(daily.apparent_temperature_min[i]),
        windSpeedMax: Math.round(daily.wind_speed_10m_max[i]),
        windGustsMax: Math.round(daily.wind_gusts_10m_max[i]),
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
        uvIndexMax: daily.uv_index_max[i] || 0,
        daylightDuration: daily.daylight_duration[i] || 0,
        precipitationSum: daily.precipitation_sum[i] || 0,
        rainSum: daily.rain_sum[i] || 0,
        showersSum: daily.showers_sum[i] || 0,
        snowfallSum: daily.snowfall_sum[i] || 0,
        precipitationHours: daily.precipitation_hours[i] || 0,
        precipitationProbabilityMax: daily.precipitation_probability_max[i] || 0,
      });
    }
  }

  // Parse 15-minute forecast
  const minutely = data.minutely_15;
  const minutelyForecasts: MinutelyForecast[] = [];
  
  if (minutely && minutely.time) {
    for (let i = 0; i < Math.min(minutely.time.length, 12); i++) { // Next 3 hours (12 * 15min)
      minutelyForecasts.push({
        time: minutely.time[i],
        temperature: Math.round(minutely.temperature_2m[i]),
        rain: minutely.rain[i] || 0,
        snowfall: minutely.snowfall[i] || 0,
        windSpeed10m: Math.round(minutely.wind_speed_10m[i]),
        windSpeed80m: Math.round(minutely.wind_speed_80m[i]),
        windDirection10m: minutely.wind_direction_10m[i] || 0,
        windDirection80m: minutely.wind_direction_80m[i] || 0
      });
    }
  }

  console.log('✅ COMPREHENSIVE weather data fetched:', {
    current: currentWeather,
    hourlyCount: hourlyForecasts.length,
    dailyCount: dailyForecasts.length,
    minutelyCount: minutelyForecasts.length
  });

  return {
    current: currentWeather,
    hourly: hourlyForecasts,
    daily: dailyForecasts,
    minutely: minutelyForecasts
  };
}

/**
 * Fetch current weather only - REAL DATA ONLY
 */
export async function fetchCurrentWeather(): Promise<WeatherData> {
  const data = await fetchComprehensiveWeather();
  return data.current;
}

/**
 * Fetch hourly forecast only - REAL DATA ONLY
 */
export async function fetchHourlyForecast(hours: number = 24): Promise<HourlyForecast[]> {
  const data = await fetchComprehensiveWeather();
  return data.hourly.slice(0, hours);
}

/**
 * Fetch daily forecast only - REAL DATA ONLY
 */
export async function fetchDailyForecast(days: number = 7): Promise<DailyForecast[]> {
  const data = await fetchComprehensiveWeather();
  return data.daily.slice(0, days);
}

/**
 * Fetch 15-minute forecast only - REAL DATA ONLY
 */
export async function fetchMinutelyForecast(): Promise<MinutelyForecast[]> {
  const data = await fetchComprehensiveWeather();
  return data.minutely;
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

/**
 * Format time from ISO string to HH:MM
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format daylight duration from seconds to hours and minutes
 */
export function formatDaylightDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
}
