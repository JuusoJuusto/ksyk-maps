/**
 * Finnish Meteorological Institute (FMI) Open Data API Integration
 * Location: Kulosaari, Helsinki (60.187, 25.006)
 * Documentation: https://en.ilmatieteenlaitos.fi/open-data
 * 
 * Features:
 * - Real-time weather observations from FMI
 * - 24-hour forecast
 * - XML parsing (FMI returns XML, not JSON)
 * - NO MOCK DATA - Shows error if API fails
 */

// FMI API endpoints for Kulosaari, Helsinki
const FMI_OBSERVATIONS_URL = 'https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::simple&lat=60.187&lon=25.006&parameters=t2m,ws_10min,rh,r_1h';
const FMI_FORECAST_URL = 'https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::harmonie::surface::point::simple&lat=60.187&lon=25.006&parameters=Temperature,PrecipitationAmount,TotalCloudCover';

export interface FMICurrentWeather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  precipitation: number; // Last 1 hour
  feelsLike: number; // Calculated
  condition: string; // Derived from data
  conditionEmoji: string;
  timestamp: string;
}

export interface FMIHourlyForecast {
  time: string;
  hour: string; // Just the hour (e.g., "14")
  temperature: number;
  precipitation: number;
  cloudCover: number;
  condition: string;
  conditionEmoji: string;
}

/**
 * Parse XML response from FMI API
 * FMI returns XML, so we need to parse it
 */
function parseXML(xmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'text/xml');
}

/**
 * Calculate "feels like" temperature
 * Formula: feels_like = temp - (wind_speed * 0.7)
 */
function calculateFeelsLike(temp: number, windSpeed: number): number {
  return Math.round(temp - (windSpeed * 0.7));
}

/**
 * Determine weather condition from data
 * Logic:
 * - if rain > 0 → "Sateinen 🌧️"
 * - else if clouds < 20 → "Aurinkoinen ☀️"
 * - else if clouds < 60 → "Puolipilvinen ⛅"
 * - else → "Pilvinen ☁️"
 */
function getWeatherCondition(rain: number, clouds: number): { text: string; emoji: string } {
  if (rain > 0) {
    return { text: 'Sateinen', emoji: '🌧️' };
  } else if (clouds < 20) {
    return { text: 'Aurinkoinen', emoji: '☀️' };
  } else if (clouds < 60) {
    return { text: 'Puolipilvinen', emoji: '⛅' };
  } else {
    return { text: 'Pilvinen', emoji: '☁️' };
  }
}

/**
 * Extract observation data from FMI XML
 * FMI returns time-series data in XML format
 */
function extractObservations(xml: Document): FMICurrentWeather {
  const members = xml.getElementsByTagName('wfs:member');
  
  if (members.length === 0) {
    throw new Error('No observation data found in FMI response');
  }

  // FMI returns multiple time points, we want the most recent
  let latestData: any = {
    temperature: null,
    windSpeed: null,
    humidity: null,
    precipitation: null,
    timestamp: null
  };

  // Parse all members and find the latest complete data
  for (let i = members.length - 1; i >= 0; i--) {
    const member = members[i];
    const time = member.getElementsByTagName('BsWfs:Time')[0]?.textContent;
    const paramName = member.getElementsByTagName('BsWfs:ParameterName')[0]?.textContent;
    const paramValue = member.getElementsByTagName('BsWfs:ParameterValue')[0]?.textContent;

    if (time && paramName && paramValue) {
      if (paramName === 't2m' && latestData.temperature === null) {
        latestData.temperature = parseFloat(paramValue);
        latestData.timestamp = time;
      } else if (paramName === 'ws_10min' && latestData.windSpeed === null) {
        latestData.windSpeed = parseFloat(paramValue);
      } else if (paramName === 'rh' && latestData.humidity === null) {
        latestData.humidity = parseFloat(paramValue);
      } else if (paramName === 'r_1h' && latestData.precipitation === null) {
        latestData.precipitation = parseFloat(paramValue);
      }
    }
  }

  // Validate we have all required data
  if (latestData.temperature === null || latestData.windSpeed === null) {
    throw new Error('Incomplete observation data from FMI');
  }

  // Use defaults for optional fields
  const temp = latestData.temperature;
  const windSpeed = latestData.windSpeed;
  const humidity = latestData.humidity || 0;
  const precipitation = latestData.precipitation || 0;

  // Calculate feels like and condition (we don't have cloud cover in observations, estimate from precipitation)
  const feelsLike = calculateFeelsLike(temp, windSpeed);
  const estimatedClouds = precipitation > 0 ? 80 : 30; // Rough estimate
  const condition = getWeatherCondition(precipitation, estimatedClouds);

  return {
    temperature: Math.round(temp),
    windSpeed: Math.round(windSpeed * 10) / 10, // One decimal
    humidity: Math.round(humidity),
    precipitation: Math.round(precipitation * 10) / 10,
    feelsLike,
    condition: condition.text,
    conditionEmoji: condition.emoji,
    timestamp: latestData.timestamp || new Date().toISOString()
  };
}

