import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Info,
  Camera,
  Navigation,
  Home
} from 'lucide-react';

interface TourPoint {
  id: string;
  name: string;
  description: string;
  coordinates: { x: number; y: number; z: number };
  duration: number;
  audioNarration: string;
  interactiveElements: string[];
}

interface VirtualTour {
  id: string;
  roomId: string;
  roomName: string;
  duration: number;
  tourPoints: TourPoint[];
  thumbnailUrl: string;
  is360: boolean;
  hasAudio: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export function VirtualRoomTours() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedTour, setSelectedTour] = useState<VirtualTour | null>(null);
  const [currentPoint, setCurrentPoint] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewAngle, setViewAngle] = useState([0]);
  const [zoom, setZoom] = useState([50]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const virtualTours: VirtualTour[] = [
    {
      id: '1',
      roomId: 'M12',
      roomName: 'Music Room M12',
      duration: 180, // 3 minutes
      thumbnailUrl: '/tours/m12-thumb.jpg',
      is360: true,
      hasAudio: true,
      difficulty: 'beginner',
      tourPoints: [
        {
          id: 'p1',
          name: 'Room Entrance',
          description: 'Welcome to Music Room M12. This state-of-the-art facility features excellent acoustics and professional equipment.',
          coordinates: { x: 0, y: 0, z: 0 },
          duration: 20,
          audioNarration: 'Welcome to the music room...',
          interactiveElements: ['door', 'notice_board']
        },
        {
          id: 'p2',
          name: 'Grand Piano Area',
          description: 'Our beautiful Steinway grand piano is available for lessons and practice. The acoustic treatment ensures optimal sound quality.',
          coordinates: { x: 5, y: 0, z: 3 },
          duration: 30,
          audioNarration: 'This grand piano is tuned weekly...',
          interactiveElements: ['piano_keys', 'piano_bench', 'music_stand']
        },
        {
          id: 'p3',
          name: 'Recording Station',
          description: 'Professional recording equipment allows students to capture and analyze their performances.',
          coordinates: { x: 8, y: 1, z: 1 },
          duration: 25,
          audioNarration: 'The recording equipment includes...',
          interactiveElements: ['microphone', 'recording_console', 'speakers']
        },
        {
          id: 'p4',
          name: 'Practice Area',
          description: 'Individual practice stations with digital pianos and headphones for focused learning.',
          coordinates: { x: 2, y: 0, z: 6 },
          duration: 20,
          audioNarration: 'Students can practice here...',
          interactiveElements: ['digital_piano', 'headphones', 'metronome']
        }
      ]
    },
    {
      id: '2',
      roomId: 'K15',
      roomName: 'Classroom K15',
      duration: 120,
      thumbnailUrl: '/tours/k15-thumb.jpg',
      is360: true,
      hasAudio: true,
      difficulty: 'beginner',
      tourPoints: [
        {
          id: 'p1',
          name: 'Classroom Overview',
          description: 'Modern classroom with flexible seating arrangements and state-of-the-art technology.',
          coordinates: { x: 0, y: 0, z: 0 },
          duration: 15,
          audioNarration: 'This classroom features...',
          interactiveElements: ['smart_board', 'projector']
        },
        {
          id: 'p2',
          name: 'Interactive Whiteboard',
          description: 'Smart board technology enables dynamic, interactive lessons with touch controls and digital content.',
          coordinates: { x: 5, y: 1, z: 0 },
          duration: 25,
          audioNarration: 'The smart board allows teachers...',
          interactiveElements: ['whiteboard_controls', 'markers', 'eraser']
        },
        {
          id: 'p3',
          name: 'Student Seating',
          description: 'Ergonomic furniture arranged in collaborative groups to encourage discussion and teamwork.',
          coordinates: { x: 3, y: 0, z: 4 },
          duration: 20,
          audioNarration: 'The flexible seating arrangement...',
          interactiveElements: ['desk', 'chair', 'power_outlet']
        }
      ]
    },
    {
      id: '3',
      roomId: 'L20',
      roomName: 'Library Study Room L20',
      duration: 90,
      thumbnailUrl: '/tours/l20-thumb.jpg',
      is360: true,
      hasAudio: false,
      difficulty: 'beginner',
      tourPoints: [
        {
          id: 'p1',
          name: 'Quiet Study Space',
          description: 'Designed for focused individual or small group study with natural lighting and minimal distractions.',
          coordinates: { x: 0, y: 0, z: 0 },
          duration: 20,
          audioNarration: '',
          interactiveElements: ['study_table', 'reading_lamp']
        },
        {
          id: 'p2',
          name: 'Resource Collection',
          description: 'Curated collection of reference materials and subject-specific resources.',
          coordinates: { x: 1, y: 0, z: 2 },
          duration: 15,
          audioNarration: '',
          interactiveElements: ['bookshelf', 'reference_books']
        }
      ]
    }
  ];

  useEffect(() => {
    if (virtualTours.length > 0) {
      setSelectedTour(virtualTours[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedTour && canvasRef.current) {
      renderTourView();
    }
  }, [selectedTour, currentPoint, viewAngle, zoom]);

  const renderTourView = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedTour) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Simulate 360° view rendering
    const currentTourPoint = selectedTour.tourPoints[currentPoint];
    if (!currentTourPoint) return;

    // Create gradient background to simulate room environment
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#E6F3FF');
    gradient.addColorStop(0.5, '#B3D9FF');
    gradient.addColorStop(1, '#80C5FF');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw room elements based on tour point
    drawRoomElements(ctx, currentTourPoint);
    
    // Draw interactive hotspots
    drawInteractiveElements(ctx, currentTourPoint);
    
    // Draw navigation indicators
    drawNavigationIndicators(ctx);
  };

  const drawRoomElements = (ctx: CanvasRenderingContext2D, tourPoint: TourPoint) => {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const zoomFactor = zoom[0] / 50;
    const angle = viewAngle[0] * Math.PI / 180;

    // Simple room visualization based on room type
    if (selectedTour?.roomId === 'M12') {
      // Music room elements
      drawPiano(ctx, centerX + Math.cos(angle) * 100 * zoomFactor, centerY + 50);
      drawSpeakers(ctx, centerX - 150, centerY - 50);
      drawMusicStands(ctx, centerX + 80, centerY + 100);
    } else if (selectedTour?.roomId === 'K15') {
      // Classroom elements
      drawWhiteboard(ctx, centerX, centerY - 100);
      drawDesks(ctx, centerX, centerY + 50);
      drawProjector(ctx, centerX, centerY - 150);
    } else if (selectedTour?.roomId === 'L20') {
      // Library elements
      drawBookshelves(ctx, centerX - 200, centerY);
      drawStudyTable(ctx, centerX, centerY + 50);
      drawReadingLamp(ctx, centerX + 50, centerY);
    }
  };

  const drawPiano = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#2D2D2D';
    ctx.fillRect(x - 60, y - 20, 120, 40);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(x - 50 + i * 14, y - 15, 12, 30);
    }
  };

  const drawSpeakers = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(x, y, 30, 50);
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 15, y + 35, 12, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawMusicStands = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 80);
    ctx.stroke();
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(x - 20, y - 100, 40, 20);
  };

  const drawWhiteboard = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.fillRect(x - 150, y, 300, 80);
    ctx.strokeRect(x - 150, y, 300, 80);
  };

  const drawDesks = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const deskX = x - 120 + col * 80;
        const deskY = y + row * 60;
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(deskX, deskY, 60, 40);
      }
    }
  };

  const drawProjector = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(x - 20, y, 40, 20);
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.arc(x, y + 10, 5, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawBookshelves = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y - 100, 20, 200);
    // Books
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];
    for (let shelf = 0; shelf < 5; shelf++) {
      for (let book = 0; book < 8; book++) {
        ctx.fillStyle = colors[book % colors.length];
        ctx.fillRect(x + 2, y - 90 + shelf * 35 + book * 4, 16, 3);
      }
    }
  };

  const drawStudyTable = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(x - 80, y, 160, 60);
    // Chairs
    ctx.fillStyle = '#4682B4';
    ctx.fillRect(x - 90, y + 10, 15, 40);
    ctx.fillRect(x + 75, y + 10, 15, 40);
  };

  const drawReadingLamp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x, y - 50);
    ctx.lineTo(x + 30, y - 70);
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x + 30, y - 70, 15, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawInteractiveElements = (ctx: CanvasRenderingContext2D, tourPoint: TourPoint) => {
    tourPoint.interactiveElements.forEach((element, index) => {
      const x = 100 + index * 80;
      const y = 50;
      
      // Hotspot circle
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Plus icon
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
    });
  };

  const drawNavigationIndicators = (ctx: CanvasRenderingContext2D) => {
    if (!selectedTour) return;
    
    const totalPoints = selectedTour.tourPoints.length;
    const indicatorWidth = 200;
    const startX = (ctx.canvas.width - indicatorWidth) / 2;
    const y = ctx.canvas.height - 30;
    
    // Progress bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(startX, y, indicatorWidth, 10);
    
    // Progress bar fill
    const progress = (currentPoint + 1) / totalPoints;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(startX, y, indicatorWidth * progress, 10);
    
    // Point indicators
    for (let i = 0; i < totalPoints; i++) {
      const pointX = startX + (i / (totalPoints - 1)) * indicatorWidth;
      ctx.fillStyle = i === currentPoint ? '#10b981' : '#ffffff';
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointX, y + 5, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  };

  const playTour = () => {
    setIsPlaying(true);
    // Auto-advance through tour points
    const interval = setInterval(() => {
      setCurrentPoint(prev => {
        if (prev >= (selectedTour?.tourPoints.length || 1) - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return 0;
        }
        return prev + 1;
      });
    }, 3000);
  };

  const pauseTour = () => {
    setIsPlaying(false);
  };

  const resetTour = () => {
    setCurrentPoint(0);
    setIsPlaying(false);
    setViewAngle([0]);
    setZoom([50]);
  };

  const nextPoint = () => {
    if (selectedTour && currentPoint < selectedTour.tourPoints.length - 1) {
      setCurrentPoint(currentPoint + 1);
    }
  };

  const prevPoint = () => {
    if (currentPoint > 0) {
      setCurrentPoint(currentPoint - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tour Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Virtual Room Tours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {virtualTours.map((tour) => (
              <div
                key={tour.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedTour?.id === tour.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedTour(tour);
                  setCurrentPoint(0);
                  setIsPlaying(false);
                }}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-200 rounded mb-3 flex items-center justify-center">
                  <Play className="w-8 h-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">{tour.roomName}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>⏱️ {Math.floor(tour.duration / 60)}m {tour.duration % 60}s</span>
                    <span>📍 {tour.tourPoints.length} stops</span>
                  </div>
                  <div className="flex gap-1">
                    {tour.is360 && <Badge variant="secondary" className="text-xs">360°</Badge>}
                    {tour.hasAudio && <Badge variant="secondary" className="text-xs">Audio</Badge>}
                    <Badge variant="secondary" className="text-xs capitalize">{tour.difficulty}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Virtual Tour Viewer */}
      {selectedTour && (
        <Card className={isFullscreen ? 'fixed inset-0 z-50' : ''}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                {selectedTour.roomName}
                <Badge>{currentPoint + 1} / {selectedTour.tourPoints.length}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInfo(!showInfo)}
                >
                  <Info className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tour Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">View Angle</label>
                <Slider
                  value={viewAngle}
                  onValueChange={setViewAngle}
                  max={360}
                  min={0}
                  step={15}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Zoom</label>
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  max={200}
                  min={25}
                  step={5}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={isPlaying ? pauseTour : playTour}
                  className="flex-1"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" onClick={resetTour}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={prevPoint} disabled={currentPoint === 0}>
                  ← Prev
                </Button>
                <Button 
                  variant="outline" 
                  onClick={nextPoint} 
                  disabled={currentPoint === selectedTour.tourPoints.length - 1}
                >
                  Next →
                </Button>
              </div>
            </div>

            {/* 360° Canvas */}
            <div className="relative border rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
              <canvas
                ref={canvasRef}
                width={isFullscreen ? 1200 : 800}
                height={isFullscreen ? 800 : 500}
                className="w-full h-auto cursor-move"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startAngle = viewAngle[0];
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaX = e.clientX - startX;
                    setViewAngle([(startAngle + deltaX) % 360]);
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
              
              {/* Tour Info Overlay */}
              {showInfo && selectedTour.tourPoints[currentPoint] && (
                <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">
                    {selectedTour.tourPoints[currentPoint].name}
                  </h4>
                  <p className="text-sm">
                    {selectedTour.tourPoints[currentPoint].description}
                  </p>
                  {selectedTour.hasAudio && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="secondary">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      <span className="text-xs">Audio narration available</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Elements */}
            {selectedTour.tourPoints[currentPoint]?.interactiveElements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Interactive Elements</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTour.tourPoints[currentPoint].interactiveElements.map((element, index) => (
                    <Button key={index} variant="outline" size="sm">
                      {element.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tour Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {selectedTour.tourPoints.map((point, index) => (
                <Button
                  key={point.id}
                  variant={index === currentPoint ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPoint(index)}
                  className="justify-start"
                >
                  <Home className="w-3 h-3 mr-2" />
                  {point.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}