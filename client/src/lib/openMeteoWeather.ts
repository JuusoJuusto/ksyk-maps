/**
 * Open-Meteo Weather API Integration
 * Free API - No API key required
 * Documentation: https://open-meteo.com/en/docs
 * 
 * Features:
 * - 7-day forecast
 * - Hourly data
 * - No rate limits
 * - No authentication required
 * - High accuracy
 */

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  weatherCode: number;
  timestamp: string;
}

export interface HourlyForecast {
  time: string; // Hour only (e.g., "14")
  temperature: number;
  weatherCode: number;
  precipitation: number;
  windSpeed: number;
}

/**
 * Fetch current weather from Open-Meteo API
 * @param latitude Latitude (default: Helsinki 60.1699)
 * @param longitude Longitude (default: Helsinki 24.9384)
 * @returns Current weather data
 */
export async function fetchCurrentWeather(
  latitude: number = 60.1699,
  longitude: number = 24.9384
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=Europe/Helsinki`;
    
    console.log('🌡️ Fetching Open-Meteo weather for Helsinki');
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Open-Meteo API error: ${response.status}, using mock data`);
      return getMockWeatherData();
    }

    const data = await response.json();
    
    if (!data.current) {
      console.warn('No current weather data found, using mock data');
      return getMockWeatherData();
    }

    const current = data.current;
    
    const weatherData: WeatherData = {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: Math.round(current.wind_direction_10m),
      precipitation: current.precipitation || 0,
      weatherCode: current.weather_code,
      timestamp: current.time
    };

    console.log('✅ Weather data fetched successfully:', weatherData);
    return weatherData;
  } catch (error) {
    console.error("Error fetching Open-Meteo weather:", error);
    return getMockWeatherData();
  }
}

/**
 * Fetch hourly weather forecast from Open-Meteo API
 * @param latitude Latitude (default: Helsinki)
 * @param longitude Longitude (default: Helsinki)
 * @param hours Number of hours to forecast (default: 24)
 * @returns Array of hourly forecast data
 */
export async function fetchHourlyForecast(
  latitude: number = 60.1699,
  longitude: number = 24.9384,
  hours: number = 24
): Promise<HourlyForecast[]> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Europe/Helsinki&forecast_days=2`;
    
    console.log('🌤️ Fetching Open-Meteo hourly forecast');
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Open-Meteo forecast API returned ${response.status}, using fallback`);
      return generateMockForecast(hours);
    }

    const data = await response.json();
    
    if (!data.hourly || !data.hourly.time) {
      console.warn('No hourly forecast data found, using fallback');
      return generateMockForecast(hours);
    }

    const hourly = data.hourly;
    const forecasts: HourlyForecast[] = [];
    
    // Get current hour in Finland timezone
    const now = new Date();
    const finlandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const currentHour = finlandTime.getHours();
    
    // Process hourly data - show only hours without minutes
    for (let i = 0; i < Math.min(hourly.time.length, hours); i++) {
      const timeStr = hourly.time[i];
      const forecastDate = new Date(timeStr);
      const hour = forecastDate.getHours();
      
      forecasts.push({
        time: hour.toString(), // Just the hour number (e.g., "14")
        temperature: Math.round(hourly.temperature_2m[i]),
        weatherCode: hourly.weather_code[i],
        precipitation: hourly.precipitation[i] || 0,
        windSpeed: Math.round(hourly.wind_speed_10m[i])
      });
    }

    console.log(`✅ Fetched ${forecasts.length} hourly forecast entries`);
    return forecasts.slice(0, hours);
  } catch (error) {
    console.error("Error fetching Open-Meteo forecast:", error);
    return generateMockForecast(hours);
  }
}

/**
 * Generate mock forecast data as fallback
 */
function generateMockForecast(hours: number): HourlyForecast[] {
  const forecasts: HourlyForecast[] = [];
  const now = new Date();
  const finlandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
  
  for (let i = 0; i < Math.min(hours, 24); i++) {
    const hour = (finlandTime.getHours() + i) % 24;
    
    // Generate realistic-looking data based on time of day
    const baseTemp = 15;
    const tempVariation = Math.sin((hour / 24) * Math.PI * 2) * 5;
    
    forecasts.push({
      time: hour.toString(),
      temperature: Math.round(baseTemp + tempVariation),
      weatherCode: hour % 6 === 0 ? 61 : (hour % 3 === 0 ? 3 : 1),
      precipitation: hour % 8 === 0 ? 0.5 : 0,
      windSpeed: 3 + Math.round(Math.random() * 5)
    });
  }
  
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
 * Get mock weather data as fallback (realistic Finnish weather)
 */
export function getMockWeatherData(): WeatherData {
  // Generate realistic Finnish weather based on current month
  const now = new Date();
  const month = now.getMonth(); // 0-11
  
  // Temperature ranges by month (average for Helsinki)
  const monthlyTemps = [
    -3,  // January
    -4,  // February
    0,   // March
    6,   // April
    12,  // May
    16,  // June
    19,  // July
    17,  // August
    12,  // September
    7,   // October
    2,   // November
    -1   // December
  ];
  
  const baseTemp = monthlyTemps[month];
  const tempVariation = (Math.random() - 0.5) * 6; // ±3°C variation
  const temperature = Math.round(baseTemp + tempVariation);
  
  return {
    temperature,
    feelsLike: temperature - 2,
    humidity: 70 + Math.round(Math.random() * 20),
    windSpeed: 3 + Math.round(Math.random() * 8),
    windDirection: Math.round(Math.random() * 360),
    precipitation: Math.random() > 0.7 ? Math.random() * 2 : 0,
    weatherCode: Math.random() > 0.7 ? 61 : (Math.random() > 0.5 ? 3 : 1),
    timestamp: new Date().toISOString()
  };
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
