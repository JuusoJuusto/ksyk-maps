import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface OfflineData {
  buildings: any[];
  rooms: any[];
  maps: any[];
  lastSync: Date;
  size: string;
}

export function OfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Check for existing offline data
    const savedData = localStorage.getItem('ksyk-offline-data');
    if (savedData) {
      setOfflineData(JSON.parse(savedData));
    }

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const downloadOfflineData = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate downloading campus data
      const steps = [
        { name: 'Buildings data', delay: 500 },
        { name: 'Room information', delay: 800 },
        { name: 'Floor plans', delay: 1200 },
        { name: 'Navigation maps', delay: 1000 },
        { name: 'Emergency info', delay: 400 }
      ];

      let progress = 0;
      const stepIncrement = 100 / steps.length;

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        progress += stepIncrement;
        setDownloadProgress(Math.round(progress));
      }

      // Mock offline data
      const mockOfflineData: OfflineData = {
        buildings: [
          { id: '1', name: 'M', nameEn: 'Music Building' },
          { id: '2', name: 'K', nameEn: 'Classroom Building' },
          { id: '3', name: 'L', nameEn: 'Library' },
          { id: '4', name: 'A', nameEn: 'Assembly Hall' },
          { id: '5', name: 'U', nameEn: 'Utility Building' }
        ],
        rooms: Array.from({ length: 50 }, (_, i) => ({
          id: (i + 1).toString(),
          roomNumber: `${['M', 'K', 'L', 'A', 'U'][Math.floor(i / 10)]}${i % 10 + 10}`,
          name: `Room ${i + 1}`,
          floor: Math.floor(Math.random() * 3) + 1,
          capacity: Math.floor(Math.random() * 30) + 10
        })),
        maps: [
          { floor: 1, data: 'floor1_map_data' },
          { floor: 2, data: 'floor2_map_data' },
          { floor: 3, data: 'floor3_map_data' }
        ],
        lastSync: new Date(),
        size: '2.4 MB'
      };

      setOfflineData(mockOfflineData);
      localStorage.setItem('ksyk-offline-data', JSON.stringify(mockOfflineData));
      
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('ksyk-offline-data');
    setOfflineData(null);
  };

  const syncData = async () => {
    if (!isOnline) return;
    
    setIsDownloading(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (offlineData) {
      const updatedData = { ...offlineData, lastSync: new Date() };
      setOfflineData(updatedData);
      localStorage.setItem('ksyk-offline-data', JSON.stringify(updatedData));
    }
    
    setIsDownloading(false);
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} minutes ago`;
    }
    return `${hours} hours ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            Offline Mode
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-green-100 text-green-700">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className={`p-3 rounded-lg border ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Connected to internet' : 'Working offline'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {isOnline 
              ? 'All features available, data syncing enabled' 
              : 'Limited to cached data, some features unavailable'
            }
          </p>
        </div>

        {/* Offline Data Status */}
        {offlineData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Offline Data Available</span>
              <Badge variant="secondary">{offlineData.size}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Buildings:</span>
                  <span className="font-medium">{offlineData.buildings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rooms:</span>
                  <span className="font-medium">{offlineData.rooms.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Maps:</span>
                  <span className="font-medium">{offlineData.maps.length} floors</span>
                </div>
                <div className="flex justify-between">
                  <span>Last sync:</span>
                  <span className="font-medium text-xs">{formatLastSync(new Date(offlineData.lastSync))}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={syncData}
                disabled={!isOnline || isDownloading}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                {isDownloading ? 'Syncing...' : 'Sync Data'}
              </Button>
              <Button
                onClick={clearOfflineData}
                variant="outline"
                size="sm"
                className="px-3"
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Download campus data for offline access
            </p>
            <Button
              onClick={downloadOfflineData}
              disabled={isDownloading || !isOnline}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download Offline Data'}
            </Button>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Downloading...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Offline Features */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Available Offline:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-50 rounded text-center">Room Search</div>
            <div className="p-2 bg-gray-50 rounded text-center">Building Info</div>
            <div className="p-2 bg-gray-50 rounded text-center">Floor Plans</div>
            <div className="p-2 bg-gray-50 rounded text-center">Basic Navigation</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}