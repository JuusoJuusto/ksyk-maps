import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, User, Bell, Lock, Palette, Globe, 
  Save, Eye, EyeOff, Mail, Phone, MapPin, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

interface WilmaSettingsTabProps {
  userRole: 'student' | 'teacher' | 'parent';
}

export default function WilmaSettingsTab({ userRole }: WilmaSettingsTabProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Profile settings
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [gradeNotifications, setGradeNotifications] = useState(true);
  const [homeworkNotifications, setHomeworkNotifications] = useState(true);
  const [attendanceNotifications, setAttendanceNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState("school");
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Appearance settings - removed local darkMode state, using theme context
  const [compactView, setCompactView] = useState(false);
  const [fontSize, setFontSize] = useState("medium");

  // Language settings
  const [language, setLanguage] = useState("fi");

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setEmail(user.email || "");
      
      // Load saved settings from backend first, then fallback to localStorage
      const loadSettings = async () => {
        try {
          const response = await fetch(`/api/wilma/user-settings/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.settings) {
              const settings = data.settings;
              setPhone(settings.phone || "");
              setAddress(settings.address || "");
              setEmergencyContact(settings.emergencyContact || "");
              setEmergencyPhone(settings.emergencyPhone || "");
              setEmailNotifications(settings.emailNotifications ?? true);
              setPushNotifications(settings.pushNotifications ?? true);
              setGradeNotifications(settings.gradeNotifications ?? true);
              setHomeworkNotifications(settings.homeworkNotifications ?? true);
              setAttendanceNotifications(settings.attendanceNotifications ?? true);
              setMessageNotifications(settings.messageNotifications ?? true);
              setProfileVisibility(settings.profileVisibility || "school");
              setShowEmail(settings.showEmail ?? false);
              setShowPhone(settings.showPhone ?? false);
              setCompactView(settings.compactView ?? false);
              setFontSize(settings.fontSize || "medium");
              setLanguage(settings.language || "fi");
              
              // Apply font size and compact view
              applyAppearanceSettings(settings.fontSize || "medium", settings.compactView ?? false);
              return;
            }
          }
        } catch (error) {
          console.log('Failed to load settings from backend, using localStorage');
        }

        // Fallback to localStorage
        const savedSettings = localStorage.getItem(`wilma_settings_${user.id}`);
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setPhone(settings.phone || "");
          setAddress(settings.address || "");
          setEmergencyContact(settings.emergencyContact || "");
          setEmergencyPhone(settings.emergencyPhone || "");
          setEmailNotifications(settings.emailNotifications ?? true);
          setPushNotifications(settings.pushNotifications ?? true);
          setGradeNotifications(settings.gradeNotifications ?? true);
          setHomeworkNotifications(settings.homeworkNotifications ?? true);
          setAttendanceNotifications(settings.attendanceNotifications ?? true);
          setMessageNotifications(settings.messageNotifications ?? true);
          setProfileVisibility(settings.profileVisibility || "school");
          setShowEmail(settings.showEmail ?? false);
          setShowPhone(settings.showPhone ?? false);
          setCompactView(settings.compactView ?? false);
          setFontSize(settings.fontSize || "medium");
          setLanguage(settings.language || "fi");
          
          // Apply font size and compact view
          applyAppearanceSettings(settings.fontSize || "medium", settings.compactView ?? false);
        }
      };

      loadSettings();
    }
  }, []);

  // Apply appearance settings to document
  const applyAppearanceSettings = (fontSize: string, compactView: boolean) => {
    // Apply font size
    const root = document.documentElement;
    switch (fontSize) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      default:
        root.style.fontSize = '16px';
    }

    // Apply compact view
    if (compactView) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }
  };

  const saveSettings = async () => {
    if (!currentUser) return;

    const settings = {
      phone,
      address,
      emergencyContact,
      emergencyPhone,
      emailNotifications,
      pushNotifications,
      gradeNotifications,
      homeworkNotifications,
      attendanceNotifications,
      messageNotifications,
      profileVisibility,
      showEmail,
      showPhone,
      compactView,
      fontSize,
      language
    };

    // Save to localStorage
    localStorage.setItem(`wilma_settings_${currentUser.id}`, JSON.stringify(settings));

    // Apply appearance settings immediately
    applyAppearanceSettings(fontSize, compactView);

    // Save to backend (if available)
    try {
      const response = await fetch('/api/wilma/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          settings
        })
      });

      if (response.ok) {
        toast({
          title: "Asetukset tallennettu",
          description: "Asetuksesi on päivitetty onnistuneesti palvelimelle.",
        });
      } else {
        throw new Error('Failed to save to server');
      }
    } catch (error) {
      // Fallback to localStorage only
      toast({
        title: "Asetukset tallennettu paikallisesti",
        description: "Asetuksesi on tallennettu laitteellesi.",
      });
    }

    // Apply language change if needed
    if (language !== 'fi') {
      toast({
        title: "Kieli vaihdettu",
        description: "Lataa sivu uudelleen ottaaksesi kieliasetukset käyttöön.",
      });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-[#dddddd]">
        <CardHeader className="bg-gradient-to-r from-[#e6f2ff] to-[#f0f8ff] border-b border-[#dddddd]">
          <CardTitle className="flex items-center gap-2 text-[#003d82]">
            <Settings className="w-6 h-6" />
            Asetukset
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profiili</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Ilmoitukset</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Yksityisyys</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Ulkoasu</span>
              </TabsTrigger>
              <TabsTrigger value="language" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Kieli</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="space-y-4">
                {/* Profile Picture Upload */}
                <ProfilePictureUpload currentUser={currentUser} />

                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#003d82] to-[#0052a3] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {currentUser.firstName[0]}{currentUser.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {currentUser.firstName} {currentUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {userRole === 'student' && `Opiskelija • ${currentUser.studentClass || 'Ei luokkaa'}`}
                      {userRole === 'teacher' && `Opettaja • ${currentUser.department || 'Ei osastoa'}`}
                      {userRole === 'parent' && 'Huoltaja'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Sähköposti
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="etunimi.sukunimi@ksyk.fi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Puhelinnumero
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+358 40 123 4567"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Osoite
                    </Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Kaupunki, Postinumero"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency-contact">Hätäyhteyshenkilö</Label>
                    <Input
                      id="emergency-contact"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="Nimi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency-phone">Hätäpuhelin</Label>
                    <Input
                      id="emergency-phone"
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Sähköposti-ilmoitukset</Label>
                    <p className="text-sm text-gray-600">Vastaanota ilmoituksia sähköpostitse</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Push-ilmoitukset</Label>
                    <p className="text-sm text-gray-600">Vastaanota push-ilmoituksia</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-4 text-gray-900">Ilmoitustyypit</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Arvosanat</Label>
                      <Switch
                        checked={gradeNotifications}
                        onCheckedChange={setGradeNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Tehtävät</Label>
                      <Switch
                        checked={homeworkNotifications}
                        onCheckedChange={setHomeworkNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Poissaolot</Label>
                      <Switch
                        checked={attendanceNotifications}
                        onCheckedChange={setAttendanceNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Viestit</Label>
                      <Switch
                        checked={messageNotifications}
                        onCheckedChange={setMessageNotifications}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900">Yksityisyysasetukset</h4>
                      <p className="text-sm text-yellow-800 mt-1">
                        Hallitse kuka voi nähdä profiilitietosi
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Profiilin näkyvyys</Label>
                  <select
                    id="visibility"
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="private">Yksityinen (vain minä)</option>
                    <option value="school">Koulu (opettajat ja oppilaat)</option>
                    <option value="class">Luokka (vain luokkatoverit)</option>
                  </select>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Näytä sähköposti muille</Label>
                    <Switch
                      checked={showEmail}
                      onCheckedChange={setShowEmail}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Näytä puhelinnumero muille</Label>
                    <Switch
                      checked={showPhone}
                      onCheckedChange={setShowPhone}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Tumma tila</Label>
                    <p className="text-sm text-gray-600">Käytä tummaa teemaa</p>
                  </div>
                  <Switch
                    checked={theme === 'dark' || theme === 'neon'}
                    onCheckedChange={(checked) => {
                      setTheme(checked ? 'dark' : 'light');
                      toast({
                        title: checked ? "Tumma tila käytössä" : "Vaalea tila käytössä",
                        description: "Teema vaihdettu onnistuneesti.",
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Kompakti näkymä</Label>
                    <p className="text-sm text-gray-600">Näytä enemmän sisältöä kerralla</p>
                  </div>
                  <Switch
                    checked={compactView}
                    onCheckedChange={setCompactView}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-size">Fonttikoko</Label>
                  <select
                    id="font-size"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="small">Pieni</option>
                    <option value="medium">Keskikokoinen</option>
                    <option value="large">Suuri</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-mode">Teematila</Label>
                  <select
                    id="theme-mode"
                    value={theme}
                    onChange={(e) => {
                      setTheme(e.target.value as 'light' | 'dark' | 'neon' | 'system');
                      toast({
                        title: "Teema vaihdettu",
                        description: `${e.target.value === 'light' ? 'Vaalea' : e.target.value === 'dark' ? 'Tumma' : e.target.value === 'neon' ? 'Neon' : 'Järjestelmä'} teema käytössä.`,
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="light">Vaalea</option>
                    <option value="dark">Tumma</option>
                    <option value="system">Järjestelmän mukaan</option>
                    {theme === 'neon' && <option value="neon">Neon (Erikoistila)</option>}
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* Language Tab */}
            <TabsContent value="language" className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">Kieliasetukset</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        Valitse käyttöliittymän kieli
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Kieli</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="fi">Suomi</option>
                    <option value="en">English</option>
                    <option value="sv">Svenska</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Huom:</strong> Kieliasetuksen muuttaminen vaatii sivun uudelleenlatauksen.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button
              onClick={saveSettings}
              className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-2" />
              Tallenna asetukset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
