import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from "lucide-react";

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  feelsLike: number;
}

export default function WeatherApp() {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 15,
    condition: "Osittain pilviset",
    humidity: 65,
    windSpeed: 12,
    visibility: 10,
    feelsLike: 13,
  });

  useEffect(() => {
    // Simulate weather data
    const updateWeather = () => {
      const conditions = ["Selkeä", "Osittain pilviset", "Pilviset", "Sateinen"];
      setWeather({
        temp: Math.floor(Math.random() * 25) + 5,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 20) + 5,
        visibility: Math.floor(Math.random() * 5) + 5,
        feelsLike: Math.floor(Math.random() * 25) + 5,
      });
    };

    const timer = setInterval(updateWeather, 30000);
    return () => clearInterval(timer);
  }, []);

  const getWeatherIcon = () => {
    if (weather.condition.includes("Sateinen")) return <CloudRain className="w-16 h-16 text-blue-500" />;
    if (weather.condition.includes("Pilviset")) return <Cloud className="w-16 h-16 text-gray-500" />;
    return <Sun className="w-16 h-16 text-yellow-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6">
      {/* Current Weather */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          {getWeatherIcon()}
        </div>
        <p className="text-5xl font-bold mb-2">{weather.temp}°C</p>
        <p className="text-xl opacity-90">{weather.condition}</p>
        <p className="text-sm opacity-75">Tuntuu kuin {weather.feelsLike}°C</p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-5 h-5" />
            <p className="text-sm opacity-90">Kosteus</p>
          </div>
          <p className="text-2xl font-bold">{weather.humidity}%</p>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-5 h-5" />
            <p className="text-sm opacity-90">Tuuli</p>
          </div>
          <p className="text-2xl font-bold">{weather.windSpeed} km/h</p>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5" />
            <p className="text-sm opacity-90">Näkyvyys</p>
          </div>
          <p className="text-2xl font-bold">{weather.visibility} km</p>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5" />
            <p className="text-sm opacity-90">UV-indeksi</p>
          </div>
          <p className="text-2xl font-bold">{Math.floor(Math.random() * 8) + 1}</p>
        </div>
      </div>

      {/* Location */}
      <div className="mt-auto pt-4 border-t border-white/20 text-center text-sm opacity-75">
        <p>Helsinki, Suomi</p>
        <p>Päivitetty juuri nyt</p>
      </div>
    </div>
  );
}
