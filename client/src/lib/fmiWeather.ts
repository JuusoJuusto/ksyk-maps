/**
 * Open-Meteo Weather API Integration (FREE, NO API KEY NEEDED)
 * Location: Kulosaari, Helsinki (60.187, 25.006)
 * Documentation: https://open-meteo.com/
 * 
 * Features:
 * - Real-time weather data
 * - 24-hour forecast
 * - JSON API (easy to use)
 * - NO MOCK DATA - Shows error if API fails
 * - Free, reliable, no rate limits
 */

// Open-Meteo API endpoint for Kulosaari, Helsinki
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=60.187&longitude=25.006&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation,weather_code&timezone=Europe/Helsinki&forecast_days=2';

export interface FMICurrentWeather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  feelsLike: number;
  condition: string;
  conditionEmoji: string;
  timestamp: string;
}

export interface FMIHourlyForecast {
  time: string;
  hour: string;
  temperature: number;
  precipitation: number;
  cloudCover: number;
  condition: string;
  conditionEmoji: string;
}

/**
 * Get weather condition from WMO weather code
 * WMO Weather interpretation codes (WW)
 */
function getWeatherFromCode(code: number): { text: string; emoji: string } {
  if (code === 0) return { text: 'Selkeää', emoji: '☀️' };
  if (code <= 3) return { text: 'Puolipilvistä', emoji: '⛅' };
  if (code <= 48) return { text: 'Sumuista', emoji: '🌫️' };
  if (code <= 67) return { text: 'Sateista', emoji: '🌧️' };
  if (code <= 77) return { text: 'Lumisadetta', emoji: '🌨️' };
  if (code <= 82) return { text: 'Sadekuuroja', emoji: '🌦️' };
  if (code <= 86) return { text: 'Lumikuuroja', emoji: '🌨️' };
  if (code <= 99) return { text: 'Ukkosmyrsky', emoji: '⛈️' };
  return { text: 'Pilvistä', emoji: '☁️' };
}

/**
 * Fetch current weather and forecast from Open-Meteo - REAL DATA ONLY
 * Location: Kulosaari, Helsinki (60.187, 25.006)
 */
export async function fetchFMICurrentWeather(): Promise<FMICurrentWeather> {
  try {
    const response = await fetch(WEATHER_API_URL);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.current) {
      throw new Error('No current weather data in response');
    }

    const current = data.current;
    const condition = getWeatherFromCode(current.weather_code);

    const weatherData: FMICurrentWeather = {
      temperature: Math.round(current.temperature_2m),
      windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
      humidity: Math.round(current.relative_humidity_2m),
      precipitation: Math.round(current.precipitation * 10) / 10,
      feelsLike: Math.round(current.apparent_temperature),
      condition: condition.text,
      conditionEmoji: condition.emoji,
      timestamp: current.time
    };
    
    return weatherData;
  } catch (error) {
    console.error('❌ Failed to fetch weather:', error);
    throw error;
  }
}

/**
 * Fetch 24-hour forecast from Open-Meteo - REAL DATA ONLY
 */
export async function fetchFMIForecast(): Promise<FMIHourlyForecast[]> {
  try {
    const response = await fetch(WEATHER_API_URL);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.hourly) {
      throw new Error('No hourly forecast data in response');
    }

    const hourly = data.hourly;
    const forecasts: FMIHourlyForecast[] = [];
    const now = new Date();

    // Get next 24 hours
    for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
      const forecastTime = new Date(hourly.time[i]);
      
      // Only include future times
      if (forecastTime > now) {
        const condition = getWeatherFromCode(hourly.weather_code[i]);
        const hour = forecastTime.getHours();

        forecasts.push({
          time: hourly.time[i],
          hour: hour.toString(),
          temperature: Math.round(hourly.temperature_2m[i]),
          precipitation: Math.round(hourly.precipitation[i] * 10) / 10,
          cloudCover: 0, // Not provided by Open-Meteo in free tier
          condition: condition.text,
          conditionEmoji: condition.emoji
        });

        if (forecasts.length >= 24) break;
      }
    }

    return forecasts;
  } catch (error) {
    console.error('❌ Failed to fetch forecast:', error);
    throw error;
  }
}

/**
 * Fetch comprehensive weather data (current + forecast) - REAL DATA ONLY
 */
export async function fetchFMIComprehensiveWeather(): Promise<{
  current: FMICurrentWeather;
  forecast: FMIHourlyForecast[];
}> {
  try {
    const [current, forecast] = await Promise.all([
      fetchFMICurrentWeather(),
      fetchFMIForecast()
    ]);

    return { current, forecast };
  } catch (error) {
    console.error('❌ Failed to fetch comprehensive weather:', error);
    throw error;
  }
}

/**
 * Format time from ISO string to HH:MM
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date from ISO string to DD.MM.YYYY
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('fi-FI', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
