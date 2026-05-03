import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Bell, Eye, Lock, Globe, Download, 
  Upload, Save, Camera, Mail, Phone, MapPin
} from "lucide-react";

interface PersonalSettingsProps {
  userId: string;
  userRole: string;
}

export default function WilmaAdminPersonalSettings({ userId, userRole }: PersonalSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch current user settings
  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['user-settings', userId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/users/${userId}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    },
    enabled: !!userId,
  });

  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: userSettings?.firstName || '',
    lastName: userSettings?.lastName || '',
    email: userSettings?.email || '',
    phone: userSettings?.phone || '',
    bio: userSettings?.bio || '',
    profilePicture: userSettings?.profilePicture || '',
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: userSettings?.emailNotifications ?? true,
    pushNotifications: userSettings?.pushNotifications ?? true,
    newMessages: userSettings?.newMessages ?? true,
    newGrades: userSettings?.newGrades ?? true,
    newAssignments: userSettings?.newAssignments ?? true,
    absenceReports: userSettings?.absenceReports ?? true,
    systemUpdates: userSettings?.systemUpdates ?? true,
  });

  // Display settings
  const [displaySettings, setDisplaySettings] = useState({
    language: userSettings?.language || 'fi',
    theme: userSettings?.theme || 'light',
    dateFormat: userSettings?.dateFormat || 'DD.MM.YYYY',
    timeFormat: userSettings?.timeFormat || '24h',
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: userSettings?.profileVisibility || 'school',
    showEmail: userSettings?.showEmail ?? false,
    showPhone: userSettings?.showPhone ?? false,
    allowMessages: userSettings?.allowMessages ?? true,
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/wilma/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', userId] });
      toast({
        title: "✅ Tallennettu",
        description: "Asetukset päivitetty onnistuneesti",
      });
    },
    onError: () => {
      toast({
        title: "❌ Virhe",
        description: "Asetusten päivitys epäonnistui",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/wilma/users/${userId}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to change password');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Salasana vaihdettu",
        description: "Salasanasi on päivitetty onnistuneesti",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: () => {
      toast({
        title: "❌ Virhe",
        description: "Salasanan vaihto epäonnistui",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateSettingsMutation.mutate({ ...profileData, type: 'profile' });
  };

  const handleSaveNotifications = () => {
    updateSettingsMutation.mutate({ ...notificationSettings, type: 'notifications' });
  };

  const handleSaveDisplay = () => {
    updateSettingsMutation.mutate({ ...displaySettings, type: 'display' });
  };

  const handleSavePrivacy = () => {
    updateSettingsMutation.mutate({ ...privacySettings, type: 'privacy' });
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "❌ Virhe",
        description: "Salasanat eivät täsmää",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "❌ Virhe",
        description: "Salasanan on oltava vähintään 6 merkkiä",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate(passwordData);
  };

  const handleExportData = () => {
    toast({
      title: "📥 Viedään tietoja",
      description: "Tietojesi vienti aloitettu...",
    });
    // TODO: Implement data export
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan asetuksia...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200">
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Henkilökohtaiset asetukset
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profiili
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Ilmoitukset
              </TabsTrigger>
              <TabsTrigger value="display">
                <Globe className="w-4 h-4 mr-2" />
                Näyttö
              </TabsTrigger>
              <TabsTrigger value="privacy">
                <Eye className="w-4 h-4 mr-2" />
                Yksityisyys
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="w-4 h-4 mr-2" />
                Turvallisuus
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {profileData.firstName[0]}{profileData.lastName[0]}
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    <Camera className="w-4 h-4 mr-2" />
                    Vaihda kuva
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG tai GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Etunimi</Label>
                  <Input
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Sukunimi</Label>
                  <Input
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Sähköposti
                </Label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Puhelinnumero
                </Label>
                <Input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+358 40 123 4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Esittely</Label>
                <Textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Kerro itsestäsi..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Tallenna profiili
              </Button>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Sähköposti-ilmoitukset</p>
                    <p className="text-sm text-gray-600">Vastaanota ilmoituksia sähköpostitse</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Push-ilmoitukset</p>
                    <p className="text-sm text-gray-600">Vastaanota ilmoituksia selaimessa</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, pushNotifications: checked })}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Ilmoitustyypit</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Uudet viestit</Label>
                      <Switch
                        checked={notificationSettings.newMessages}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, newMessages: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Uudet arvosanat</Label>
                      <Switch
                        checked={notificationSettings.newGrades}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, newGrades: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Uudet tehtävät</Label>
                      <Switch
                        checked={notificationSettings.newAssignments}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, newAssignments: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Poissaoloilmoitukset</Label>
                      <Switch
                        checked={notificationSettings.absenceReports}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, absenceReports: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Järjestelmäpäivitykset</Label>
                      <Switch
                        checked={notificationSettings.systemUpdates}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, systemUpdates: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveNotifications} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Tallenna ilmoitusasetukset
              </Button>
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value="display" className="space-y-4">
              <div>
                <Label>Kieli</Label>
                <Select value={displaySettings.language} onValueChange={(value) => setDisplaySettings({ ...displaySettings, language: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fi">Suomi</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sv">Svenska</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Teema</Label>
                <Select value={displaySettings.theme} onValueChange={(value) => setDisplaySettings({ ...displaySettings, theme: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Vaalea</SelectItem>
                    <SelectItem value="dark">Tumma</SelectItem>
                    <SelectItem value="auto">Automaattinen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Päivämäärämuoto</Label>
                <Select value={displaySettings.dateFormat} onValueChange={(value) => setDisplaySettings({ ...displaySettings, dateFormat: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aikamuoto</Label>
                <Select value={displaySettings.timeFormat} onValueChange={(value) => setDisplaySettings({ ...displaySettings, timeFormat: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24-tuntinen (14:30)</SelectItem>
                    <SelectItem value="12h">12-tuntinen (2:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveDisplay} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Tallenna näyttöasetukset
              </Button>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-4">
              <div>
                <Label>Profiilin näkyvyys</Label>
                <Select value={privacySettings.profileVisibility} onValueChange={(value) => setPrivacySettings({ ...privacySettings, profileVisibility: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Julkinen</SelectItem>
                    <SelectItem value="school">Vain koulu</SelectItem>
                    <SelectItem value="private">Yksityinen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Näytä sähköpostiosoite</Label>
                  <Switch
                    checked={privacySettings.showEmail}
                    onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, showEmail: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Näytä puhelinnumero</Label>
                  <Switch
                    checked={privacySettings.showPhone}
                    onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, showPhone: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Salli viestit muilta käyttäjiltä</Label>
                  <Switch
                    checked={privacySettings.allowMessages}
                    onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, allowMessages: checked })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Tietojen hallinta</h3>
                <div className="space-y-2">
                  <Button onClick={handleExportData} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Vie tietoni
                  </Button>
                  <p className="text-xs text-gray-500">Lataa kaikki henkilötietosi JSON-muodossa</p>
                </div>
              </div>

              <Button onClick={handleSavePrivacy} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Tallenna yksityisyysasetukset
              </Button>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Huom!</strong> Salasanan vaihdon jälkeen sinun täytyy kirjautua uudelleen sisään.
                </p>
              </div>

              <div>
                <Label>Nykyinen salasana</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Uusi salasana</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Vähintään 6 merkkiä</p>
              </div>

              <div>
                <Label>Vahvista uusi salasana</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                <Lock className="w-4 h-4 mr-2" />
                Vaihda salasana
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
