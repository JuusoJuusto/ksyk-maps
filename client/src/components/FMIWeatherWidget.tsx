import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Wind, Droplets, CloudRain, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  fetchFMIComprehensiveWeather,
  formatTime,
  type FMICurrentWeather,
  type FMIHourlyForecast
} from "@/lib/fmiWeather";

interface FMIWeatherWidgetProps {
  widgetId?: string;
  widgetTitle?: string;
  customizationMode?: boolean;
  onToggle?: () => void;
}

/**
 * FMI Weather Widget - REAL DATA FROM FINNISH METEOROLOGICAL INSTITUTE
 * Uses FMI Open Data API for Kulosaari, Helsinki (60.187, 25.006)
 * NO MOCK DATA - Shows error if API fails
 * Auto-refreshes every 5 minutes
 */
export default function FMIWeatherWidget({ 
  widgetId = 'fmi-weather', 
  widgetTitle = 'Sää (FMI)', 
  customizationMode, 
  onToggle 
}: FMIWeatherWidgetProps) {
  const [currentWeather, setCurrentWeather] = useState<FMICurrentWeather | null>(null);
  const [forecast, setForecast] = useState<FMIHourlyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🌤️ Loading FMI weather data for Kulosaari, Helsinki...');
      
      const data = await fetchFMIComprehensiveWeather();
      
      setCurrentWeather(data.current);
      setForecast(data.forecast);
      setLastUpdate(new Date());
      
      console.log('✅ FMI weather data loaded successfully!');
    } catch (err) {
      console.error('❌ Failed to load FMI weather:', err);
      setError('Säätietojen lataus epäonnistui (FMI API)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const renderWeatherEmoji = (emoji: string, size: 'small' | 'large' = 'large') => {
    const sizeClass = size === 'large' ? 'text-7xl' : 'text-3xl';
    return <div className={sizeClass}>{emoji}</div>;
  };

  return (
    <Card 
      key={widgetId} 
      className="border-2 border-blue-200 dark:border-blue-800 bg-white dark:from-gray-800 dark:to-gray-900 group relative"
    >
      <CardHeader className="bg-white dark:bg-gray-800 border-b border-[#dddddd] dark:border-gray-700 p-4 md:p-6">
        <CardTitle className="flex items-center justify-between text-base md:text-lg text-gray-900 dark:text-gray-100">
          <span>{widgetTitle}</span>
          {!loading && !error && (
            <Button
              size="sm"
              variant="ghost"
              onClick={loadWeatherData}
              className="h-8 px-2"
              title="Päivitä säätiedot"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">Ladataan FMI säätietoja...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-red-600 dark:text-red-400">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p className="text-sm font-semibold">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadWeatherData}
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Yritä uudelleen
            </Button>
          </div>
        ) : currentWeather ? (
          <div className="space-y-4">
            {/* Current Weather - REAL FMI DATA */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                  {currentWeather.temperature}°C
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {currentWeather.condition} {currentWeather.conditionEmoji}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Kulosaari, Helsinki
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Päivitetty: {lastUpdate ? formatTime(lastUpdate.toISOString()) : ''}
                </p>
              </div>
              <div>
                {renderWeatherEmoji(currentWeather.conditionEmoji, 'large')}
              </div>
            </div>

            {/* Weather Details - REAL FMI DATA */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Wind className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tuuli</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {currentWeather.windSpeed} m/s
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Droplets className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kosteus</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {currentWeather.humidity}%
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
                    {currentWeather.feelsLike}°C
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CloudRain className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sade (1h)</p>
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {currentWeather.precipitation} mm
                  </p>
                </div>
              </div>
            </div>

            {/* 24-Hour Forecast - REAL FMI DATA */}
            {forecast.length > 0 && (
              <div className="border-t dark:border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  24 tunnin ennuste
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {forecast.slice(0, 12).map((hour, idx) => (
                    <div 
                      key={idx} 
                      className={`flex-shrink-0 text-center p-2 rounded min-w-[70px] ${
                        hour.precipitation > 0 
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' 
                          : 'bg-white/50 dark:bg-gray-700/50'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {hour.hour}:00
                      </p>
                      <div className="my-1 text-2xl">
                        {hour.conditionEmoji}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {hour.temperature}°
                      </p>
                      {hour.precipitation > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          💧 {hour.precipitation}mm
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extended Forecast (next 12 hours) */}
            {forecast.length > 12 && (
              <div className="border-t dark:border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Seuraavat 12 tuntia
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {forecast.slice(12, 24).map((hour, idx) => (
                    <div 
                      key={idx} 
                      className={`flex-shrink-0 text-center p-2 rounded min-w-[70px] ${
                        hour.precipitation > 0 
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' 
                          : 'bg-white/50 dark:bg-gray-700/50'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {hour.hour}:00
                      </p>
                      <div className="my-1 text-2xl">
                        {hour.conditionEmoji}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {hour.temperature}°
                      </p>
                      {hour.precipitation > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          💧 {hour.precipitation}mm
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Source Info */}
            <div className="text-center pt-2 border-t dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Tiedot: Ilmatieteen laitos (FMI)
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Automaattinen päivitys 5 minuutin välein
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
