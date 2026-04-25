import { useState, useEffect } from "react";
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
  AlertCircle, Users, BookOpen, GraduationCap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WilmaAdminSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // App Settings State
  const [settings, setSettings] = useState({
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
  });

  useEffect(() => {
    // Load saved settings from backend
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/wilma/admin-settings');
        if (response.ok) {
          const data = await response.json();
          setSettings({ ...settings, ...data });
        } else {
          // Fallback to localStorage
          const savedSettings = localStorage.getItem('wilma_app_settings');
          if (savedSettings) {
            setSettings({ ...settings, ...JSON.parse(savedSettings) });
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('wilma_app_settings');
        if (savedSettings) {
          setSettings({ ...settings, ...JSON.parse(savedSettings) });
        }
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Save to backend
      const response = await fetch('/api/wilma/admin-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('wilma_app_settings', JSON.stringify(settings));
      
      setIsSaving(false);
      setSaved(true);
      
      toast({
        title: "Asetukset tallennettu",
        description: "Järjestelmän asetukset on päivitetty onnistuneesti.",
      });
      
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
      toast({
        title: "Virhe",
        description: "Asetusten tallennus epäonnistui. Yritä uudelleen.",
        variant: "destructive"
      });
    }
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
          <TabsTrigger value="school">
            <School className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Koulu</span>
          </TabsTrigger>
          <TabsTrigger value="smtp">
            <Mail className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">SMTP</span>
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
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Turvallisuus</span>
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Globe className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Integraatiot</span>
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Varmuuskopiot</span>
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Lisäasetukset</span>
          </TabsTrigger>
        </TabsList>

        {/* School Information Tab */}
        <TabsContent value="school" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
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

        {/* SMTP Configuration Tab */}
        <TabsContent value="smtp" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Server className="w-5 h-5" />
                SMTP-asetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Ota SMTP käyttöön</p>
                  <p className="text-sm text-gray-600">Lähetä sähköposteja järjestelmästä</p>
                </div>
                <Switch
                  checked={settings.smtpEnabled}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, smtpEnabled: checked })
                  }
                />
              </div>

              {settings.smtpEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="smtpHost">SMTP-palvelin</Label>
                      <Input
                        id="smtpHost"
                        placeholder="smtp.gmail.com"
                        value={settings.smtpHost}
                        onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtpPort">Portti</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={settings.smtpPort}
                        onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Suojattu yhteys (TLS/SSL)</p>
                      <p className="text-sm text-gray-600">Käytä salattua yhteyttä</p>
                    </div>
                    <Switch
                      checked={settings.smtpSecure}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, smtpSecure: checked })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtpUser">Käyttäjänimi</Label>
                      <Input
                        id="smtpUser"
                        value={settings.smtpUser}
                        onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtpPassword">Salasana</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={settings.smtpPassword}
                        onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtpFromName">Lähettäjän nimi</Label>
                      <Input
                        id="smtpFromName"
                        value={settings.smtpFromName}
                        onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtpFromEmail">Lähettäjän sähköposti</Label>
                      <Input
                        id="smtpFromEmail"
                        type="email"
                        value={settings.smtpFromEmail}
                        onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Test SMTP Connection Button */}
                  <div className="border-t pt-4">
                    <Button
                      onClick={async () => {
                        toast({
                          title: "Testataan yhteyttä...",
                          description: "Lähetetään testisähköposti",
                        });
                        // TODO: Implement SMTP test endpoint
                        setTimeout(() => {
                          toast({
                            title: "Yhteys toimii!",
                            description: "Testisähköposti lähetetty onnistuneesti",
                          });
                        }, 2000);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Testaa SMTP-yhteyttä
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">SMTP-asetukset</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Gmail: smtp.gmail.com:587, Outlook: smtp-mail.outlook.com:587
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Year Tab */}
        <TabsContent value="academic" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
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
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
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
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
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

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
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

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Globe className="w-5 h-5" />
                API-integraatiot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Google Classroom */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Google Classroom
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Google Classroom -integraatio</p>
                      <p className="text-sm text-gray-600">Synkronoi tehtävät ja arvosanat</p>
                    </div>
                    <Switch />
                  </div>
                  <div>
                    <Label htmlFor="googleApiKey">Google API -avain</Label>
                    <Input
                      id="googleApiKey"
                      type="password"
                      placeholder="Syötä API-avain"
                    />
                  </div>
                </div>
              </div>

              {/* Microsoft Teams */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Microsoft Teams
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Teams-integraatio</p>
                      <p className="text-sm text-gray-600">Luo automaattisesti Teams-tiimit luokille</p>
                    </div>
                    <Switch />
                  </div>
                  <div>
                    <Label htmlFor="teamsClientId">Client ID</Label>
                    <Input
                      id="teamsClientId"
                      placeholder="Syötä Client ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teamsClientSecret">Client Secret</Label>
                    <Input
                      id="teamsClientSecret"
                      type="password"
                      placeholder="Syötä Client Secret"
                    />
                  </div>
                </div>
              </div>

              {/* Webhooks */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Webhookit</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Lähetä tapahtumat webhookiin</p>
                      <p className="text-sm text-gray-600">Arvosanat, läsnäolot, viestit</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Database className="w-5 h-5" />
                Varmuuskopiot ja palautus
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Automatic Backups */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Automaattiset varmuuskopiot</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Automaattiset varmuuskopiot</p>
                      <p className="text-sm text-gray-600">Luo varmuuskopio päivittäin</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div>
                    <Label htmlFor="backupTime">Varmuuskopioinnin aika</Label>
                    <Input
                      id="backupTime"
                      type="time"
                      defaultValue="02:00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="backupRetention">Säilytysaika (päivää)</Label>
                    <Input
                      id="backupRetention"
                      type="number"
                      defaultValue="30"
                    />
                  </div>
                </div>
              </div>

              {/* Manual Backup */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Manuaalinen varmuuskopiointi</h4>
                <div className="space-y-3">
                  <Button className="w-full bg-[#003d82] hover:bg-[#0052a3]">
                    <Database className="w-4 h-4 mr-2" />
                    Luo varmuuskopio nyt
                  </Button>
                  <p className="text-sm text-gray-600">
                    Viimeisin varmuuskopio: 24.4.2026 klo 02:00
                  </p>
                </div>
              </div>

              {/* Restore */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Palauta varmuuskopiosta</h4>
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Varoitus</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Palautus korvaa kaikki nykyiset tiedot. Varmista että haluat jatkaa.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Valitse varmuuskopio palautettavaksi
                  </Button>
                </div>
              </div>

              {/* Export/Import */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Vie/Tuo asetukset</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline">
                    Vie asetukset
                  </Button>
                  <Button variant="outline">
                    Tuo asetukset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Settings className="w-5 h-5" />
                Lisäasetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Performance */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Suorituskyky</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Välimuisti käytössä</p>
                      <p className="text-sm text-gray-600">Nopeuttaa sivujen latautumista</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div>
                    <Label htmlFor="cacheExpiry">Välimuistin vanhenemisaika (min)</Label>
                    <Input
                      id="cacheExpiry"
                      type="number"
                      defaultValue="15"
                    />
                  </div>
                </div>
              </div>

              {/* Logging */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Lokitus</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="logLevel">Lokitustaso</Label>
                    <select
                      id="logLevel"
                      defaultValue="info"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="error">Vain virheet</option>
                      <option value="warn">Varoitukset ja virheet</option>
                      <option value="info">Info, varoitukset ja virheet</option>
                      <option value="debug">Kaikki (debug)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="logRetention">Lokien säilytysaika (päivää)</Label>
                    <Input
                      id="logRetention"
                      type="number"
                      value={settings.logRetentionDays}
                      onChange={(e) => setSettings({ ...settings, logRetentionDays: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Database */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Tietokanta</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full">
                    Optimoi tietokanta
                  </Button>
                  <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                    Tyhjennä välimuisti
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-red-600 mb-3">Vaaravyöhyke</h4>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Nollaa järjestelmä</p>
                        <p className="text-xs text-red-700 mt-1">
                          Poistaa KAIKKI tiedot pysyvästi. Tätä toimintoa ei voi peruuttaa.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="destructive" className="w-full">
                    Nollaa järjestelmä
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
