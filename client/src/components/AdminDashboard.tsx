import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { Staff, Building } from "@shared/schema";

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    retry: false,
  });

  // Sample activity data
  const recentActivity = [
    {
      id: '1',
      description: 'Room U34 booking added',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      description: 'Staff member updated: Music Department',
      timestamp: '4 hours ago'
    },
    {
      id: '3',
      description: 'Emergency procedures updated',
      timestamp: '1 day ago'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-primary rounded-lg">
                <i className="fas fa-users text-primary-foreground text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-foreground" data-testid="stat-students">1,151</p>
                <p className="text-muted-foreground">{t('admin.totalStudents')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-secondary rounded-lg">
                <i className="fas fa-chalkboard-teacher text-secondary-foreground text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-foreground" data-testid="stat-staff">{staff.length || 115}</p>
                <p className="text-muted-foreground">{t('admin.staffMembers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-accent rounded-lg">
                <i className="fas fa-building text-accent-foreground text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-foreground" data-testid="stat-buildings">{buildings.length || 6}</p>
                <p className="text-muted-foreground">{t('admin.buildings')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('admin.recentActivity')}</h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium text-foreground" data-testid={`activity-${activity.id}`}>
                    {activity.description}
                  </div>
                  <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Admin Tools */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('admin.adminTools')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="p-4 h-auto flex-col space-y-2 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="admin-edit-map"
              >
                <i className="fas fa-map text-xl"></i>
                <span className="text-sm font-medium">{t('admin.editMap')}</span>
              </Button>
              <Button 
                className="p-4 h-auto flex-col space-y-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                data-testid="admin-add-staff"
              >
                <i className="fas fa-user-plus text-xl"></i>
                <span className="text-sm font-medium">{t('admin.addStaff')}</span>
              </Button>
              <Button 
                className="p-4 h-auto flex-col space-y-2 bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="admin-announcements"
              >
                <i className="fas fa-bullhorn text-xl"></i>
                <span className="text-sm font-medium">{t('admin.announcements')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="p-4 h-auto flex-col space-y-2 hover:bg-primary hover:text-primary-foreground"
                data-testid="admin-settings"
              >
                <i className="fas fa-cog text-xl"></i>
                <span className="text-sm font-medium">{t('admin.settings')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
