import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Star, 
  Camera, 
  Activity, 
  Eye, 
  Zap,
  MapPin,
  Smartphone,
  BarChart3,
  Bell,
  Volume2,
  Sparkles,
  Wifi,
  Download,
  Settings,
  Activity as ActivityIcon
} from "lucide-react";

// Import all new feature components
import { RoomBookingSystem } from "@/components/RoomBookingSystem";
import { Room3DVisualization } from "@/components/Room3DVisualization";
import { RoomRatingSystem } from "@/components/RoomRatingSystem";
import { ARRoomFinder } from "@/components/ARRoomFinder";
import { VirtualRoomTours } from "@/components/VirtualRoomTours";
import { EnvironmentalMonitoring } from "@/components/EnvironmentalMonitoring";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { AdvancedAnalytics } from "@/components/AdvancedAnalytics";
import { RealTimeNotifications } from "@/components/RealTimeNotifications";
import { VoiceNavigation } from "@/components/VoiceNavigation";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { OfflineMode } from "@/components/OfflineMode";
import { DataExportImport } from "@/components/DataExportImport";
import { UserPreferences } from "@/components/UserPreferences";
import { WebSocketStatus } from "@/components/WebSocketStatus";
import { SystemStatus } from "@/components/SystemStatus";

export default function Features() {
  const [activeFeature, setActiveFeature] = useState<string>('booking');

  const features = [
    {
      id: 'booking',
      name: 'Room Booking System',
      description: 'Advanced reservation system with real-time availability',
      icon: Calendar,
      component: RoomBookingSystem,
      category: 'Core Features'
    },
    {
      id: '3d-visualization',
      name: '3D Room Visualization',
      description: 'Interactive 3D room viewer with furniture and lighting',
      icon: Eye,
      component: Room3DVisualization,
      category: 'Visualization'
    },
    {
      id: 'rating-system',
      name: 'Room Rating & Reviews',
      description: 'Comprehensive rating system with detailed reviews',
      icon: Star,
      component: RoomRatingSystem,
      category: 'User Feedback'
    },
    {
      id: 'ar-finder',
      name: 'AR Room Finder',
      description: 'Augmented reality navigation with live camera feed',
      icon: Smartphone,
      component: ARRoomFinder,
      category: 'Advanced Navigation'
    },
    {
      id: 'virtual-tours',
      name: 'Virtual Room Tours',
      description: 'Immersive 360° room tours with interactive elements',
      icon: Camera,
      component: VirtualRoomTours,
      category: 'Visualization'
    },
    {
      id: 'environmental',
      name: 'Environmental Monitoring',
      description: 'Real-time room conditions and environmental data',
      icon: Activity,
      component: EnvironmentalMonitoring,
      category: 'Monitoring'
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate and share QR codes for room navigation',
      icon: MapPin,
      component: QRCodeGenerator,
      category: 'Utilities'
    },
    {
      id: 'analytics',
      name: 'Advanced Analytics',
      description: 'Comprehensive usage analytics and insights',
      icon: BarChart3,
      component: AdvancedAnalytics,
      category: 'Analytics'
    },
    {
      id: 'notifications',
      name: 'Real-time Notifications',
      description: 'Live alerts and notification system',
      icon: Bell,
      component: RealTimeNotifications,
      category: 'Communication'
    },
    {
      id: 'voice-navigation',
      name: 'Voice Navigation',
      description: 'Hands-free navigation with voice commands',
      icon: Volume2,
      component: VoiceNavigation,
      category: 'Accessibility'
    },
    {
      id: 'smart-recommendations',
      name: 'Smart Recommendations',
      description: 'AI-powered room and route suggestions',
      icon: Sparkles,
      component: SmartRecommendations,
      category: 'AI Features'
    },
    {
      id: 'offline-mode',
      name: 'Offline Mode',
      description: 'Complete offline functionality with data caching',
      icon: Wifi,
      component: OfflineMode,
      category: 'PWA Features'
    },
    {
      id: 'data-export',
      name: 'Data Export & Import',
      description: 'Export and import campus data in multiple formats',
      icon: Download,
      component: DataExportImport,
      category: 'Data Management'
    },
    {
      id: 'user-preferences',
      name: 'User Preferences',
      description: 'Comprehensive customization and settings',
      icon: Settings,
      component: UserPreferences,
      category: 'Customization'
    },
    {
      id: 'websocket-status',
      name: 'Real-time Connection',
      description: 'Live WebSocket connection monitoring',
      icon: ActivityIcon,
      component: WebSocketStatus,
      category: 'System Status'
    },
    {
      id: 'system-status',
      name: 'System Health Monitor',
      description: 'Comprehensive system health and diagnostics',
      icon: Activity,
      component: SystemStatus,
      category: 'System Status'
    }
  ];

  const categories = Array.from(new Set(features.map(f => f.category)));
  const activeFeatureData = features.find(f => f.id === activeFeature);
  const ActiveComponent = activeFeatureData?.component;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KSYK Map Features</h1>
              <p className="text-gray-600 mt-1">Comprehensive campus navigation system with 15+ premium features</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
                {features.length} Features
              </Badge>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                Back to Campus Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Feature Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Feature Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map((category) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">{category}</h4>
                    <div className="space-y-1">
                      {features
                        .filter(f => f.category === category)
                        .map((feature) => (
                          <Button
                            key={feature.id}
                            variant={activeFeature === feature.id ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveFeature(feature.id)}
                            className="w-full justify-start text-left h-auto p-3"
                          >
                            <feature.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {feature.description}
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Feature Stats */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>System Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total Features:</span>
                    <Badge variant="secondary">{features.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Categories:</span>
                    <Badge variant="secondary">{categories.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Features:</span>
                    <Badge variant="secondary">3</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>AR/VR Features:</span>
                    <Badge variant="secondary">3</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Real-time Features:</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Content */}
          <div className="lg:col-span-3">
            {activeFeatureData && (
              <div className="space-y-6">
                {/* Feature Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <activeFeatureData.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{activeFeatureData.name}</CardTitle>
                        <p className="text-gray-600 mt-1">{activeFeatureData.description}</p>
                      </div>
                      <Badge className="ml-auto">{activeFeatureData.category}</Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Feature Component */}
                <div className="bg-white rounded-lg border shadow-sm">
                  <div className="p-6">
                    {ActiveComponent && <ActiveComponent />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Grid Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t">
        <h2 className="text-2xl font-bold mb-6">All Features Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeFeature === feature.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setActiveFeature(feature.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <feature.icon className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-sm">{feature.name}</h4>
                </div>
                <p className="text-xs text-gray-600 mb-2">{feature.description}</p>
                <Badge variant="outline" className="text-xs">
                  {feature.category}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}