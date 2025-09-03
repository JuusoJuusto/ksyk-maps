import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Navigation, 
  MapPin,
  Target,
  Compass,
  QrCode,
  Zap,
  Eye,
  Smartphone,
  Wifi
} from 'lucide-react';

interface ARMarker {
  id: string;
  roomId: string;
  roomName: string;
  distance: number;
  direction: number; // degrees from north
  floor: number;
  coordinates: { x: number; y: number; z: number };
  isVisible: boolean;
}

interface DeviceOrientation {
  alpha: number; // rotation around z-axis (compass)
  beta: number;  // rotation around x-axis (tilt)
  gamma: number; // rotation around y-axis (roll)
}

export function ARRoomFinder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isARActive, setIsARActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>({
    alpha: 0, beta: 0, gamma: 0
  });
  const [userLocation, setUserLocation] = useState({ x: 0, y: 0, floor: 1 });
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [arSupported, setArSupported] = useState(true);

  const arMarkers: ARMarker[] = [
    {
      id: '1',
      roomId: 'M12',
      roomName: 'Music Room M12',
      distance: 15.5,
      direction: 45,
      floor: 1,
      coordinates: { x: 10, y: 0, z: 5 },
      isVisible: true
    },
    {
      id: '2',
      roomId: 'K15',
      roomName: 'Classroom K15',
      distance: 23.2,
      direction: 135,
      floor: 1,
      coordinates: { x: -5, y: 0, z: 10 },
      isVisible: true
    },
    {
      id: '3',
      roomId: 'L20',
      roomName: 'Library Study Room L20',
      distance: 31.8,
      direction: 270,
      floor: 2,
      coordinates: { x: -8, y: 3, z: -2 },
      isVisible: false
    },
    {
      id: '4',
      roomId: 'A10',
      roomName: 'Assembly Hall A10',
      distance: 42.1,
      direction: 180,
      floor: 1,
      coordinates: { x: 0, y: 0, z: -15 },
      isVisible: true
    }
  ];

  const filteredMarkers = arMarkers.filter(marker => 
    marker.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    marker.roomId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // Check for AR support
    const checkARSupport = () => {
      const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasOrientation = typeof DeviceOrientationEvent !== 'undefined';
      const hasGeolocation = 'geolocation' in navigator;
      
      setArSupported(hasCamera && hasOrientation && hasGeolocation);
    };

    checkARSupport();

    // Request device orientation permission (iOS)
    if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
      (DeviceOrientationEvent as any).requestPermission?.();
    }

    // Set up orientation listener
    const handleOrientation = (event: DeviceOrientationEvent) => {
      setDeviceOrientation({
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const startAR = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsARActive(true);
        startARRender();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopAR = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsARActive(false);
  };

  const startARRender = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (!isARActive) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw AR overlays
      drawARMarkers(ctx);
      drawCompass(ctx);
      drawDirectionalIndicators(ctx);

      requestAnimationFrame(render);
    };

    render();
  };

  const drawARMarkers = (ctx: CanvasRenderingContext2D) => {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    filteredMarkers.forEach(marker => {
      if (!marker.isVisible) return;

      // Calculate marker position based on device orientation and distance
      const relativeDirection = marker.direction - deviceOrientation.alpha;
      const screenX = canvasWidth / 2 + Math.sin(relativeDirection * Math.PI / 180) * 200;
      const screenY = canvasHeight / 2 - marker.distance * 2;

      // Only show markers that would be in view
      if (screenX < 0 || screenX > canvasWidth) return;

      // Draw marker background
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      const markerWidth = 200;
      const markerHeight = 80;
      const x = screenX - markerWidth / 2;
      const y = Math.max(50, Math.min(screenY, canvasHeight - markerHeight - 50));

      // Rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x, y, markerWidth, markerHeight, 10);
      ctx.fill();
      ctx.stroke();

      // Room name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(marker.roomName, screenX, y + 25);

      // Distance and direction
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`${marker.distance.toFixed(1)}m away`, screenX, y + 45);
      ctx.fillText(`Floor ${marker.floor}`, screenX, y + 60);

      // Direction arrow
      const arrowSize = 15;
      const arrowX = screenX;
      const arrowY = y - 20;
      
      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(relativeDirection * Math.PI / 180);
      
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize);
      ctx.lineTo(-arrowSize/2, arrowSize/2);
      ctx.lineTo(arrowSize/2, arrowSize/2);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();

      // Highlight selected room
      if (marker.roomId === selectedRoom) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
  };

  const drawCompass = (ctx: CanvasRenderingContext2D) => {
    const compassSize = 80;
    const compassX = ctx.canvas.width - compassSize - 20;
    const compassY = 20 + compassSize;

    // Compass background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Compass needle
    ctx.save();
    ctx.translate(compassX, compassY);
    ctx.rotate(-deviceOrientation.alpha * Math.PI / 180);

    // North needle (red)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -compassSize / 2 + 10);
    ctx.lineTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();

    // South needle (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, compassSize / 2 - 10);
    ctx.lineTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Compass label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - compassSize / 2 - 5);
  };

  const drawDirectionalIndicators = (ctx: CanvasRenderingContext2D) => {
    if (!selectedRoom) return;

    const selectedMarker = arMarkers.find(m => m.roomId === selectedRoom);
    if (!selectedMarker) return;

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Draw path line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, canvasHeight);
    const targetX = canvasWidth / 2 + Math.sin((selectedMarker.direction - deviceOrientation.alpha) * Math.PI / 180) * 200;
    const targetY = canvasHeight / 2 - selectedMarker.distance * 2;
    ctx.lineTo(targetX, Math.max(100, targetY));
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance indicator at bottom
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.fillRect(canvasWidth / 2 - 100, canvasHeight - 60, 200, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${selectedMarker.distance.toFixed(1)}m to ${selectedMarker.roomName}`,
      canvasWidth / 2,
      canvasHeight - 35
    );
  };

  const calibrateAR = () => {
    // Simulate calibration process
    setIsCalibrated(true);
    setTimeout(() => setIsCalibrated(false), 3000);
  };

  const scanQRCode = () => {
    // Simulate QR code scanning for room location
    console.log('Scanning QR code for precise location...');
  };

  return (
    <div className="space-y-4">
      {/* AR Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Augmented Reality Room Finder
            {!arSupported && (
              <Badge variant="destructive">Not Supported</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!arSupported && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                AR features require a device with camera, orientation sensors, and location services.
                Try using a smartphone or tablet with these capabilities.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Rooms</label>
              <Input
                placeholder="Search for room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Room</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                <option value="">Select room to navigate</option>
                {filteredMarkers.map(marker => (
                  <option key={marker.id} value={marker.roomId}>
                    {marker.roomName} - {marker.distance.toFixed(1)}m
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={isARActive ? stopAR : startAR}
              disabled={!arSupported}
              className={isARActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              <Camera className="w-4 h-4 mr-2" />
              {isARActive ? 'Stop AR' : 'Start AR'}
            </Button>
            <Button variant="outline" onClick={calibrateAR} disabled={!isARActive}>
              <Compass className="w-4 h-4 mr-2" />
              Calibrate
            </Button>
            <Button variant="outline" onClick={scanQRCode} disabled={!isARActive}>
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR
            </Button>
          </div>

          {isCalibrated && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                AR calibrated successfully! Point your camera around to see room markers.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AR Viewer */}
      {isARActive && (
        <Card>
          <CardContent className="p-0">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-96 object-cover"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="absolute inset-0 w-full h-full"
              />
              
              {/* AR Interface Overlay */}
              <div className="absolute top-4 left-4 space-y-2">
                <Badge className="bg-green-500">
                  <Eye className="w-3 h-3 mr-1" />
                  AR Active
                </Badge>
                {selectedRoom && (
                  <Badge className="bg-blue-500">
                    <Navigation className="w-3 h-3 mr-1" />
                    Navigating to {selectedRoom}
                  </Badge>
                )}
              </div>

              {/* Device Info */}
              <div className="absolute bottom-4 left-4 text-white text-xs space-y-1">
                <div className="bg-black bg-opacity-50 px-2 py-1 rounded">
                  Compass: {deviceOrientation.alpha.toFixed(0)}°
                </div>
                <div className="bg-black bg-opacity-50 px-2 py-1 rounded">
                  Tilt: {deviceOrientation.beta.toFixed(0)}°
                </div>
                <div className="bg-black bg-opacity-50 px-2 py-1 rounded">
                  Floor: {userLocation.floor}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Nearby Rooms ({filteredMarkers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMarkers.map((marker) => (
              <div
                key={marker.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedRoom === marker.roomId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRoom(marker.roomId)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{marker.roomName}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📍 {marker.distance.toFixed(1)}m away</span>
                      <span>🧭 {marker.direction}° direction</span>
                      <span>🏢 Floor {marker.floor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {marker.isVisible && (
                      <Badge className="bg-green-100 text-green-700">
                        <Eye className="w-3 h-3 mr-1" />
                        Visible
                      </Badge>
                    )}
                    <Button size="sm" variant="outline">
                      Navigate
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AR Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            How to Use AR Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Getting Started:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Allow camera and location permissions</li>
                <li>• Hold device upright in landscape mode</li>
                <li>• Ensure good lighting conditions</li>
                <li>• Connect to campus WiFi for best accuracy</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Navigation Tips:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Calibrate compass when prompted</li>
                <li>• Scan QR codes for precise positioning</li>
                <li>• Follow the green path indicators</li>
                <li>• Use voice commands for hands-free nav</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}