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
  Activity as ActivityIcon,
  Navigation,
  Map,
  Building,
  Users,
  Clock,
  Search
} from "lucide-react";

export default function Features() {
  const [activeFeature, setActiveFeature] = useState<string>('navigation');

  const features = [
    {
      id: 'navigation',
      name: 'Interactive Navigation',
      description: 'Real-time pathfinding between rooms with visual route display',
      icon: Navigation,
      category: 'Core Features',
      details: 'Navigate between any two rooms on campus with our intelligent pathfinding system. Get turn-by-turn directions with visual route overlay on the map.'
    },
    {
      id: 'campus-map',
      name: 'Interactive Campus Map',
      description: 'Detailed campus map with buildings, rooms, and hallways',
      icon: Map,
      category: 'Core Features',
      details: 'Explore the entire campus with our interactive map. Zoom, pan, and click on buildings to see detailed floor plans and room information.'
    },
    {
      id: 'room-search',
      name: 'Room Search & Directory',
      description: 'Quick search for rooms, staff, and locations',
      icon: Search,
      category: 'Core Features',
      details: 'Find any room or staff member instantly with our powerful search feature. Filter by building, floor, or room type.'
    },
    {
      id: 'building-management',
      name: 'Building Management',
      description: 'Comprehensive building and floor management system',
      icon: Building,
      category: 'Admin Features',
      details: 'Administrators can add, edit, and manage buildings, floors, rooms, and hallways through an intuitive interface.'
    },
    {
      id: 'staff-directory',
      name: 'Staff Directory',
      description: 'Complete staff directory with room assignments',
      icon: Users,
      category: 'Directory',
      details: 'Browse the complete staff directory with photos, contact information, and office locations.'
    },
    {
      id: 'lunch-menu',
      name: 'Daily Lunch Menu',
      description: 'View daily lunch menu from school cafeteria',
      icon: Calendar,
      category: 'Services',
      details: 'Check today\'s lunch menu directly in the app. Updated daily with nutritional information and allergen warnings.'
    },
    {
      id: 'hsl-integration',
      name: 'HSL Transit Integration',
      description: 'Real-time public transit information',
      icon: Clock,
      category: 'Services',
      details: 'View nearby bus and tram stops with real-time departure information powered by HSL API.'
    },
    {
      id: 'announcements',
      name: 'Announcements System',
      description: 'Important campus-wide announcements and alerts',
      icon: Bell,
      category: 'Communication',
      details: 'Stay informed with campus-wide announcements. Administrators can post important updates that appear on the home page.'
    },
    {
      id: 'dark-mode',
      name: 'Dark Mode',
      description: 'Eye-friendly dark theme for low-light environments',
      icon: Eye,
      category: 'Customization',
      details: 'Toggle between light and dark themes for comfortable viewing in any lighting condition.'
    },
    {
      id: 'pwa',
      name: 'Progressive Web App',
      description: 'Install as native app on any device',
      icon: Smartphone,
      category: 'PWA Features',
      details: 'Install KSYK Maps on your phone or desktop for quick access. Works offline with cached data.'
    },
    {
      id: 'multilingual',
      name: 'Multilingual Support',
      description: 'Available in multiple languages including Finnish and English',
      icon: Sparkles,
      category: 'Accessibility',
      details: 'Switch between languages seamlessly. Currently supports Finnish, English, and British English.'
    },
    {
      id: 'responsive',
      name: 'Responsive Design',
      description: 'Optimized for desktop, tablet, and mobile devices',
      icon: Smartphone,
      category: 'Accessibility',
      details: 'Fully responsive interface that adapts to any screen size. Touch-optimized for mobile devices.'
    },
    {
      id: 'analytics',
      name: 'Usage Analytics',
      description: 'Track app usage and popular routes',
      icon: BarChart3,
      category: 'Admin Features',
      details: 'Administrators can view detailed analytics about app usage, popular rooms, and navigation patterns.'
    },
    {
      id: 'ticket-system',
      name: 'Support Ticket System',
      description: 'Submit and track support requests',
      icon: Activity,
      category: 'Support',
      details: 'Report bugs, request features, or get help through our integrated ticket system. Track your tickets and receive email updates.'
    },
    {
      id: 'builder',
      name: 'KSYK Builder',
      description: 'Visual map editor for creating and editing campus layouts',
      icon: Settings,
      category: 'Admin Features',
      details: 'Powerful visual editor for administrators to create and modify campus maps, buildings, and rooms with drag-and-drop interface.'
    }
  ];

  const categories = Array.from(new Set(features.map(f => f.category)));
  const activeFeatureData = features.find(f => f.id === activeFeature);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KSYK Maps Features</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive campus navigation system with {features.length} features</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-3 py-1">
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
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">{category}</h4>
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
                              <div className="font-medium text-sm">{feature.name}</div>
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
                    <span>Core Features:</span>
                    <Badge variant="secondary">{features.filter(f => f.category === 'Core Features').length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Features:</span>
                    <Badge variant="secondary">{features.filter(f => f.category === 'Admin Features').length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Services:</span>
                    <Badge variant="secondary">{features.filter(f => f.category === 'Services').length}</Badge>
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
                      <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <activeFeatureData.icon className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{activeFeatureData.name}</CardTitle>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{activeFeatureData.description}</p>
                      </div>
                      <Badge className="ml-auto">{activeFeatureData.category}</Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Feature Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>About This Feature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {activeFeatureData.details}
                    </p>
                    
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How to Access</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        {activeFeatureData.category === 'Core Features' && 'This feature is available on the main campus map page.'}
                        {activeFeatureData.category === 'Admin Features' && 'This feature is available in the admin panel. Login required.'}
                        {activeFeatureData.category === 'Services' && 'Access this feature from the navigation menu.'}
                        {activeFeatureData.category === 'Support' && 'Click the support button in the header to access this feature.'}
                        {activeFeatureData.category === 'Customization' && 'Toggle this feature from the settings menu in the header.'}
                        {activeFeatureData.category === 'PWA Features' && 'This feature is built into the app and works automatically.'}
                        {activeFeatureData.category === 'Accessibility' && 'This feature is available throughout the app.'}
                        {activeFeatureData.category === 'Communication' && 'Announcements appear automatically on the home page.'}
                        {activeFeatureData.category === 'Directory' && 'Access the directory from the main navigation menu.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Try It Now */}
                <Card>
                  <CardHeader>
                    <CardTitle>Try It Now</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          if (activeFeatureData.id === 'navigation' || activeFeatureData.id === 'campus-map' || activeFeatureData.id === 'room-search') {
                            window.location.href = '/';
                          } else if (activeFeatureData.id === 'lunch-menu') {
                            window.location.href = '/lunch';
                          } else if (activeFeatureData.id === 'hsl-integration') {
                            window.location.href = '/hsl';
                          } else if (activeFeatureData.id === 'staff-directory') {
                            window.location.href = '/directory';
                          } else if (activeFeatureData.id === 'builder') {
                            window.location.href = '/builder';
                          } else if (activeFeatureData.id === 'building-management' || activeFeatureData.id === 'analytics') {
                            window.location.href = '/admin';
                          } else {
                            window.location.href = '/';
                          }
                        }}
                        className="flex-1"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Go to Feature
                      </Button>
                      <Button 
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                      >
                        Back to Map
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                  <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-sm">{feature.name}</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{feature.description}</p>
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