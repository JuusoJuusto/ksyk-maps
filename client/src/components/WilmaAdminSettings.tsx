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
    smtpEnabled: false,
    smtpHost: "",
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
    // Load saved settings
    const savedSettings = localStorage.getItem('wilma_app_settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Save to localStorage (in production, save to database)
    localStorage.setItem('wilma_app_settings', JSON.stringify(settings));
    
    setIsSaving(false);
    setSaved(true);
    
    toast({
      title: "Asetukset tallennettu",
      description: "Järjestelmän asetukset on päivitetty onnistuneesti.",
    });
    
    setTimeout(() => setSaved(false), 3000);
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
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
      </Tabs>
    </div>
  );
}
