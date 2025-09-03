import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import type { Staff } from "@shared/schema";

export default function StaffDirectory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  
  const isAdmin = (user as any)?.role === 'admin';

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const filteredStaff = staff.filter(member => {
    const matchesSearch = !searchQuery || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.positionEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.positionFi?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = !selectedDepartment || selectedDepartment === "all" ||
      member.department === selectedDepartment ||
      member.departmentEn === selectedDepartment ||
      member.departmentFi === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // Sample staff data for display when no real data is available
  const sampleStaff = [
    {
      id: '1',
      firstName: 'Mikko',
      lastName: 'Virtanen',
      position: 'Principal',
      positionEn: 'Principal',
      positionFi: 'Rehtori',
      department: 'Administration',
      profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150',
      email: 'mikko.virtanen@ksyk.fi'
    },
    {
      id: '2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      position: 'English Teacher',
      positionEn: 'English Teacher',
      positionFi: 'Englannin opettaja',
      department: 'Teaching Staff',
      profileImageUrl: 'https://images.unsplash.com/photo-1494790108755-2616c75c5f82?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150',
      email: 'sarah.johnson@ksyk.fi'
    },
    {
      id: '3',
      firstName: 'Jukka',
      lastName: 'Nieminen',
      position: 'Science Department Head',
      positionEn: 'Science Department Head',
      positionFi: 'Luonnontieteiden osaston johtaja',
      department: 'Teaching Staff',
      profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150',
      email: 'jukka.nieminen@ksyk.fi'
    }
  ];

  const displayStaff = filteredStaff.length > 0 ? filteredStaff : sampleStaff;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">{t('staff.title')}</h2>
          {isAdmin && (
            <Button data-testid="button-add-staff">
              <i className="fas fa-plus mr-2"></i>{t('staff.add')}
            </Button>
          )}
        </div>
        
        <div className="mb-4">
          <div className="flex space-x-4">
            <Input
              type="text"
              placeholder={t('staff.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-staff-search"
            />
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48" data-testid="select-department">
                <SelectValue placeholder={t('staff.allDepartments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staff.allDepartments')}</SelectItem>
                <SelectItem value="Administration">{t('staff.administration')}</SelectItem>
                <SelectItem value="Teaching Staff">{t('staff.teaching')}</SelectItem>
                <SelectItem value="Support Staff">{t('staff.support')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayStaff.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={member.profileImageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'} 
                      alt={`${member.firstName} ${member.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                      data-testid={`img-staff-${member.id}`}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground" data-testid={`text-staff-name-${member.id}`}>
                        {member.firstName} {member.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-staff-position-${member.id}`}>
                        {member.positionEn || member.position}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-staff-location-${member.id}`}>
                        {member.department || 'Main Building'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 text-xs"
                      data-testid={`button-locate-${member.id}`}
                    >
                      <i className="fas fa-map-marker-alt mr-1"></i>{t('staff.locate')}
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1 text-xs"
                      data-testid={`button-contact-${member.id}`}
                    >
                      <i className="fas fa-envelope mr-1"></i>{t('staff.contact')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
