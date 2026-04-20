import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Mail, Bell, Shield, Clock, CheckCircle } from "lucide-react";

export default function WilmaSettingsManager() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    schoolName: 'Kulosaaren yhteiskoulu',
    academicYear: '2025-2026',
    semesterStart: '2025-08-15',
    semesterEnd: '2025-12-20',
    emailFromName: 'Wilma - Kulosaaren yhteiskoulu',
    emailFrom: 'noreply@ksyk.fi',
    notificationsEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false,
    twoFactorEnabled: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['wilma-settings'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/settings');
      if (!response.ok) return null;
      const data = await response.json();
      if (data) {
        setSettings(prev => ({ ...prev, ...data }));
      }
      return data;
    }
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await fetch('/api/wilma/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-settings'] });
      alert('✅ Asetukset tallennettu onnistuneesti!');
    },
    onError: () => {
      alert('❌ Asetusten tallennus epäonnistui');
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Ladataan asetuksia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Järjestelmän asetukset</h2>
          <p className="text-gray-600">Määritä Wilman järjestelmäasetukset</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveSettingsMutation.isPending ? 'Tallennetaan...' : 'Tallenna asetukset'}
        </Button>
      </div>

      {/* General Settings */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Yleiset asetukset
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Koulun nimi</Label>
              <Input
                value={settings.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                placeholder="Koulun nimi"
              />
            </div>

            <div>
              <Label>Lukuvuosi</Label>
              <Input
                value={settings.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                placeholder="2025-2026"
              />
            </div>

            <div>
              <Label>Lukukauden alku</Label>
              <Input
                type="date"
                value={settings.semesterStart}
                onChange={(e) => handleChange('semesterStart', e.target.value)}
              />
            </div>

            <div>
              <Label>Lukukauden loppu</Label>
              <Input
                type="date"
                value={settings.semesterEnd}
                onChange={(e) => handleChange('semesterEnd', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-600" />
            Sähköpostiasetukset
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Lähettäjän nimi</Label>
            <Input
              value={settings.emailFromName || 'Wilma - Kulosaaren yhteiskoulu'}
              onChange={(e) => handleChange('emailFromName', e.target.value)}
              placeholder="Wilma - Kulosaaren yhteiskoulu"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tämä nimi näkyy sähköpostien lähettäjänä
            </p>
          </div>

          <div>
            <Label>Lähettäjän osoite</Label>
            <Input
              value={settings.emailFrom}
              onChange={(e) => handleChange('emailFrom', e.target.value)}
              placeholder="noreply@ksyk.fi"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sähköpostiosoite josta viestit lähetetään. Tämä on vain näyttönimi - varsinainen lähetys tapahtuu palvelimen SMTP-asetusten kautta.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Ilmoitukset
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Ilmoitukset käytössä</Label>
                <p className="text-sm text-gray-600">Ota ilmoitukset käyttöön tai pois käytöstä</p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => handleChange('notificationsEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Sähköposti-ilmoitukset</Label>
                <p className="text-sm text-gray-600">Lähetä ilmoitukset sähköpostitse</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Tekstiviesti-ilmoitukset</Label>
                <p className="text-sm text-gray-600">Lähetä ilmoitukset tekstiviestillä</p>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => handleChange('smsNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Push-ilmoitukset</Label>
                <p className="text-sm text-gray-600">Lähetä push-ilmoitukset mobiiliin</p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleChange('pushNotifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            Turvallisuus
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Salasanan vähimmäispituus</Label>
              <Input
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))}
                min="6"
                max="20"
              />
            </div>

            <div>
              <Label>Istunnon aikakatkaisu (minuutit)</Label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                min="5"
                max="120"
              />
            </div>

            <div>
              <Label>Maksimi kirjautumisyritykset</Label>
              <Input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
                min="3"
                max="10"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Vaadi isoja kirjaimia</Label>
                <p className="text-sm text-gray-600">Salasanassa on oltava vähintään yksi iso kirjain</p>
              </div>
              <Switch
                checked={settings.passwordRequireUppercase}
                onCheckedChange={(checked) => handleChange('passwordRequireUppercase', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Vaadi numeroita</Label>
                <p className="text-sm text-gray-600">Salasanassa on oltava vähintään yksi numero</p>
              </div>
              <Switch
                checked={settings.passwordRequireNumbers}
                onCheckedChange={(checked) => handleChange('passwordRequireNumbers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Vaadi erikoismerkkejä</Label>
                <p className="text-sm text-gray-600">Salasanassa on oltava vähintään yksi erikoismerkki</p>
              </div>
              <Switch
                checked={settings.passwordRequireSpecialChars}
                onCheckedChange={(checked) => handleChange('passwordRequireSpecialChars', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Kaksivaiheinen tunnistautuminen</Label>
                <p className="text-sm text-gray-600">Vaadi 2FA kaikille käyttäjille</p>
              </div>
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => handleChange('twoFactorEnabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Järjestelmän tiedot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">Versio</p>
              <p className="text-lg font-bold text-gray-900 mt-1">3.2.0</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">Käyttöaika</p>
              <p className="text-lg font-bold text-gray-900 mt-1">99.9%</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">Tallennustila</p>
              <p className="text-lg font-bold text-gray-900 mt-1">2.4 GB</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">Käyttäjät</p>
              <p className="text-lg font-bold text-gray-900 mt-1">180</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 px-8"
          size="lg"
        >
          <Save className="w-5 h-5 mr-2" />
          {saveSettingsMutation.isPending ? 'Tallennetaan...' : 'Tallenna kaikki asetukset'}
        </Button>
      </div>
    </div>
  );
}
