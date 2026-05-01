import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { fetchCurrentWeather, fetchHourlyForecast, fetchDailyForecast, getWeatherDescription } from "@/lib/openMeteoWeather";

interface WeatherWidgetProps {
  widgetId: string;
  widgetTitle: string;
  customizationMode?: boolean;
  onToggle?: () => void;
}

/**
 * Weather Widget - REAL DATA ONLY
 * Uses Open-Meteo API for Kulosaari, Helsinki (61.6575, 26.3728)
 * NO MOCK DATA - Shows error if API fails
 */
export default function WeatherWidget({ widgetId, widgetTitle, customizationMode, onToggle }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        console.log('🌤️ Fetching REAL weather data from Open-Meteo API (Kulosaari, Helsinki)...');
        
        const [current, hourly, daily] = await Promise.all([
          fetchCurrentWeather(),
          fetchHourlyForecast(6),
          fetchDailyForecast(3)
        ]);
        
        console.log('✅ REAL weather data loaded:', {
          temperature: current.temperature,
          feelsLike: current.feelsLike,
          windSpeed: current.windSpeed,
          timestamp: current.timestamp
        });
        
        setWeatherData({
          current,
          hourly,
          daily,
          description: getWeatherDescription(current.weatherCode)
        });
        setWeatherError(null);
      } catch (error) {
        console.error('❌ Failed to fetch weather data:', error);
        setWeatherError('Säätietojen lataus epäonnistui');
      } finally {
        setWeatherLoading(false);
      }
    };
    
    loadWeather();
    
    // Refresh every 10 minutes
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return 'sun';
    if (code <= 3) return 'cloud-sun';
    if (code <= 48) return 'cloud';
    if (code <= 67) return 'cloud-rain';
    if (code <= 77) return 'cloud-snow';
    if (code <= 99) return 'cloud-lightning';
    return 'cloud';
  };

  return (
    <Card key={widgetId} className="border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 group relative">
      <CardHeader className="bg-white dark:bg-gray-800 border-b border-[#dddddd] dark:border-gray-700 p-4 md:p-6">
        <CardTitle className="flex items-center justify-between text-base md:text-lg text-gray-900 dark:text-gray-100">
          <span>{widgetTitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {weatherLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">Ladataan säätietoja...</p>
          </div>
        ) : weatherError ? (
          <div className="flex flex-col items-center justify-center py-8 text-red-600 dark:text-red-400">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p className="text-sm">{weatherError}</p>
          </div>
        ) : weatherData ? (
          <div className="space-y-4">
            {/* Current Weather - REAL DATA */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                  {weatherData.current.temperature}°C
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {weatherData.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Kulosaari, Helsinki
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Päivitetty: {new Date(weatherData.current.timestamp).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-7xl">
                {getWeatherIcon(weatherData.current.weatherCode) === 'sun' && (
                  <svg className="w-20 h-20 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth={2} fill="none"/>
                  </svg>
                )}
                {getWeatherIcon(weatherData.current.weatherCode) === 'cloud-sun' && (
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" className="text-gray-400 dark:text-gray-500" fill="currentColor" opacity="0.3"/>
                    <circle cx="12" cy="8" r="3" className="text-yellow-400" fill="currentColor"/>
                  </svg>
                )}
                {getWeatherIcon(weatherData.current.weatherCode) === 'cloud' && (
                  <svg className="w-20 h-20 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18a4 4 0 01-.5-7.97A6 6 0 0117.5 10a5 5 0 110 10H6z"/>
                  </svg>
                )}
                {getWeatherIcon(weatherData.current.weatherCode) === 'cloud-rain' && (
                  <svg className="w-20 h-20 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18a4 4 0 01-.5-7.97A6 6 0 0117.5 10a5 5 0 110 10H6z"/>
                    <path d="M8 21v-2M12 21v-2M16 21v-2" stroke="currentColor" strokeWidth={2} fill="none"/>
                  </svg>
                )}
                {getWeatherIcon(weatherData.current.weatherCode) === 'cloud-snow' && (
                  <svg className="w-20 h-20 text-blue-300 dark:text-blue-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18a4 4 0 01-.5-7.97A6 6 0 0117.5 10a5 5 0 110 10H6z"/>
                    <circle cx="8" cy="21" r="1"/>
                    <circle cx="12" cy="21" r="1"/>
                    <circle cx="16" cy="21" r="1"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Weather Details - REAL DATA */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tuuli</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {weatherData.current.windSpeed} km/h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                </svg>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Puuskat</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {weatherData.current.windGusts} km/h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tuntuu kuin</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {weatherData.current.feelsLike}°C
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
                </svg>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pilvisyys</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {weatherData.current.cloudCover}%
                  </p>
                </div>
              </div>
            </div>

            {/* Hourly Forecast - REAL DATA */}
            <div className="border-t dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tuntikohtainen ennuste</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.hourly.map((hour: any, idx: number) => (
                  <div key={idx} className="flex-shrink-0 text-center p-2 bg-white/50 dark:bg-gray-700/50 rounded min-w-[60px]">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{hour.time}:00</p>
                    <div className="my-1">
                      {getWeatherIcon(hour.weatherCode) === 'sun' && (
                        <svg className="w-6 h-6 mx-auto text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="3"/>
                        </svg>
                      )}
                      {getWeatherIcon(hour.weatherCode) === 'cloud-sun' && (
                        <svg className="w-6 h-6 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                        </svg>
                      )}
                      {getWeatherIcon(hour.weatherCode) === 'cloud' && (
                        <svg className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                        </svg>
                      )}
                      {getWeatherIcon(hour.weatherCode) === 'cloud-rain' && (
                        <svg className="w-6 h-6 mx-auto text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                        </svg>
                      )}
                      {getWeatherIcon(hour.weatherCode) === 'cloud-snow' && (
                        <svg className="w-6 h-6 mx-auto text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {hour.temperature}°
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3-Day Forecast - REAL DATA */}
            {weatherData.daily && weatherData.daily.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs border-t dark:border-gray-700 pt-3">
                {weatherData.daily.map((day: any, idx: number) => {
                  const date = new Date(day.date);
                  const dayName = date.toLocaleDateString('fi-FI', { weekday: 'short' });
                  return (
                    <div key={idx} className="p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{dayName}</p>
                      <div className="my-1">
                        {getWeatherIcon(day.weatherCode) === 'sun' && (
                          <svg className="w-8 h-8 mx-auto text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3"/>
                          </svg>
                        )}
                        {getWeatherIcon(day.weatherCode) === 'cloud-sun' && (
                          <svg className="w-8 h-8 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                          </svg>
                        )}
                        {getWeatherIcon(day.weatherCode) === 'cloud' && (
                          <svg className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                          </svg>
                        )}
                        {getWeatherIcon(day.weatherCode) === 'cloud-rain' && (
                          <svg className="w-8 h-8 mx-auto text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                          </svg>
                        )}
                        {getWeatherIcon(day.weatherCode) === 'cloud-snow' && (
                          <svg className="w-8 h-8 mx-auto text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                          </svg>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">{day.tempMax}°</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{day.tempMin}°</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
