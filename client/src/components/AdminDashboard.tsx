import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import RoomManagement from "@/components/RoomManagement";
import type { Staff, Building, Room } from "@shared/schema";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    retry: false,
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="rooms">Room Management</TabsTrigger>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">{/* Dashboard Content */}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-destructive rounded-lg">
                  <i className="fas fa-door-open text-destructive-foreground text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-rooms">{rooms.length || 0}</p>
                  <p className="text-muted-foreground">Rooms & Facilities</p>
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
                  onClick={() => setActiveTab("rooms")}
                  data-testid="admin-manage-rooms"
                >
                  <i className="fas fa-door-open text-xl"></i>
                  <span className="text-sm font-medium">Manage Rooms</span>
                </Button>
                <Button 
                  className="p-4 h-auto flex-col space-y-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => setActiveTab("staff")}
                  data-testid="admin-manage-staff"
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
                  className="p-4 h-auto flex-col space-y-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setActiveTab("buildings")}
                  data-testid="admin-manage-buildings"
                >
                  <i className="fas fa-building text-xl"></i>
                  <span className="text-sm font-medium">Manage Buildings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </TabsContent>
        
        <TabsContent value="rooms">
          <RoomManagement />
        </TabsContent>
        
        <TabsContent value="buildings">
          <div className="p-6 text-center">
            <i className="fas fa-building text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold mb-2">Building Management</h3>
            <p className="text-muted-foreground">Building management features coming soon.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="staff">
          <div className="p-6 text-center">
            <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold mb-2">Staff Management</h3>
            <p className="text-muted-foreground">Staff management features coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
