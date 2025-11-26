import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { Palette, Globe, Settings, Mail } from 'lucide-react';

interface AppSettings {
  id: string;
  appName: string;
  appNameEn: string;
  appNameFi: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  headerTitle: string;
  headerTitleEn: string;
  headerTitleFi: string;
  footerText: string | null;
  footerTextEn: string | null;
  footerTextFi: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  showStats: boolean;
  showAnnouncements: boolean;
  enableSearch: boolean;
  defaultLanguage: string;
}

export default function AppSettingsManager() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Settings saved successfully!');
        // Reload page to apply changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="p-8 text-center">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">App Customization</h2>
          <p className="text-muted-foreground">Customize the look and feel of your application</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="content">
            <Globe className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="features">
            <Settings className="w-4 h-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Mail className="w-4 h-4 mr-2" />
            Contact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Customize your app's name and colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">App Name (Default)</Label>
                  <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      placeholder="#2563EB"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multilingual Content</CardTitle>
              <CardDescription>Set titles and text in different languages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Header Titles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="headerTitleEn">English</Label>
                    <Input
                      id="headerTitleEn"
                      value={settings.headerTitleEn}
                      onChange={(e) => setSettings({ ...settings, headerTitleEn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headerTitleFi">Finnish</Label>
                    <Input
                      id="headerTitleFi"
                      value={settings.headerTitleFi}
                      onChange={(e) => setSettings({ ...settings, headerTitleFi: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">App Names</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appNameEn">English</Label>
                    <Input
                      id="appNameEn"
                      value={settings.appNameEn}
                      onChange={(e) => setSettings({ ...settings, appNameEn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appNameFi">Finnish</Label>
                    <Input
                      id="appNameFi"
                      value={settings.appNameFi}
                      onChange={(e) => setSettings({ ...settings, appNameFi: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Footer Text</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="footerTextEn">English</Label>
                    <Input
                      id="footerTextEn"
                      value={settings.footerTextEn || ''}
                      onChange={(e) => setSettings({ ...settings, footerTextEn: e.target.value })}
                      placeholder="© 2025 Your Organization"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footerTextFi">Finnish</Label>
                    <Input
                      id="footerTextFi"
                      value={settings.footerTextFi || ''}
                      onChange={(e) => setSettings({ ...settings, footerTextFi: e.target.value })}
                      placeholder="© 2025 Organisaatiosi"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <select
                  id="defaultLanguage"
                  value={settings.defaultLanguage}
                  onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="en">English</option>
                  <option value="fi">Finnish</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Enable or disable app features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showStats">Show Statistics</Label>
                  <p className="text-sm text-muted-foreground">Display campus statistics on the home page</p>
                </div>
                <Switch
                  id="showStats"
                  checked={settings.showStats}
                  onCheckedChange={(checked) => setSettings({ ...settings, showStats: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showAnnouncements">Show Announcements</Label>
                  <p className="text-sm text-muted-foreground">Display announcement banner</p>
                </div>
                <Switch
                  id="showAnnouncements"
                  checked={settings.showAnnouncements}
                  onCheckedChange={(checked) => setSettings({ ...settings, showAnnouncements: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSearch">Enable Search</Label>
                  <p className="text-sm text-muted-foreground">Allow users to search for rooms and staff</p>
                </div>
                <Switch
                  id="enableSearch"
                  checked={settings.enableSearch}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableSearch: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Set contact details for support</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail || ''}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="support@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={settings.contactPhone || ''}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  placeholder="+358 123 456 789"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
