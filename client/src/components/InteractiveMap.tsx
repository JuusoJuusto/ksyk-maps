import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { Building } from "@shared/schema";

export default function InteractiveMap() {
  const { t } = useTranslation();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const buildingColors: Record<string, string> = {
    'academic': 'bg-primary',
    'sports': 'bg-accent', 
    'library': 'bg-secondary',
    'music': 'bg-destructive',
    'administration': 'bg-accent'
  };

  const defaultBuildings = [
    {
      id: 'u-wing',
      name: t('building.uwing'),
      description: t('building.uwing.desc'),
      type: 'academic',
      position: { x: -100, y: -60 },
      size: { w: 32, h: 20 },
      icon: 'fas fa-chalkboard-teacher'
    },
    {
      id: 'main',
      name: t('building.main'),
      description: t('building.main.desc'),
      type: 'administration',
      position: { x: 0, y: 0 },
      size: { w: 48, h: 32 },
      icon: 'fas fa-university'
    },
    {
      id: 'library',
      name: t('building.library'),
      description: t('building.library.desc'),
      type: 'library',
      position: { x: 200, y: -30 },
      size: { w: 28, h: 24 },
      icon: 'fas fa-book'
    },
    {
      id: 'music',
      name: t('building.music'),
      description: t('building.music.desc'),
      type: 'music',
      position: { x: -80, y: 150 },
      size: { w: 32, h: 20 },
      icon: 'fas fa-music'
    },
    {
      id: 'gym',
      name: t('building.gym'),
      description: t('building.gym.desc'),
      type: 'sports',
      position: { x: 200, y: 80 },
      size: { w: 36, h: 28 },
      icon: 'fas fa-dumbbell'
    },
    {
      id: 'lab',
      name: t('building.lab'),
      description: t('building.lab.desc'),
      type: 'academic',
      position: { x: 100, y: 150 },
      size: { w: 32, h: 20 },
      icon: 'fas fa-flask'
    }
  ];

  const handleBuildingClick = (building: any) => {
    setSelectedBuilding(building);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">{t('map.title')}</h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" data-testid="button-zoom-in">
              <i className="fas fa-search-plus mr-1"></i>{t('map.zoomIn')}
            </Button>
            <Button variant="outline" size="sm" data-testid="button-floors">
              <i className="fas fa-layer-group mr-1"></i>{t('map.floors')}
            </Button>
          </div>
        </div>
        
        {/* Interactive campus map */}
        <div className="relative bg-muted rounded-lg p-8 min-h-[500px]" data-testid="campus-map">
          {/* Main Building Complex */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {defaultBuildings.map((building) => (
              <div
                key={building.id}
                className={`map-building absolute ${buildingColors[building.type] || 'bg-primary'} rounded-md shadow-lg flex items-center justify-center text-white font-semibold hover:shadow-xl cursor-pointer transition-all hover:scale-105`}
                style={{
                  top: `${building.position.y}px`,
                  left: `${building.position.x}px`,
                  width: `${building.size.w * 4}px`,
                  height: `${building.size.h * 4}px`,
                }}
                onClick={() => handleBuildingClick(building)}
                data-testid={`building-${building.id}`}
              >
                <div className="text-center">
                  <i className={`${building.icon} text-lg mb-1`}></i>
                  <div className="text-sm">{building.name}</div>
                  <div className="text-xs opacity-75">{building.description}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card p-3 rounded-md border border-border shadow-sm">
            <div className="text-sm font-medium text-foreground mb-2">{t('map.legend')}</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary rounded mr-2"></div>
                {t('map.academic')}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-accent rounded mr-2"></div>
                {t('map.sports')}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-secondary rounded mr-2"></div>
                {t('map.library')}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-destructive rounded mr-2"></div>
                {t('map.music')}
              </div>
            </div>
          </div>
          
          {/* Navigation Compass */}
          <div className="absolute top-4 right-4 w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center shadow-sm">
            <i className="fas fa-compass text-muted-foreground text-lg"></i>
          </div>
        </div>
        
        {/* Building Information Panel */}
        {selectedBuilding && (
          <div className="mt-6 p-4 bg-muted rounded-md border border-border" data-testid="building-info">
            <h3 className="font-semibold text-foreground mb-2">{selectedBuilding.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div><strong>Type:</strong> {selectedBuilding.type}</div>
              <div><strong>Description:</strong> {selectedBuilding.description}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
