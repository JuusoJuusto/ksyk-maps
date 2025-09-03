import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Thermometer, 
  Sun, 
  Wind,
  Droplets,
  Volume2,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity
} from 'lucide-react';

interface EnvironmentalData {
  roomId: string;
  roomName: string;
  temperature: number;
  humidity: number;
  lighting: number;
  noiseLevel: number;
  airQuality: number;
  occupancy: number;
  maxCapacity: number;
  energyUsage: number;
  ventilation: number;
  lastUpdated: Date;
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>;
  trends: {
    temperature: 'up' | 'down' | 'stable';
    humidity: 'up' | 'down' | 'stable';
    lighting: 'up' | 'down' | 'stable';
    occupancy: 'up' | 'down' | 'stable';
  };
}

export function EnvironmentalMonitoring() {
  const [selectedRoom, setSelectedRoom] = useState<string>('M12');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [historicalView, setHistoricalView] = useState(false);

  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData[]>([
    {
      roomId: 'M12',
      roomName: 'Music Room M12',
      temperature: 22.5,
      humidity: 45,
      lighting: 850,
      noiseLevel: 65,
      airQuality: 92,
      occupancy: 8,
      maxCapacity: 30,
      energyUsage: 78,
      ventilation: 82,
      lastUpdated: new Date(),
      alerts: [
        {
          type: 'info',
          message: 'Optimal acoustic conditions maintained',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ],
      trends: {
        temperature: 'stable',
        humidity: 'down',
        lighting: 'up',
        occupancy: 'up'
      }
    },
    {
      roomId: 'K15',
      roomName: 'Classroom K15',
      temperature: 24.1,
      humidity: 52,
      lighting: 720,
      noiseLevel: 42,
      airQuality: 88,
      occupancy: 18,
      maxCapacity: 25,
      energyUsage: 85,
      ventilation: 75,
      lastUpdated: new Date(),
      alerts: [
        {
          type: 'warning',
          message: 'High occupancy - consider increasing ventilation',
          timestamp: new Date(Date.now() - 2 * 60 * 1000)
        }
      ],
      trends: {
        temperature: 'up',
        humidity: 'stable',
        lighting: 'stable',
        occupancy: 'up'
      }
    },
    {
      roomId: 'L20',
      roomName: 'Library Study Room L20',
      temperature: 21.8,
      humidity: 40,
      lighting: 650,
      noiseLevel: 28,
      airQuality: 95,
      occupancy: 3,
      maxCapacity: 12,
      energyUsage: 45,
      ventilation: 60,
      lastUpdated: new Date(),
      alerts: [],
      trends: {
        temperature: 'stable',
        humidity: 'stable',
        lighting: 'down',
        occupancy: 'stable'
      }
    },
    {
      roomId: 'A10',
      roomName: 'Assembly Hall A10',
      temperature: 23.2,
      humidity: 48,
      lighting: 920,
      noiseLevel: 55,
      airQuality: 90,
      occupancy: 45,
      maxCapacity: 100,
      energyUsage: 95,
      ventilation: 88,
      lastUpdated: new Date(),
      alerts: [
        {
          type: 'error',
          message: 'Temperature exceeded recommended range',
          timestamp: new Date(Date.now() - 1 * 60 * 1000)
        }
      ],
      trends: {
        temperature: 'up',
        humidity: 'up',
        lighting: 'stable',
        occupancy: 'down'
      }
    }
  ]);

  const selectedRoomData = environmentalData.find(r => r.roomId === selectedRoom);

  // Simulate real-time data updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setEnvironmentalData(prevData => 
        prevData.map(room => ({
          ...room,
          temperature: room.temperature + (Math.random() - 0.5) * 0.5,
          humidity: Math.max(20, Math.min(80, room.humidity + (Math.random() - 0.5) * 2)),
          lighting: Math.max(200, Math.min(1000, room.lighting + (Math.random() - 0.5) * 50)),
          noiseLevel: Math.max(20, Math.min(100, room.noiseLevel + (Math.random() - 0.5) * 5)),
          airQuality: Math.max(50, Math.min(100, room.airQuality + (Math.random() - 0.5) * 2)),
          occupancy: Math.max(0, Math.min(room.maxCapacity, room.occupancy + Math.floor((Math.random() - 0.5) * 2))),
          energyUsage: Math.max(20, Math.min(100, room.energyUsage + (Math.random() - 0.5) * 3)),
          ventilation: Math.max(30, Math.min(100, room.ventilation + (Math.random() - 0.5) * 2)),
          lastUpdated: new Date()
        }))
      );
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLiveMode, refreshInterval]);

  const getStatusColor = (value: number, type: string) => {
    switch (type) {
      case 'temperature':
        if (value < 18 || value > 26) return 'text-red-600 bg-red-100';
        if (value < 20 || value > 24) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
      case 'humidity':
        if (value < 30 || value > 70) return 'text-red-600 bg-red-100';
        if (value < 40 || value > 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
      case 'lighting':
        if (value < 300 || value > 1000) return 'text-red-600 bg-red-100';
        if (value < 500 || value > 800) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
      case 'noise':
        if (value > 70) return 'text-red-600 bg-red-100';
        if (value > 50) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
      case 'airQuality':
        if (value < 70) return 'text-red-600 bg-red-100';
        if (value < 85) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
      case 'occupancy':
        const percentage = (value / 100) * 100;
        if (percentage > 90) return 'text-red-600 bg-red-100';
        if (percentage > 75) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-blue-500" />;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Selection & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Environmental Monitoring
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isLiveMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLiveMode(!isLiveMode)}
              >
                <Zap className="w-4 h-4 mr-1" />
                {isLiveMode ? 'Live' : 'Paused'}
              </Button>
              <Button
                variant={historicalView ? "default" : "outline"}
                size="sm"
                onClick={() => setHistoricalView(!historicalView)}
              >
                Historical
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {environmentalData.map((room) => (
              <Button
                key={room.roomId}
                variant={selectedRoom === room.roomId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoom(room.roomId)}
                className="flex items-center gap-2"
              >
                {room.roomName}
                {room.alerts.length > 0 && (
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      {selectedRoomData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Temperature</span>
                </div>
                {getTrendIcon(selectedRoomData.trends.temperature)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{selectedRoomData.temperature.toFixed(1)}°C</div>
                <Badge className={`text-xs mt-1 ${getStatusColor(selectedRoomData.temperature, 'temperature')}`}>
                  {selectedRoomData.temperature < 18 || selectedRoomData.temperature > 26 ? 'Critical' :
                   selectedRoomData.temperature < 20 || selectedRoomData.temperature > 24 ? 'Warning' : 'Optimal'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Humidity */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Humidity</span>
                </div>
                {getTrendIcon(selectedRoomData.trends.humidity)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{selectedRoomData.humidity}%</div>
                <Progress value={selectedRoomData.humidity} className="mt-2" />
                <Badge className={`text-xs mt-1 ${getStatusColor(selectedRoomData.humidity, 'humidity')}`}>
                  {selectedRoomData.humidity < 30 || selectedRoomData.humidity > 70 ? 'Critical' :
                   selectedRoomData.humidity < 40 || selectedRoomData.humidity > 60 ? 'Warning' : 'Optimal'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Lighting */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Lighting</span>
                </div>
                {getTrendIcon(selectedRoomData.trends.lighting)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{selectedRoomData.lighting} lux</div>
                <Progress value={(selectedRoomData.lighting / 1000) * 100} className="mt-2" />
                <Badge className={`text-xs mt-1 ${getStatusColor(selectedRoomData.lighting, 'lighting')}`}>
                  {selectedRoomData.lighting < 300 ? 'Too Dark' :
                   selectedRoomData.lighting > 1000 ? 'Too Bright' : 'Good'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Noise Level */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Noise Level</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{selectedRoomData.noiseLevel} dB</div>
                <Progress value={selectedRoomData.noiseLevel} className="mt-2" />
                <Badge className={`text-xs mt-1 ${getStatusColor(selectedRoomData.noiseLevel, 'noise')}`}>
                  {selectedRoomData.noiseLevel > 70 ? 'Too Loud' :
                   selectedRoomData.noiseLevel > 50 ? 'Moderate' : 'Quiet'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Metrics */}
      {selectedRoomData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Air Quality & Ventilation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-blue-600" />
                Air Quality & Ventilation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Air Quality Index</span>
                  <span className="font-bold">{selectedRoomData.airQuality}/100</span>
                </div>
                <Progress value={selectedRoomData.airQuality} className="h-2" />
                <Badge className={getStatusColor(selectedRoomData.airQuality, 'airQuality')}>
                  {selectedRoomData.airQuality >= 85 ? 'Excellent' :
                   selectedRoomData.airQuality >= 70 ? 'Good' : 'Poor'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Ventilation Rate</span>
                  <span className="font-bold">{selectedRoomData.ventilation}%</span>
                </div>
                <Progress value={selectedRoomData.ventilation} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Occupancy & Energy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Occupancy & Energy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Current Occupancy</span>
                  <span className="font-bold">{selectedRoomData.occupancy}/{selectedRoomData.maxCapacity}</span>
                </div>
                <Progress value={(selectedRoomData.occupancy / selectedRoomData.maxCapacity) * 100} className="h-2" />
                <Badge className={getStatusColor((selectedRoomData.occupancy / selectedRoomData.maxCapacity) * 100, 'occupancy')}>
                  {(selectedRoomData.occupancy / selectedRoomData.maxCapacity) * 100 > 90 ? 'Crowded' :
                   (selectedRoomData.occupancy / selectedRoomData.maxCapacity) * 100 > 75 ? 'Busy' : 'Available'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Energy Usage</span>
                  <span className="font-bold">{selectedRoomData.energyUsage}%</span>
                </div>
                <Progress value={selectedRoomData.energyUsage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts & Notifications */}
      {selectedRoomData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRoomData.alerts.length > 0 ? (
              <div className="space-y-3">
                {selectedRoomData.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      alert.type === 'error' ? 'bg-red-50 border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-gray-600">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Acknowledge
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>All systems operating normally</p>
                <p className="text-sm">No alerts or warnings</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historical Data Chart Placeholder */}
      {historicalView && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Trends (Last 24 Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 text-blue-600" />
                <p className="text-gray-600">Historical chart visualization</p>
                <p className="text-sm text-gray-500">Temperature, humidity, and occupancy trends</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}