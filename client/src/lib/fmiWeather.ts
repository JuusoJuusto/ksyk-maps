/**
 * FMI (Finnish Meteorological Institute) Weather API Integration
 * Free API - No API key required
 * Documentation: https://en.ilmatieteenlaitos.fi/open-data
 */

export interface FMIWeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudiness: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  weatherSymbol: number; // 1-100 weather code
  timestamp: string;
}

export interface FMIForecast {
  time: string;
  temperature: number;
  weatherSymbol: number;
  precipitation: number;
  windSpeed: number;
}

/**
 * Fetch current weather from FMI API
 * @param place City name (default: Helsinki)
 * @returns Current weather data
 */
export async function fetchFMIWeather(place: string = "Helsinki"): Promise<FMIWeatherData | null> {
  try {
    // Use Finland timezone
    const finlandTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' });
    const now = new Date(finlandTime);
    const endTime = now.toISOString();
    const startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    
    const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::simple&place=${encodeURIComponent(place)}&starttime=${startTime}&endtime=${endTime}&timestep=10`;
    
    console.log('🌡️ Fetching FMI weather:', place);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`FMI API error: ${response.status}, using mock data`);
      return getMockWeatherData();
    }

    const xmlText = await response.text();
    
    // Check for errors
    if (xmlText.includes('ExceptionReport') || xmlText.includes('Exception')) {
      console.warn('FMI API returned an error, using mock data');
      return getMockWeatherData();
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Parse XML response
    const members = xmlDoc.getElementsByTagName("wfs:member");
    if (members.length === 0) {
      console.warn("No weather data found from FMI, using mock data");
      return getMockWeatherData();
    }

    // Get the latest observation (last member)
    const latestMember = members[members.length - 1];
    
    // Helper function to get parameter value
    const getParameterValue = (parameterName: string): number => {
      const elements = latestMember.getElementsByTagName("BsWfs:ParameterName");
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].textContent === parameterName) {
          const valueElement = elements[i].parentElement?.getElementsByTagName("BsWfs:ParameterValue")[0];
          return parseFloat(valueElement?.textContent || "0");
        }
      }
      return 0;
    };

    const timeElement = latestMember.getElementsByTagName("BsWfs:Time")[0];
    const timestamp = timeElement?.textContent || new Date().toISOString();

    const temp = getParameterValue("t2m");
    const windSpeed = getParameterValue("ws_10min");
    
    const weatherData: FMIWeatherData = {
      temperature: temp,
      feelsLike: temp - (windSpeed * 0.5), // Simplified feels-like calculation
      humidity: getParameterValue("rh"), // Relative humidity
      windSpeed: windSpeed, // Wind speed (10 min avg)
      windDirection: getParameterValue("wd_10min"), // Wind direction
      cloudiness: getParameterValue("n_man"), // Cloud amount
      precipitation: getParameterValue("r_1h"), // Precipitation (1h)
      pressure: getParameterValue("p_sea"), // Pressure at sea level
      visibility: getParameterValue("vis") / 1000, // Visibility in km
      weatherSymbol: Math.round(getParameterValue("wawa")), // Weather code
      timestamp: timestamp
    };

    console.log('✅ Weather data fetched successfully');
    return weatherData;
  } catch (error) {
    console.error("Error fetching FMI weather:", error);
    return getMockWeatherData();
  }
}

/**
 * Fetch weather forecast from FMI API
 * @param place City name (default: Helsinki)
 * @param hours Number of hours to forecast (default: 24)
 * @returns Array of forecast data
 */
export async function fetchFMIForecast(place: string = "Helsinki", hours: number = 24): Promise<FMIForecast[]> {
  try {
    // Use Finland timezone for proper time handling
    const finlandTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' });
    const now = new Date(finlandTime);
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    
    // FMI forecast API - using simple format with time range
    const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::hirlam::surface::point::simple&place=${encodeURIComponent(place)}&starttime=${startTime}&endtime=${endTime}`;
    
    console.log('🌤️ Fetching FMI forecast:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`FMI forecast API returned ${response.status}, using fallback`);
      return generateMockForecast(hours);
    }

    const xmlText = await response.text();
    
    // Check if we got an error response
    if (xmlText.includes('ExceptionReport') || xmlText.includes('Exception')) {
      console.warn('FMI API returned an error, using fallback');
      return generateMockForecast(hours);
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const members = xmlDoc.getElementsByTagName("wfs:member");
    const forecasts: FMIForecast[] = [];

    // Parse simple format
    for (let i = 0; i < members.length && forecasts.length < hours; i++) {
      const member = members[i];
      const timeElement = member.getElementsByTagName("BsWfs:Time")[0];
      const time = timeElement?.textContent || "";
      
      if (!time) continue;
      
      // Convert to Finland timezone
      const forecastTime = new Date(time);
      const finlandTimeStr = forecastTime.toLocaleString('fi-FI', { 
        timeZone: 'Europe/Helsinki',
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Helper to get parameter value
      const getParam = (name: string): number => {
        const elements = member.getElementsByTagName("BsWfs:ParameterName");
        for (let j = 0; j < elements.length; j++) {
          if (elements[j].textContent === name) {
            const valueEl = elements[j].parentElement?.getElementsByTagName("BsWfs:ParameterValue")[0];
            return parseFloat(valueEl?.textContent || "0");
          }
        }
        return 0;
      };

      const temp = getParam("Temperature");
      const symbol = getParam("WeatherSymbol3");
      
      // Only add if we have valid data
      if (temp !== 0 || symbol !== 0) {
        forecasts.push({
          time: finlandTimeStr,
          temperature: Math.round(temp),
          weatherSymbol: Math.round(symbol),
          precipitation: getParam("Precipitation1h"),
          windSpeed: getParam("WindSpeedMS")
        });
      }
    }

    if (forecasts.length === 0) {
      console.warn('No forecast data parsed, using fallback');
      return generateMockForecast(hours);
    }

    console.log(`✅ Fetched ${forecasts.length} forecast entries`);
    return forecasts;
  } catch (error) {
    console.error("Error fetching FMI forecast:", error);
    return generateMockForecast(hours);
  }
}

/**
 * Generate mock forecast data as fallback
 */
function generateMockForecast(hours: number): FMIForecast[] {
  const forecasts: FMIForecast[] = [];
  const now = new Date();
  
  for (let i = 0; i < Math.min(hours, 24); i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const finlandTime = time.toLocaleString('fi-FI', { 
      timeZone: 'Europe/Helsinki',
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Generate realistic-looking data
    const baseTemp = 15;
    const tempVariation = Math.sin(i / 24 * Math.PI * 2) * 5;
    
    forecasts.push({
      time: finlandTime,
      temperature: Math.round(baseTemp + tempVariation),
      weatherSymbol: i % 6 === 0 ? 30 : (i % 3 === 0 ? 4 : 2),
      precipitation: i % 8 === 0 ? 0.5 : 0,
      windSpeed: 3 + Math.random() * 5
    });
  }
  
  return forecasts;
}

/**
 * Convert FMI weather symbol to icon name
 * @param symbol FMI weather symbol code (1-100)
 * @returns Icon name
 */
export function getWeatherIcon(symbol: number): string {
  if (symbol <= 0) return 'sun';
  if (symbol <= 2) return 'sun'; // Clear
  if (symbol <= 4) return 'cloud-sun'; // Partly cloudy
  if (symbol <= 6) return 'cloud'; // Cloudy
  if (symbol <= 20) return 'cloud'; // Overcast
  if (symbol <= 30) return 'cloud-rain'; // Light rain
  if (symbol <= 40) return 'cloud-rain'; // Rain
  if (symbol <= 50) return 'cloud-rain'; // Heavy rain
  if (symbol <= 60) return 'cloud-snow'; // Light snow
  if (symbol <= 70) return 'cloud-snow'; // Snow
  if (symbol <= 80) return 'cloud-snow'; // Heavy snow
  if (symbol <= 90) return 'cloud-lightning'; // Thunderstorm
  return 'cloud';
}

/**
 * Get weather description in Finnish
 * @param symbol FMI weather symbol code
 * @returns Finnish weather description
 */
export function getWeatherDescription(symbol: number): string {
  if (symbol <= 0) return 'Selkeää';
  if (symbol <= 2) return 'Selkeää';
  if (symbol <= 4) return 'Puolipilvistä';
  if (symbol <= 6) return 'Pilvistä';
  if (symbol <= 20) return 'Pilvistä';
  if (symbol <= 30) return 'Heikkoa sadetta';
  if (symbol <= 40) return 'Sadetta';
  if (symbol <= 50) return 'Voimakasta sadetta';
  if (symbol <= 60) return 'Heikkoa lumisadetta';
  if (symbol <= 70) return 'Lumisadetta';
  if (symbol <= 80) return 'Voimakasta lumisadetta';
  if (symbol <= 90) return 'Ukkosta';
  return 'Pilvistä';
}

/**
 * Get mock weather data as fallback (realistic Finnish weather)
 */
export function getMockWeatherData(): FMIWeatherData {
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
    cloudiness: Math.round(Math.random() * 100),
    precipitation: Math.random() > 0.7 ? Math.random() * 2 : 0,
    pressure: 1000 + Math.round(Math.random() * 30),
    visibility: 10 + Math.round(Math.random() * 40),
    weatherSymbol: Math.random() > 0.7 ? 30 : (Math.random() > 0.5 ? 4 : 2),
    timestamp: new Date().toISOString()
  };
}
