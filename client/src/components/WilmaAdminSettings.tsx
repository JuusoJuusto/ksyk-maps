import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  School, Mail, Server, Globe, Calendar, Clock, 
  Shield, Bell, Database, Settings, Save, Check,
  AlertCircle, Users, BookOpen, GraduationCap, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function WilmaAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Default settings
  const defaultSettings = {
    // School Information
    schoolName: "Kulosaaren yhteiskoulu",
    schoolCode: "KSYK",
    schoolAddress: "Kulosaarentie 20, 00570 Helsinki",
    schoolPhone: "+358 9 310 8220",
    schoolEmail: "ksyk@edu.hel.fi",
    schoolWebsite: "https://ksyk.fi",
    principalName: "",
    principalEmail: "",
    
    // SMTP Configuration
    smtpEnabled: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    smtpFromName: "Wilma - Kulosaaren yhteiskoulu",
    smtpFromEmail: "",
    
    // Academic Year Settings
    academicYearStart: "2024-08-01",
    academicYearEnd: "2025-05-31",
    currentPeriod: "1",
    periodsCount: "5",
    
    // Schedule Settings
    lessonDuration: "45",
    breakDuration: "15",
    lunchBreakDuration: "30",
    schoolStartTime: "08:00",
    schoolEndTime: "16:00",
    
    // Attendance Settings
    attendanceRequired: true,
    lateThresholdMinutes: "15",
    autoMarkAbsent: true,
    parentNotificationEnabled: true,
    
    // Homework Settings
    homeworkSubmissionEnabled: true,
    lateSubmissionAllowed: true,
    lateSubmissionPenalty: "10",
    maxFileSize: "10",
    allowedFileTypes: ".pdf,.doc,.docx,.txt,.jpg,.png",
    
    // Grading Settings
    gradingScale: "4-10",
    passingGrade: "5",
    showGradeStatistics: true,
    allowGradeComments: true,
    
    // Messaging Settings
    messagingEnabled: true,
    allowStudentToTeacher: true,
    allowStudentToStudent: false,
    allowParentToTeacher: true,
    maxMessageLength: "5000",
    
    // Notification Settings
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    notifyNewGrades: true,
    notifyNewHomework: true,
    notifyAbsence: true,
    notifyNewMessage: true,
    
    // Security Settings
    sessionTimeout: "60",
    passwordMinLength: "8",
    requirePasswordChange: false,
    passwordChangeInterval: "90",
    twoFactorEnabled: false,
    
    // System Settings
    maintenanceMode: false,
    maintenanceMessage: "",
    allowRegistration: false,
    requireEmailVerification: true,
    logRetentionDays: "90",
    
    // Desktop Settings
    desktopEnabled: false,
    desktopWallpaper: "/wilma-bg.jpg",
    desktopTheme: "light",
    
    // Appearance Settings
    primaryColor: "#003d82",
    secondaryColor: "#0052a3",
    accentColor: "#00aaff",
    logoUrl: "/kulosaaren_yhteiskoulu_logo.jpeg",
    faviconUrl: "/favicon.png",
    
    // Language Settings
    defaultLanguage: "fi",
    availableLanguages: "fi,en,sv",
    
    // Backup Settings
    autoBackupEnabled: false,
    backupFrequency: "daily",
    backupRetentionDays: "30",
    
    // Integration Settings
    googleCalendarEnabled: false,
    googleCalendarApiKey: "",
    microsoftTeamsEnabled: false,
    microsoftTeamsWebhook: "",
    
    // Privacy Settings
    allowDataExport: true,
    allowDataDeletion: true,
    cookieConsentRequired: true,
    analyticsEnabled: true,
    
    // Performance Settings
    cacheEnabled: true,
    cacheDuration: "3600",
    compressionEnabled: true,
    lazyLoadingEnabled: true,
  };

  const [settings, setSettings] = useState(defaultSettings);

  // Load settings from API
  const { data: loadedSettings, isLoading } = useQuery({
    queryKey: ['wilma-settings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/wilma/settings');
        if (!response.ok) {
          // Return default settings if API fails
          return defaultSettings;
        }
        return response.json();
      } catch (error) {
        console.error('Failed to load settings:', error);
        return defaultSettings;
      }
    },
    retry: false
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (loadedSettings) {
      setSettings({ ...defaultSettings, ...loadedSettings });
    }
  }, [loadedSettings]);

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async (settingsData: typeof settings) => {
      const response = await fetch('/api/wilma/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      if (!response.ok) throw new Error('Tallennus epäonnistui');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-settings'] });
      setSaved(true);
      toast({
        title: "Asetukset tallennettu",
        description: "Järjestelmän asetukset on päivitetty onnistuneesti tietokantaan.",
      });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (error) => {
      toast({
        title: "Virhe",
        description: "Asetusten tallennus epäonnistui. Yritä uudelleen.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    
    // Also save to localStorage as backup
    localStorage.setItem('wilma_app_settings', JSON.stringify(settings));
    
    // Save to database
    await saveSettings.mutateAsync(settings);
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Järjestelmän asetukset</h2>
          <p className="text-gray-600 mt-1">Hallitse Wilma-järjestelmän asetuksia</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || saved}
          className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Tallennettu
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? "Tallennetaan..." : "Tallenna asetukset"}
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="school" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-11 gap-1">
          <TabsTrigger value="personal">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Omat</span>
          </TabsTrigger>
          <TabsTrigger value="school">
            <School className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Koulu</span>
          </TabsTrigger>
          <TabsTrigger value="academic">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Lukuvuosi</span>
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Clock className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Lukujärjestys</span>
          </TabsTrigger>
          <TabsTrigger value="features">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Ominaisuudet</span>
          </TabsTrigger>
          <TabsTrigger value="desktop">
            <Database className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Työpöytä</span>
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Ulkoasu</span>
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Globe className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Integraatiot</span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Ilmoitukset</span>
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Tietosuoja</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Turvallisuus</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Settings Tab - NEW */}
        <TabsContent value="personal" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <User className="w-5 h-5" />
                Omat asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Profiili</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Etunimi</Label>
                    <Input
                      id="firstName"
                      placeholder="Etunimi"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Sukunimi</Label>
                    <Input
                      id="lastName"
                      placeholder="Sukunimi"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Sähköposti</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Puhelinnumero</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+358 40 123 4567"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Salasanan vaihto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentPassword">Nykyinen salasana</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="••••••••"
                      className="mt-1"
                    />
                  </div>
                  <div></div>
                  <div>
                    <Label htmlFor="newPassword">Uusi salasana</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Vahvista uusi salasana</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button className="bg-[#003d82] hover:bg-[#0052a3]">
                  <Save className="w-4 h-4 mr-2" />
                  Vaihda salasana
                </Button>
              </div>

              {/* Preferences Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asetukset</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Tumma tila</p>
                      <p className="text-sm text-gray-600">Käytä tummaa teemaa</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Sähköposti-ilmoitukset</p>
                      <p className="text-sm text-gray-600">Vastaanota ilmoituksia sähköpostitse</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Push-ilmoitukset</p>
                      <p className="text-sm text-gray-600">Vastaanota push-ilmoituksia</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Automaattinen kirjautuminen</p>
                      <p className="text-sm text-gray-600">Pysy kirjautuneena sisään</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              {/* Language Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Kieli</h3>
                <div>
                  <Label htmlFor="language">Käyttöliittymän kieli</Label>
                  <select
                    id="language"
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="fi">Suomi</option>
                    <option value="en">English</option>
                    <option value="sv">Svenska</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button className="bg-[#003d82] hover:bg-[#0052a3]">
                  <Save className="w-4 h-4 mr-2" />
                  Tallenna muutokset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* School Information Tab */}
        <TabsContent value="school" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <School className="w-5 h-5" />
                Koulun perustiedot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolName">Koulun nimi</Label>
                  <Input
                    id="schoolName"
                    value={settings.schoolName}
                    onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="schoolCode">Koulun tunnus</Label>
                  <Input
                    id="schoolCode"
                    value={settings.schoolCode}
                    onChange={(e) => setSettings({ ...settings, schoolCode: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="schoolAddress">Osoite</Label>
                <Input
                  id="schoolAddress"
                  value={settings.schoolAddress}
                  onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolPhone">Puhelinnumero</Label>
                  <Input
                    id="schoolPhone"
                    value={settings.schoolPhone}
                    onChange={(e) => setSettings({ ...settings, schoolPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="schoolEmail">Sähköposti</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={settings.schoolEmail}
                    onChange={(e) => setSettings({ ...settings, schoolEmail: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="schoolWebsite">Verkkosivusto</Label>
                <Input
                  id="schoolWebsite"
                  value={settings.schoolWebsite}
                  onChange={(e) => setSettings({ ...settings, schoolWebsite: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="principalName">Rehtorin nimi</Label>
                  <Input
                    id="principalName"
                    value={settings.principalName}
                    onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="principalEmail">Rehtorin sähköposti</Label>
                  <Input
                    id="principalEmail"
                    type="email"
                    value={settings.principalEmail}
                    onChange={(e) => setSettings({ ...settings, principalEmail: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Year Tab */}
        <TabsContent value="academic" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Calendar className="w-5 h-5" />
                Lukuvuoden asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academicYearStart">Lukuvuoden alku</Label>
                  <Input
                    id="academicYearStart"
                    type="date"
                    value={settings.academicYearStart}
                    onChange={(e) => setSettings({ ...settings, academicYearStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="academicYearEnd">Lukuvuoden loppu</Label>
                  <Input
                    id="academicYearEnd"
                    type="date"
                    value={settings.academicYearEnd}
                    onChange={(e) => setSettings({ ...settings, academicYearEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentPeriod">Nykyinen jakso</Label>
                  <select
                    id="currentPeriod"
                    value={settings.currentPeriod}
                    onChange={(e) => setSettings({ ...settings, currentPeriod: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="1">1. jakso</option>
                    <option value="2">2. jakso</option>
                    <option value="3">3. jakso</option>
                    <option value="4">4. jakso</option>
                    <option value="5">5. jakso</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="periodsCount">Jaksojen määrä</Label>
                  <Input
                    id="periodsCount"
                    type="number"
                    min="1"
                    max="6"
                    value={settings.periodsCount}
                    onChange={(e) => setSettings({ ...settings, periodsCount: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Settings Tab */}
        <TabsContent value="schedule" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Clock className="w-5 h-5" />
                Lukujärjestyksen asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lessonDuration">Oppitunnin pituus (min)</Label>
                  <Input
                    id="lessonDuration"
                    type="number"
                    value={settings.lessonDuration}
                    onChange={(e) => setSettings({ ...settings, lessonDuration: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="breakDuration">Välitunnin pituus (min)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    value={settings.breakDuration}
                    onChange={(e) => setSettings({ ...settings, breakDuration: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lunchBreakDuration">Ruokatunnin pituus (min)</Label>
                  <Input
                    id="lunchBreakDuration"
                    type="number"
                    value={settings.lunchBreakDuration}
                    onChange={(e) => setSettings({ ...settings, lunchBreakDuration: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolStartTime">Koulupäivän alku</Label>
                  <Input
                    id="schoolStartTime"
                    type="time"
                    value={settings.schoolStartTime}
                    onChange={(e) => setSettings({ ...settings, schoolStartTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="schoolEndTime">Koulupäivän loppu</Label>
                  <Input
                    id="schoolEndTime"
                    type="time"
                    value={settings.schoolEndTime}
                    onChange={(e) => setSettings({ ...settings, schoolEndTime: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Settings className="w-5 h-5" />
                Ominaisuuksien asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Attendance */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Tuntimerkinnät</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Tuntimerkinnät pakollisia</p>
                      <p className="text-sm text-gray-600">Opettajien on merkittävä läsnäolo</p>
                    </div>
                    <Switch
                      checked={settings.attendanceRequired}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, attendanceRequired: checked })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lateThreshold">Myöhästymisraja (min)</Label>
                      <Input
                        id="lateThreshold"
                        type="number"
                        value={settings.lateThresholdMinutes}
                        onChange={(e) => setSettings({ ...settings, lateThresholdMinutes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Homework */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Tehtävät</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Tehtävien palautus käytössä</p>
                      <p className="text-sm text-gray-600">Oppilaat voivat palauttaa tehtäviä</p>
                    </div>
                    <Switch
                      checked={settings.homeworkSubmissionEnabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, homeworkSubmissionEnabled: checked })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxFileSize">Maks. tiedostokoko (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        value={settings.maxFileSize}
                        onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Messaging */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Viestit</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Viestit käytössä</p>
                      <p className="text-sm text-gray-600">Käyttäjät voivat lähettää viestejä</p>
                    </div>
                    <Switch
                      checked={settings.messagingEnabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, messagingEnabled: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desktop Tab - NEW */}
        <TabsContent value="desktop" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Database className="w-5 h-5" />
                Työpöytäympäristö
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Työpöytäympäristö</p>
                    <p className="text-sm text-blue-700">
                      Työpöytäympäristö tarjoaa oppilaille Windows-tyylisen käyttöliittymän sovelluksilla kuten laskin, muistiinpanot ja musiikkisoittimet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Työpöytä käytössä</p>
                  <p className="text-sm text-gray-600">Ota työpöytäympäristö käyttöön kaikille käyttäjille</p>
                </div>
                <Switch
                  checked={settings.desktopEnabled || false}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, desktopEnabled: checked })
                  }
                />
              </div>

              {settings.desktopEnabled && (
                <div className="space-y-6 border-t pt-6">
                  {/* Wallpaper Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Taustakuva-asetukset</h3>
                    
                    <div>
                      <Label htmlFor="desktopWallpaper">Taustakuva (URL tai polku)</Label>
                      <Input
                        id="desktopWallpaper"
                        value={settings.desktopWallpaper || '/KSYK-logo-desktop.png'}
                        onChange={(e) => setSettings({ ...settings, desktopWallpaper: e.target.value })}
                        placeholder="/KSYK-logo-desktop.png"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Käytä KSYK-logoa: /KSYK-logo-desktop.png tai omaa kuvaa
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setSettings({ ...settings, desktopWallpaper: '/KSYK-logo-desktop.png' })}
                        className="p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-all"
                      >
                        <div className="aspect-video bg-black rounded flex items-center justify-center mb-2">
                          <span className="text-white text-xs">KSYK Logo</span>
                        </div>
                        <p className="text-xs text-center">Oletus</p>
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, desktopWallpaper: '/wilma-bg.jpg' })}
                        className="p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-all"
                      >
                        <div className="aspect-video bg-gradient-to-br from-blue-900 to-blue-700 rounded mb-2"></div>
                        <p className="text-xs text-center">Wilma</p>
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, desktopWallpaper: '' })}
                        className="p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-all"
                      >
                        <div className="aspect-video bg-black rounded mb-2"></div>
                        <p className="text-xs text-center">Musta</p>
                      </button>
                    </div>
                  </div>

                  {/* Theme Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Teema-asetukset</h3>
                    
                    <div>
                      <Label htmlFor="desktopTheme">Työpöydän teema</Label>
                      <select
                        id="desktopTheme"
                        value={settings.desktopTheme || 'dark'}
                        onChange={(e) => setSettings({ ...settings, desktopTheme: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                      >
                        <option value="dark">Tumma (suositeltu)</option>
                        <option value="light">Vaalea</option>
                        <option value="auto">Automaattinen</option>
                      </select>
                    </div>
                  </div>

                  {/* Window Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Ikkunoiden asetukset</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Läpinäkyvät ikkunat</p>
                          <p className="text-xs text-gray-600">Ikkunoiden taustat ovat hieman läpinäkyviä</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Animaatiot</p>
                          <p className="text-xs text-gray-600">Ikkunoiden avaus- ja sulkemisanimaatiot</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Varjot</p>
                          <p className="text-xs text-gray-600">Ikkunoiden varjostukset</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  {/* Performance Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Suorituskyky</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Korkea suorituskyky</p>
                          <p className="text-xs text-gray-600">Vähemmän visuaalisia efektejä, parempi suorituskyky</p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Rajoita avoimia ikkunoita</p>
                          <p className="text-xs text-gray-600">Maksimi 10 ikkunaa kerralla</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Manager Button */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Settings className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Työpöytä-hallinta</p>
                        <p className="text-sm text-gray-700">
                          Hallinnoi sovelluksia, lisää uusia sovelluksia, muokkaa olemassa olevia ja mukauta työpöytää täysin.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const storedUser = localStorage.getItem('wilma_user');
                        if (storedUser) {
                          try {
                            const user = JSON.parse(storedUser);
                            setLocation(`/wilma-admin/${user.id}/desktop-manager`);
                          } catch (e) {
                            toast({
                              title: "Virhe",
                              description: "Käyttäjätietoja ei löytynyt",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                      className="w-full bg-gradient-to-r from-[#003d82] to-[#0052a3] hover:from-[#0052a3] hover:to-[#003d82] text-white font-semibold"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Avaa Työpöytä-hallinta
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">25+</p>
                      <p className="text-xs text-blue-700">Sovellusta</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">6</p>
                      <p className="text-xs text-green-700">Toiminnallista</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">100%</p>
                      <p className="text-xs text-purple-700">Mukautettava</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab - NEW */}
        <TabsContent value="appearance" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Settings className="w-5 h-5" />
                Ulkoasun asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Pääväri</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor || '#003d82'}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primaryColor || '#003d82'}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      placeholder="#003d82"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Toissijainen väri</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor || '#0052a3'}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondaryColor || '#0052a3'}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      placeholder="#0052a3"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accentColor">Korostusväri</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor || '#00aaff'}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.accentColor || '#00aaff'}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      placeholder="#00aaff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl || '/kulosaaren_yhteiskoulu_logo.jpeg'}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="/kulosaaren_yhteiskoulu_logo.jpeg"
                  />
                </div>
                <div>
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={settings.faviconUrl || '/favicon.png'}
                    onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                    placeholder="/favicon.png"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="defaultLanguage">Oletuskieli</Label>
                <select
                  id="defaultLanguage"
                  value={settings.defaultLanguage || 'fi'}
                  onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="fi">Suomi</option>
                  <option value="en">English</option>
                  <option value="sv">Svenska</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab - NEW */}
        <TabsContent value="integrations" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Globe className="w-5 h-5" />
                Integraatiot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Google Calendar</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Google Calendar käytössä</p>
                      <p className="text-sm text-gray-600">Synkronoi tapahtumat Google Calendarin kanssa</p>
                    </div>
                    <Switch
                      checked={settings.googleCalendarEnabled || false}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, googleCalendarEnabled: checked })
                      }
                    />
                  </div>
                  {settings.googleCalendarEnabled && (
                    <div>
                      <Label htmlFor="googleCalendarApiKey">API-avain</Label>
                      <Input
                        id="googleCalendarApiKey"
                        type="password"
                        value={settings.googleCalendarApiKey || ''}
                        onChange={(e) => setSettings({ ...settings, googleCalendarApiKey: e.target.value })}
                        placeholder="Syötä Google Calendar API-avain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Microsoft Teams</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Microsoft Teams käytössä</p>
                      <p className="text-sm text-gray-600">Lähetä ilmoituksia Teams-kanavalle</p>
                    </div>
                    <Switch
                      checked={settings.microsoftTeamsEnabled || false}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, microsoftTeamsEnabled: checked })
                      }
                    />
                  </div>
                  {settings.microsoftTeamsEnabled && (
                    <div>
                      <Label htmlFor="microsoftTeamsWebhook">Webhook URL</Label>
                      <Input
                        id="microsoftTeamsWebhook"
                        type="url"
                        value={settings.microsoftTeamsWebhook || ''}
                        onChange={(e) => setSettings({ ...settings, microsoftTeamsWebhook: e.target.value })}
                        placeholder="https://outlook.office.com/webhook/..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab - NEW */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Bell className="w-5 h-5" />
                Ilmoitusasetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Sähköposti-ilmoitukset</p>
                    <p className="text-sm text-gray-600">Lähetä ilmoituksia sähköpostitse</p>
                  </div>
                  <Switch
                    checked={settings.emailNotificationsEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, emailNotificationsEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Push-ilmoitukset</p>
                    <p className="text-sm text-gray-600">Lähetä push-ilmoituksia selaimeen</p>
                  </div>
                  <Switch
                    checked={settings.pushNotificationsEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, pushNotificationsEnabled: checked })
                    }
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Ilmoitustyypit</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Uudet arvosanat</p>
                        <p className="text-sm text-gray-600">Ilmoita uusista arvosanoista</p>
                      </div>
                      <Switch
                        checked={settings.notifyNewGrades}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notifyNewGrades: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Uudet tehtävät</p>
                        <p className="text-sm text-gray-600">Ilmoita uusista tehtävistä</p>
                      </div>
                      <Switch
                        checked={settings.notifyNewHomework}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notifyNewHomework: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Poissaolot</p>
                        <p className="text-sm text-gray-600">Ilmoita poissaoloista</p>
                      </div>
                      <Switch
                        checked={settings.notifyAbsence}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notifyAbsence: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Uudet viestit</p>
                        <p className="text-sm text-gray-600">Ilmoita uusista viesteistä</p>
                      </div>
                      <Switch
                        checked={settings.notifyNewMessage}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notifyNewMessage: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab - NEW */}
        <TabsContent value="privacy" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Shield className="w-5 h-5" />
                Tietosuoja-asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Tietojen vienti sallittu</p>
                    <p className="text-sm text-gray-600">Käyttäjät voivat viedä omat tietonsa</p>
                  </div>
                  <Switch
                    checked={settings.allowDataExport || false}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, allowDataExport: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Tietojen poisto sallittu</p>
                    <p className="text-sm text-gray-600">Käyttäjät voivat poistaa omat tietonsa</p>
                  </div>
                  <Switch
                    checked={settings.allowDataDeletion || false}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, allowDataDeletion: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Evästeiden hyväksyntä vaaditaan</p>
                    <p className="text-sm text-gray-600">Näytä evästeiden hyväksyntäbanneri</p>
                  </div>
                  <Switch
                    checked={settings.cookieConsentRequired || false}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, cookieConsentRequired: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Analytiikka käytössä</p>
                    <p className="text-sm text-gray-600">Kerää käyttötilastoja</p>
                  </div>
                  <Switch
                    checked={settings.analyticsEnabled || false}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, analyticsEnabled: checked })
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Varmuuskopiointi</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Automaattinen varmuuskopiointi</p>
                      <p className="text-sm text-gray-600">Luo automaattisia varmuuskopioita</p>
                    </div>
                    <Switch
                      checked={settings.autoBackupEnabled || false}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, autoBackupEnabled: checked })
                      }
                    />
                  </div>

                  {settings.autoBackupEnabled && (
                    <>
                      <div>
                        <Label htmlFor="backupFrequency">Varmuuskopiointitiheys</Label>
                        <select
                          id="backupFrequency"
                          value={settings.backupFrequency || 'daily'}
                          onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="hourly">Tunneittain</option>
                          <option value="daily">Päivittäin</option>
                          <option value="weekly">Viikoittain</option>
                          <option value="monthly">Kuukausittain</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="backupRetentionDays">Varmuuskopioiden säilytysaika (päivää)</Label>
                        <Input
                          id="backupRetentionDays"
                          type="number"
                          value={settings.backupRetentionDays || '30'}
                          onChange={(e) => setSettings({ ...settings, backupRetentionDays: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Shield className="w-5 h-5" />
                Turvallisuusasetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Istunnon aikakatkaisu (min)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="passwordMinLength">Salasanan vähimmäispituus</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Kaksivaiheinen tunnistautuminen</p>
                  <p className="text-sm text-gray-600">Vaadi 2FA kaikilta käyttäjiltä</p>
                </div>
                <Switch
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, twoFactorEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Huoltotila</p>
                  <p className="text-sm text-gray-600">Estä käyttäjien kirjautuminen</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, maintenanceMode: checked })
                  }
                />
              </div>

              {settings.maintenanceMode && (
                <div>
                  <Label htmlFor="maintenanceMessage">Huoltoviesti</Label>
                  <Textarea
                    id="maintenanceMessage"
                    value={settings.maintenanceMessage}
                    onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                    placeholder="Järjestelmä on huollossa. Pahoittelemme häiriötä."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
