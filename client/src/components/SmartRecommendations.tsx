import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Users, 
  Zap,
  TrendingUp,
  Star,
  Route
} from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'room' | 'route' | 'feature';
  title: string;
  description: string;
  confidence: number;
  reason: string;
  actionText: string;
  data?: any;
}

export function SmartRecommendations() {
  const [recommendations] = useState<Recommendation[]>([
    {
      id: '1',
      type: 'room',
      title: 'Music Room M12',
      description: 'Perfect for your music lesson at 14:00',
      confidence: 95,
      reason: 'Based on your schedule and room availability',
      actionText: 'Navigate Now',
      data: { room: 'M12', time: '14:00' }
    },
    {
      id: '2',
      type: 'route',
      title: 'Fastest Route to Library',
      description: 'Avoid crowded K-wing, use A-wing corridor',
      confidence: 87,
      reason: 'Current traffic patterns show 40% faster route',
      actionText: 'Show Route',
      data: { from: 'current', to: 'L20', duration: '3 min' }
    },
    {
      id: '3',
      type: 'feature',
      title: 'Voice Navigation',
      description: 'Try hands-free navigation with voice commands',
      confidence: 78,
      reason: 'You frequently navigate while carrying items',
      actionText: 'Try Voice Nav',
      data: { feature: 'voice' }
    },
    {
      id: '4',
      type: 'room',
      title: 'Study Room A15',
      description: 'Quiet space available for next 2 hours',
      confidence: 82,
      reason: 'Your study patterns suggest preference for quiet areas',
      actionText: 'Reserve',
      data: { room: 'A15', available: '2 hours' }
    }
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'room': return <MapPin className="w-5 h-5 text-blue-600" />;
      case 'route': return <Route className="w-5 h-5 text-green-600" />;
      case 'feature': return <Zap className="w-5 h-5 text-purple-600" />;
      default: return <Star className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 80) return 'text-blue-600 bg-blue-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const handleRecommendationClick = (rec: Recommendation) => {
    switch (rec.type) {
      case 'room':
        // Simulate navigation to room
        console.log(`Navigating to room ${rec.data?.room}`);
        break;
      case 'route':
        // Simulate showing route
        console.log(`Showing route: ${rec.data?.from} to ${rec.data?.to}`);
        break;
      case 'feature':
        // Simulate feature activation
        console.log(`Activating feature: ${rec.data?.feature}`);
        break;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Smart Recommendations
          <Badge variant="secondary" className="ml-auto">AI Powered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div 
              key={rec.id}
              className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleRecommendationClick(rec)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getIcon(rec.type)}
                  <div>
                    <h4 className="font-semibold text-sm">{rec.title}</h4>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                </div>
                <Badge 
                  className={`text-xs ${getConfidenceColor(rec.confidence)}`}
                >
                  {rec.confidence}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="w-3 h-3" />
                  {rec.reason}
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  {rec.actionText}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm">AI Insights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span className="font-medium">Peak Hours</span>
              </div>
              <p className="text-gray-600">10:00-14:00</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-3 h-3 text-green-600" />
                <span className="font-medium">Crowd Level</span>
              </div>
              <p className="text-gray-600">Moderate</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-purple-600" />
                <span className="font-medium">Hotspots</span>
              </div>
              <p className="text-gray-600">M-wing, Library</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}