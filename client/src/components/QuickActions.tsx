import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { Announcement } from "@shared/schema";

export default function QuickActions() {
  const { t } = useTranslation();

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    retry: false,
  });

  // Sample announcements for display
  const sampleAnnouncements = [
    {
      id: '1',
      title: 'Construction Update',
      titleEn: 'Construction Update',
      content: 'U-wing access route updated due to ongoing construction work.',
      priority: 'normal'
    },
    {
      id: '2',
      title: 'Library Event',
      titleEn: 'Library Event',
      content: 'Author visit scheduled for next week in the library.',
      priority: 'normal'
    }
  ];

  const displayAnnouncements = announcements.length > 0 ? announcements : sampleAnnouncements;

  return (
    <>
      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('actions.title')}</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start p-3"
              data-testid="button-directions"
            >
              <i className="fas fa-route mr-3 text-lg"></i>
              <span className="font-medium">{t('actions.directions')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start p-3"
              data-testid="button-find-staff"
            >
              <i className="fas fa-users mr-3 text-lg"></i>
              <span className="font-medium">{t('actions.findStaff')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start p-3"
              data-testid="button-events"
            >
              <i className="fas fa-calendar-alt mr-3 text-lg"></i>
              <span className="font-medium">{t('actions.events')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start p-3"
              data-testid="button-emergency"
            >
              <i className="fas fa-exclamation-triangle mr-3 text-lg"></i>
              <span className="font-medium">{t('actions.emergency')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Current Status */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('status.title')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('status.buildingHours')}</span>
              <span className="text-sm font-medium text-accent" data-testid="status-building-hours">{t('status.open')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('status.library')}</span>
              <span className="text-sm font-medium text-accent" data-testid="status-library">{t('status.openUntil')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('status.cafeteria')}</span>
              <span className="text-sm font-medium text-destructive" data-testid="status-cafeteria">{t('status.closed')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('status.itSupport')}</span>
              <span className="text-sm font-medium text-accent" data-testid="status-it-support">{t('status.available')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Announcements */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('announcements.title')}</h3>
          <div className="space-y-3">
            {displayAnnouncements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium text-foreground" data-testid={`announcement-title-${announcement.id}`}>
                  {announcement.titleEn || announcement.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1" data-testid={`announcement-content-${announcement.id}`}>
                  {announcement.content}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
