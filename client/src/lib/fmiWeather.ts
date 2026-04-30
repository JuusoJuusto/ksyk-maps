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
    const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::simple&place=${encodeURIComponent(place)}&maxlocations=1&timestep=10`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FMI API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Parse XML response
    const members = xmlDoc.getElementsByTagName("wfs:member");
    if (members.length === 0) {
      console.warn("No weather data found from FMI");
      return null;
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

    const weatherData: FMIWeatherData = {
      temperature: getParameterValue("t2m"), // Temperature at 2m
      feelsLike: getParameterValue("t2m") - (getParameterValue("ws_10min") * 0.5), // Simplified feels-like
      humidity: getParameterValue("rh"), // Relative humidity
      windSpeed: getParameterValue("ws_10min"), // Wind speed (10 min avg)
      windDirection: getParameterValue("wd_10min"), // Wind direction
      cloudiness: getParameterValue("n_man"), // Cloud amount
      precipitation: getParameterValue("r_1h"), // Precipitation (1h)
      pressure: getParameterValue("p_sea"), // Pressure at sea level
      visibility: getParameterValue("vis") / 1000, // Visibility in km
      weatherSymbol: Math.round(getParameterValue("wawa")), // Weather code
      timestamp: timestamp
    };

    return weatherData;
  } catch (error) {
    console.error("Error fetching FMI weather:", error);
    return null;
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
    // FMI forecast API - using simple format which is more reliable
    const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::hirlam::surface::point::simple&place=${encodeURIComponent(place)}&maxlocations=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`FMI forecast API returned ${response.status}, using fallback`);
      return [];
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const members = xmlDoc.getElementsByTagName("wfs:member");
    const forecasts: FMIForecast[] = [];
    const now = new Date();
    const maxTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // Parse simple format
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const timeElement = member.getElementsByTagName("BsWfs:Time")[0];
      const time = timeElement?.textContent || "";
      
      if (!time) continue;
      
      const forecastTime = new Date(time);
      if (forecastTime < now || forecastTime > maxTime) continue;

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

      forecasts.push({
        time: forecastTime.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' }),
        temperature: Math.round(getParam("Temperature")),
        weatherSymbol: Math.round(getParam("WeatherSymbol3")),
        precipitation: getParam("Precipitation1h"),
        windSpeed: getParam("WindSpeedMS")
      });
    }

    return forecasts.slice(0, hours);
  } catch (error) {
    console.error("Error fetching FMI forecast:", error);
    return [];
  }
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
 * Get mock weather data as fallback
 */
export function getMockWeatherData(): FMIWeatherData {
  return {
    temperature: 18,
    feelsLike: 16,
    humidity: 65,
    windSpeed: 12,
    windDirection: 180,
    cloudiness: 50,
    precipitation: 0,
    pressure: 1013,
    visibility: 10,
    weatherSymbol: 4,
    timestamp: new Date().toISOString()
  };
}
