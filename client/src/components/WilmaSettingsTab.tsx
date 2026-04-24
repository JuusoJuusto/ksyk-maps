import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Lock, Bell, Globe, Palette, Shield, 
  Mail, Phone, MapPin, Calendar, Save, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WilmaSettingsTab() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // Profile
    email: "",
    phone: "",
    address: "",
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    gradeNotifications: true,
    attendanceNotifications: true,
    
    // Privacy
    showProfile: true,
    showEmail: false,
    showPhone: false,
    
    // Preferences
    language: "fi",
    theme: "light",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24h",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      
      // Load saved settings
      const savedSettings = localStorage.getItem(`wilma_settings_${user.id}`);
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Save to localStorage
    if (currentUser) {
      localStorage.setItem(`wilma_settings_${currentUser.id}`, JSON.stringify(settings));
    }
    
    setIsSaving(false);
    setSaved(true);
    
    toast({
      title: "Asetukset tallennettu",
      description: "Muutokset on tallennettu onnistuneesti.",
    });
    
    setTimeout(() => setSaved(false), 3000);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Asetukset</h2>
          <p className="text-gray-600 mt-1">Hallitse profiiliasi ja asetuksiasi</p>
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
              {isSaving ? "Tallennetaan..." : "Tallenna muutokset"}
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profiili</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Ilmoitukset</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Yksityisyys</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Mieltymykset</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <User className="w-5 h-5" />
                Perustiedot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Etunimi</Label>
                  <Input value={currentUser.firstName} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>Sukunimi</Label>
                  <Input value={currentUser.lastName} disabled className="bg-gray-50" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Sähköposti</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="nimi@esimerkki.fi"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Puhelinnumero</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="+358 40 123 4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Osoite</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    placeholder="Katuosoite, Kaupunki"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Lock className="w-5 h-5" />
                Salasana
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Salasanan vaihtaminen tapahtuu järjestelmänvalvojan kautta.
              </p>
              <Button variant="outline" className="border-[#003d82] text-[#003d82]">
                Pyydä salasanan vaihtoa
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Bell className="w-5 h-5" />
                Ilmoitusasetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Sähköposti-ilmoitukset</p>
                  <p className="text-sm text-gray-600">Vastaanota ilmoituksia sähköpostitse</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Push-ilmoitukset</p>
                  <p className="text-sm text-gray-600">Vastaanota push-ilmoituksia</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, pushNotifications: checked })
                  }
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-gray-900">Ilmoitustyypit</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Viestit</p>
                    <p className="text-sm text-gray-600">Uudet viestit ja vastaukset</p>
                  </div>
                  <Switch
                    checked={settings.messageNotifications}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, messageNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Arvosanat</p>
                    <p className="text-sm text-gray-600">Uudet arvosanat ja palautteet</p>
                  </div>
                  <Switch
                    checked={settings.gradeNotifications}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, gradeNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Poissaolot</p>
                    <p className="text-sm text-gray-600">Poissaolomerkinnät ja muutokset</p>
                  </div>
                  <Switch
                    checked={settings.attendanceNotifications}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, attendanceNotifications: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Shield className="w-5 h-5" />
                Yksityisyysasetukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Näytä profiili</p>
                  <p className="text-sm text-gray-600">Muut käyttäjät voivat nähdä profiilisi</p>
                </div>
                <Switch
                  checked={settings.showProfile}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, showProfile: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Näytä sähköposti</p>
                  <p className="text-sm text-gray-600">Sähköpostiosoite näkyy profiilissa</p>
                </div>
                <Switch
                  checked={settings.showEmail}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, showEmail: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Näytä puhelinnumero</p>
                  <p className="text-sm text-gray-600">Puhelinnumero näkyy profiilissa</p>
                </div>
                <Switch
                  checked={settings.showPhone}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, showPhone: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-[#003d82]">
                <Palette className="w-5 h-5" />
                Käyttöliittymä
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="language">Kieli</Label>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <select
                    id="language"
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="fi">Suomi</option>
                    <option value="en">English</option>
                    <option value="sv">Svenska</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="theme">Teema</Label>
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-gray-400" />
                  <select
                    id="theme"
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="light">Vaalea</option>
                    <option value="dark">Tumma</option>
                    <option value="auto">Automaattinen</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="dateFormat">Päivämäärämuoto</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <select
                    id="dateFormat"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="timeFormat">Aikamuoto</Label>
                <select
                  id="timeFormat"
                  value={settings.timeFormat}
                  onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="24h">24 tuntia (14:30)</option>
                  <option value="12h">12 tuntia (2:30 PM)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