/**
 * Extract forecast data from FMI XML
 * Returns 24-hour forecast
 */
function extractForecast(xml: Document): FMIHourlyForecast[] {
  const members = xml.getElementsByTagName('wfs:member');
  
  if (members.length === 0) {
    throw new Error('No forecast data found in FMI response');
  }

  // Group data by time
  const timeData: { [key: string]: any } = {};

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const time = member.getElementsByTagName('BsWfs:Time')[0]?.textContent;
    const paramName = member.getElementsByTagName('BsWfs:ParameterName')[0]?.textContent;
    const paramValue = member.getElementsByTagName('BsWfs:ParameterValue')[0]?.textContent;

    if (time && paramName && paramValue) {
      if (!timeData[time]) {
        timeData[time] = {
          time,
          temperature: null,
          precipitation: null,
          cloudCover: null
        };
      }

      if (paramName === 'Temperature') {
        timeData[time].temperature = parseFloat(paramValue);
      } else if (paramName === 'PrecipitationAmount') {
        timeData[time].precipitation = parseFloat(paramValue);
      } else if (paramName === 'TotalCloudCover') {
        timeData[time].cloudCover = parseFloat(paramValue);
      }
    }
  }

  // Convert to array and filter complete entries
  const forecasts: FMIHourlyForecast[] = [];
  const now = new Date();

  for (const time in timeData) {
    const data = timeData[time];
    const forecastTime = new Date(time);

    // Only include future times and next 24 hours
    if (forecastTime > now && forecasts.length < 24) {
      if (data.temperature !== null && data.cloudCover !== null) {
        const condition = getWeatherCondition(data.precipitation || 0, data.cloudCover);
        const hour = forecastTime.getHours();

        forecasts.push({
          time: time,
          hour: hour.toString(),
          temperature: Math.round(data.temperature),
          precipitation: Math.round((data.precipitation || 0) * 10) / 10,
          cloudCover: Math.round(data.cloudCover),
          condition: condition.text,
          conditionEmoji: condition.emoji
        });
      }
    }
  }

  return forecasts.slice(0, 24); // Ensure max 24 hours
}

/**
 * Fetch current weather observations from FMI - REAL DATA ONLY
 * Location: Kulosaari, Helsinki (60.187, 25.006)
 */
export async function fetchFMICurrentWeather(): Promise<FMICurrentWeather> {
  console.log('🌡️ Fetching REAL weather observations from FMI API for Kulosaari, Helsinki');
  
  try {
    const response = await fetch(FMI_OBSERVATIONS_URL);
    if (!response.ok) {
      throw new Error(`FMI API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const xml = parseXML(xmlText);

    // Check for errors in XML
    const exceptionText = xml.getElementsByTagName('ows:ExceptionText')[0]?.textContent;
    if (exceptionText) {
      throw new Error(`FMI API error: ${exceptionText}`);
    }

    const weatherData = extractObservations(xml);
    
    console.log('✅ REAL weather observations fetched from FMI:', weatherData);
    return weatherData;
  } catch (error) {
    console.error('❌ Failed to fetch FMI weather observations:', error);
    throw error;
  }
}

/**
 * Fetch 24-hour forecast from FMI - REAL DATA ONLY
 * Location: Kulosaari, Helsinki (60.187, 25.006)
 */
export async function fetchFMIForecast(): Promise<FMIHourlyForecast[]> {
  console.log('🌤️ Fetching REAL 24-hour forecast from FMI API for Kulosaari, Helsinki');
  
  try {
    const response = await fetch(FMI_FORECAST_URL);
    if (!response.ok) {
      throw new Error(`FMI API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const xml = parseXML(xmlText);

    // Check for errors in XML
    const exceptionText = xml.getElementsByTagName('ows:ExceptionText')[0]?.textContent;
    if (exceptionText) {
      throw new Error(`FMI API error: ${exceptionText}`);
    }

    const forecastData = extractForecast(xml);
    
    console.log(`✅ REAL 24-hour forecast fetched from FMI: ${forecastData.length} hours`);
    return forecastData;
  } catch (error) {
    console.error('❌ Failed to fetch FMI forecast:', error);
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
  console.log('🌍 Fetching COMPREHENSIVE weather data from FMI API');
  
  try {
    const [current, forecast] = await Promise.all([
      fetchFMICurrentWeather(),
      fetchFMIForecast()
    ]);

    console.log('✅ COMPREHENSIVE FMI weather data loaded:', {
      current: current.temperature + '°C',
      forecastHours: forecast.length
    });

    return { current, forecast };
  } catch (error) {
    console.error('❌ Failed to fetch comprehensive FMI weather:', error);
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
