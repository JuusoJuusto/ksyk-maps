import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { toast } from 'react-hot-toast';
import { Palette, Globe, Settings, Mail, Paintbrush, Zap } from 'lucide-react';

interface AppSettings {
  id: string;
  appName: string;
  appNameEn: string;
  appNameFi: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  theme: string;
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
  enableAnimations: boolean;
  enableAutoSave: boolean;
  compactMode: boolean;
  defaultLanguage: string;
  aiSensitivity: number;
  enableSmartSnap: boolean;
  enableRoomAutoCreation: boolean;
  cacheMinutes: number;
  maxImageSizeMB: number;
  enablePreloadImages: boolean;
  enableLazyLoading: boolean;
  defaultZoomLevel: number;
  enableEasterEgg?: boolean;
  enableEvents?: boolean;
  enableTicketSystem?: boolean;
  enableVersionInfo?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  // ADVANCED FEATURES
  enableDarkModeToggle?: boolean;
  enableNotifications?: boolean;
  enableOfflineMode?: boolean;
  enableAnalytics?: boolean;
  enableAccessibilityMode?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableAdvancedSearch?: boolean;
  enableRoomBooking?: boolean;
  enableQRCodeScanning?: boolean;
  enableARMode?: boolean;
  enable3DView?: boolean;
  enableVoiceCommands?: boolean;
  enableMultiLanguage?: boolean;
  enableExportData?: boolean;
  enableImportData?: boolean;
  enableBulkOperations?: boolean;
  enableAdvancedFilters?: boolean;
  enableCustomFields?: boolean;
  enableWebhooks?: boolean;
  enableAPIAccess?: boolean;
  maxUploadSizeMB?: number;
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  passwordMinLength?: number;
  requireStrongPassword?: boolean;
  enable2FA?: boolean;
  enableSSO?: boolean;
  enableAuditLog?: boolean;
  enableBackups?: boolean;
  backupFrequencyHours?: number;
  // SUPER ADVANCED FEATURES
  enableRealTimeUpdates?: boolean;
  enableCollaborativeEditing?: boolean;
  enableLiveChat?: boolean;
  enableUserPresence?: boolean;
  enableActivityFeed?: boolean;
  enableVersionControl?: boolean;
  enableSmartSuggestions?: boolean;
  enablePersonalizedDashboard?: boolean;
  enableQuickActions?: boolean;
  enableDragDrop?: boolean;
  enableGestureControls?: boolean;
  enableInteractiveTours?: boolean;
  enableContextualHelp?: boolean;
  enableVideoTutorials?: boolean;
  enableSmartSearch?: boolean;
  enableFAQIntegration?: boolean;
  enableProgressTracking?: boolean;
  enableMachineLearning?: boolean;
  enablePredictiveAnalytics?: boolean;
  enableAdvancedCaching?: boolean;
  enableLoadBalancing?: boolean;
  enableCDNIntegration?: boolean;
  enableEdgeComputing?: boolean;
  enablePushNotifications?: boolean;
  enableEmailNotifications?: boolean;
  enableSMSNotifications?: boolean;
  enableSlackIntegration?: boolean;
  enableDiscordIntegration?: boolean;
  enableCustomWebhooks?: boolean;
  enableSEOOptimization?: boolean;
  enableOpenGraphTags?: boolean;
  enableSchemaMarkup?: boolean;
  enableSitemapGeneration?: boolean;
  enableMetaTags?: boolean;
  enableCanonicalURLs?: boolean;
  enableCustomCSS?: boolean;
  enableCustomJS?: boolean;
  enablePluginSystem?: boolean;
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
        
        // Apply theme change immediately
        if (settings.theme) {
          document.documentElement.classList.remove('light', 'dark', 'system');
          document.documentElement.classList.add(settings.theme);
          
          // Trigger theme change event
          const themeChangeEvent = new CustomEvent('manualThemeChange', { 
            detail: { theme: settings.theme } 
          });
          window.dispatchEvent(themeChangeEvent);
        }
        
        // Reload page to apply other changes after a short delay
        setTimeout(() => window.location.reload(), 1500);
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

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="appearance">
            <Paintbrush className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
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
          <TabsTrigger value="performance">
            <Zap className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Mail className="w-4 h-4 mr-2" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="super-advanced">
            <Zap className="w-4 h-4 mr-2" />
            Super Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme & Appearance</CardTitle>
              <CardDescription>Customize the visual theme and appearance settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Global Theme</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Theme */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      settings.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                  >
                    <div className="bg-white rounded-lg p-3 mb-3 shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-2 bg-blue-500 rounded"></div>
                        <div className="w-3/4 h-2 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                    <h4 className="font-semibold">☀️ Light Theme</h4>
                    <p className="text-sm text-gray-600">Clean & bright interface</p>
                    {settings.theme === 'light' && (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Active</span>
                      </div>
                    )}
                  </div>

                  {/* Dark Theme */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      settings.theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                  >
                    <div className="bg-gray-900 rounded-lg p-3 mb-3 shadow-sm border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-2 bg-blue-400 rounded"></div>
                        <div className="w-3/4 h-2 bg-gray-600 rounded"></div>
                      </div>
                    </div>
                    <h4 className="font-semibold">🌙 Dark Theme</h4>
                    <p className="text-sm text-gray-600">Easy on the eyes</p>
                    {settings.theme === 'dark' && (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Active</span>
                      </div>
                    )}
                  </div>

                  {/* System Theme */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      settings.theme === 'system' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                    onClick={() => setSettings({ ...settings, theme: 'system' })}
                  >
                    <div className="bg-gray-100 rounded-lg p-3 mb-3 shadow-sm border relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-2 bg-blue-500 rounded"></div>
                        <div className="w-3/4 h-2 bg-gray-400 rounded"></div>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900">🖥️ System Theme</h4>
                    <p className="text-sm text-gray-700">Follows system preference</p>
                    {settings.theme === 'system' && (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Active</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Theme changes apply globally</strong> to all users and are saved to the database. The System theme automatically follows your device's light/dark mode preference.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Animations</Label>
                    <p className="text-sm text-muted-foreground">Smooth transitions and effects</p>
                  </div>
                  <Switch
                    checked={settings.enableAnimations}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableAnimations: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                  </div>
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, compactMode: checked })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Default Zoom Level: {settings.defaultZoomLevel}x</Label>
                <Slider
                  value={[settings.defaultZoomLevel]}
                  onValueChange={(value) => setSettings({ ...settings, defaultZoomLevel: value[0] })}
                  max={3}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity & Colors</CardTitle>
              <CardDescription>Customize your app's name, logo, and color scheme</CardDescription>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="successColor">Success Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="successColor"
                      type="color"
                      value={settings.successColor}
                      onChange={(e) => setSettings({ ...settings, successColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.successColor}
                      onChange={(e) => setSettings({ ...settings, successColor: e.target.value })}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warningColor">Warning Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="warningColor"
                      type="color"
                      value={settings.warningColor}
                      onChange={(e) => setSettings({ ...settings, warningColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.warningColor}
                      onChange={(e) => setSettings({ ...settings, warningColor: e.target.value })}
                      placeholder="#EF4444"
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
              <CardDescription>Enable or disable app features and functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableAutoSave">Auto Save</Label>
                    <p className="text-sm text-muted-foreground">Automatically save changes</p>
                  </div>
                  <Switch
                    id="enableAutoSave"
                    checked={settings.enableAutoSave}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableAutoSave: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableSmartSnap">Smart Snap</Label>
                    <p className="text-sm text-muted-foreground">Snap elements to grid automatically</p>
                  </div>
                  <Switch
                    id="enableSmartSnap"
                    checked={settings.enableSmartSnap}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableSmartSnap: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableRoomAutoCreation">Auto Create Rooms</Label>
                    <p className="text-sm text-muted-foreground">Automatically create rooms from AI detection</p>
                  </div>
                  <Switch
                    id="enableRoomAutoCreation"
                    checked={settings.enableRoomAutoCreation}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableRoomAutoCreation: checked })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>AI Sensitivity: {Math.round(settings.aiSensitivity * 100)}%</Label>
                  <Slider
                    value={[settings.aiSensitivity]}
                    onValueChange={(value) => setSettings({ ...settings, aiSensitivity: value[0] })}
                    max={1}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Higher values make AI more sensitive to detecting rooms and features
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-4">Additional Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableEasterEgg">Enable Easter Egg</Label>
                      <p className="text-sm text-muted-foreground">Show hidden Easter egg feature</p>
                    </div>
                    <Switch
                      id="enableEasterEgg"
                      checked={settings.enableEasterEgg ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableEasterEgg: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableEvents">Enable Events</Label>
                      <p className="text-sm text-muted-foreground">Show events system</p>
                    </div>
                    <Switch
                      id="enableEvents"
                      checked={settings.enableEvents ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableEvents: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableTicketSystem">Enable Ticket System</Label>
                      <p className="text-sm text-muted-foreground">Show support ticket system</p>
                    </div>
                    <Switch
                      id="enableTicketSystem"
                      checked={settings.enableTicketSystem ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableTicketSystem: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableVersionInfo">Enable Version Info</Label>
                      <p className="text-sm text-muted-foreground">Show version information button</p>
                    </div>
                    <Switch
                      id="enableVersionInfo"
                      checked={settings.enableVersionInfo ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableVersionInfo: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Put app in maintenance mode</p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={settings.maintenanceMode ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                    />
                  </div>
                </div>

                {settings.maintenanceMode && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Input
                      id="maintenanceMessage"
                      value={settings.maintenanceMessage || ''}
                      onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                      placeholder="We are currently performing maintenance. Please check back soon."
                    />
                    <p className="text-sm text-muted-foreground">Message shown to users during maintenance</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance & Optimization</CardTitle>
              <CardDescription>Configure performance and caching settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enablePreloadImages">Preload Images</Label>
                    <p className="text-sm text-muted-foreground">Load images in advance for faster display</p>
                  </div>
                  <Switch
                    id="enablePreloadImages"
                    checked={settings.enablePreloadImages}
                    onCheckedChange={(checked) => setSettings({ ...settings, enablePreloadImages: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableLazyLoading">Lazy Loading</Label>
                    <p className="text-sm text-muted-foreground">Load content only when needed</p>
                  </div>
                  <Switch
                    id="enableLazyLoading"
                    checked={settings.enableLazyLoading}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableLazyLoading: checked })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cacheMinutes">Cache Duration (minutes)</Label>
                  <Input
                    id="cacheMinutes"
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.cacheMinutes}
                    onChange={(e) => setSettings({ ...settings, cacheMinutes: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-sm text-muted-foreground">How long to cache data (1-1440 minutes)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxImageSizeMB">Max Image Size (MB)</Label>
                  <Input
                    id="maxImageSizeMB"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxImageSizeMB}
                    onChange={(e) => setSettings({ ...settings, maxImageSizeMB: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-sm text-muted-foreground">Maximum allowed image upload size</p>
                </div>
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

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🚀 Advanced Features</CardTitle>
              <CardDescription>Enable cutting-edge features and experimental functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ⚡ <strong>Power User Settings:</strong> These advanced features provide enterprise-level functionality. Some features may be experimental.
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg">UI/UX Enhancements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode Toggle</Label>
                      <p className="text-sm text-muted-foreground">Show dark mode toggle in UI</p>
                    </div>
                    <Switch
                      checked={settings.enableDarkModeToggle ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableDarkModeToggle: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications</Label>
                      <p className="text-sm text-muted-foreground">Enable push notifications</p>
                    </div>
                    <Switch
                      checked={settings.enableNotifications ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Offline Mode</Label>
                      <p className="text-sm text-muted-foreground">Work without internet connection</p>
                    </div>
                    <Switch
                      checked={settings.enableOfflineMode ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableOfflineMode: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Accessibility Mode</Label>
                      <p className="text-sm text-muted-foreground">Enhanced accessibility features</p>
                    </div>
                    <Switch
                      checked={settings.enableAccessibilityMode ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAccessibilityMode: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Keyboard Shortcuts</Label>
                      <p className="text-sm text-muted-foreground">Enable keyboard navigation</p>
                    </div>
                    <Switch
                      checked={settings.enableKeyboardShortcuts ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableKeyboardShortcuts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Multi-Language</Label>
                      <p className="text-sm text-muted-foreground">Support multiple languages</p>
                    </div>
                    <Switch
                      checked={settings.enableMultiLanguage ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableMultiLanguage: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">Advanced Functionality</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Advanced Search</Label>
                      <p className="text-sm text-muted-foreground">Enhanced search with filters</p>
                    </div>
                    <Switch
                      checked={settings.enableAdvancedSearch ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAdvancedSearch: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Room Booking</Label>
                      <p className="text-sm text-muted-foreground">Allow users to book rooms</p>
                    </div>
                    <Switch
                      checked={settings.enableRoomBooking ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableRoomBooking: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>QR Code Scanning</Label>
                      <p className="text-sm text-muted-foreground">Scan QR codes for quick access</p>
                    </div>
                    <Switch
                      checked={settings.enableQRCodeScanning ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableQRCodeScanning: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Analytics</Label>
                      <p className="text-sm text-muted-foreground">Track usage and statistics</p>
                    </div>
                    <Switch
                      checked={settings.enableAnalytics ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAnalytics: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Advanced Filters</Label>
                      <p className="text-sm text-muted-foreground">Complex filtering options</p>
                    </div>
                    <Switch
                      checked={settings.enableAdvancedFilters ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAdvancedFilters: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Bulk Operations</Label>
                      <p className="text-sm text-muted-foreground">Perform actions on multiple items</p>
                    </div>
                    <Switch
                      checked={settings.enableBulkOperations ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableBulkOperations: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🔬 Experimental Features</h3>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Warning:</strong> These features are experimental and may not work as expected.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>AR Mode</Label>
                      <p className="text-sm text-muted-foreground">Augmented reality navigation</p>
                    </div>
                    <Switch
                      checked={settings.enableARMode ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableARMode: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>3D View</Label>
                      <p className="text-sm text-muted-foreground">3D building visualization</p>
                    </div>
                    <Switch
                      checked={settings.enable3DView ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable3DView: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Voice Commands</Label>
                      <p className="text-sm text-muted-foreground">Control with voice</p>
                    </div>
                    <Switch
                      checked={settings.enableVoiceCommands ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableVoiceCommands: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Custom Fields</Label>
                      <p className="text-sm text-muted-foreground">Add custom data fields</p>
                    </div>
                    <Switch
                      checked={settings.enableCustomFields ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCustomFields: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🔌 Integration & API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Export Data</Label>
                      <p className="text-sm text-muted-foreground">Allow data export</p>
                    </div>
                    <Switch
                      checked={settings.enableExportData ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableExportData: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Import Data</Label>
                      <p className="text-sm text-muted-foreground">Allow data import</p>
                    </div>
                    <Switch
                      checked={settings.enableImportData ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableImportData: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Webhooks</Label>
                      <p className="text-sm text-muted-foreground">Send events to external services</p>
                    </div>
                    <Switch
                      checked={settings.enableWebhooks ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableWebhooks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>API Access</Label>
                      <p className="text-sm text-muted-foreground">Enable REST API</p>
                    </div>
                    <Switch
                      checked={settings.enableAPIAccess ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAPIAccess: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🔒 Security Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Max Upload Size (MB)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      value={settings.maxUploadSizeMB ?? 50}
                      onChange={(e) => setSettings({ ...settings, maxUploadSizeMB: parseInt(e.target.value) || 50 })}
                    />
                    <p className="text-sm text-muted-foreground">Maximum file upload size</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.sessionTimeoutMinutes ?? 60}
                      onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 60 })}
                    />
                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxLoginAttempts ?? 5}
                      onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                    />
                    <p className="text-sm text-muted-foreground">Lock account after failed attempts</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Password Min Length</Label>
                    <Input
                      type="number"
                      min="6"
                      max="32"
                      value={settings.passwordMinLength ?? 8}
                      onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 8 })}
                    />
                    <p className="text-sm text-muted-foreground">Minimum password characters</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Strong Password Required</Label>
                      <p className="text-sm text-muted-foreground">Require special characters</p>
                    </div>
                    <Switch
                      checked={settings.requireStrongPassword ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, requireStrongPassword: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Enable 2FA for all users</p>
                    </div>
                    <Switch
                      checked={settings.enable2FA ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable2FA: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Single Sign-On (SSO)</Label>
                      <p className="text-sm text-muted-foreground">Enable SSO integration</p>
                    </div>
                    <Switch
                      checked={settings.enableSSO ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSSO: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Audit Log</Label>
                      <p className="text-sm text-muted-foreground">Track all user actions</p>
                    </div>
                    <Switch
                      checked={settings.enableAuditLog ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAuditLog: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">💾 Backup & Recovery</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automated Backups</Label>
                      <p className="text-sm text-muted-foreground">Enable automatic backups</p>
                    </div>
                    <Switch
                      checked={settings.enableBackups ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableBackups: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Frequency (hours)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.backupFrequencyHours ?? 24}
                      onChange={(e) => setSettings({ ...settings, backupFrequencyHours: parseInt(e.target.value) || 24 })}
                    />
                    <p className="text-sm text-muted-foreground">How often to backup data</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="super-advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>⚡ Super Advanced Features</CardTitle>
              <CardDescription>Enterprise-level customization and cutting-edge functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  🚀 <strong>Enterprise Features:</strong> These settings provide maximum customization and control. Use with caution in production environments.
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg">🔄 Real-Time & Collaboration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Real-Time Updates</Label>
                      <p className="text-sm text-muted-foreground">Live data synchronization</p>
                    </div>
                    <Switch
                      checked={settings.enableRealTimeUpdates ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableRealTimeUpdates: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Collaborative Editing</Label>
                      <p className="text-sm text-muted-foreground">Multiple users editing simultaneously</p>
                    </div>
                    <Switch
                      checked={settings.enableCollaborativeEditing ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCollaborativeEditing: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Live Chat Support</Label>
                      <p className="text-sm text-muted-foreground">Built-in chat system</p>
                    </div>
                    <Switch
                      checked={settings.enableLiveChat ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableLiveChat: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>User Presence</Label>
                      <p className="text-sm text-muted-foreground">Show who's online</p>
                    </div>
                    <Switch
                      checked={settings.enableUserPresence ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableUserPresence: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Activity Feed</Label>
                      <p className="text-sm text-muted-foreground">Real-time activity updates</p>
                    </div>
                    <Switch
                      checked={settings.enableActivityFeed ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableActivityFeed: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Version Control</Label>
                      <p className="text-sm text-muted-foreground">Track changes and revisions</p>
                    </div>
                    <Switch
                      checked={settings.enableVersionControl ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableVersionControl: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🎯 User Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Smart Suggestions</Label>
                      <p className="text-sm text-muted-foreground">AI-powered recommendations</p>
                    </div>
                    <Switch
                      checked={settings.enableSmartSuggestions ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSmartSuggestions: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Personalized Dashboard</Label>
                      <p className="text-sm text-muted-foreground">Customizable user interface</p>
                    </div>
                    <Switch
                      checked={settings.enablePersonalizedDashboard ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enablePersonalizedDashboard: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Quick Actions</Label>
                      <p className="text-sm text-muted-foreground">Contextual action buttons</p>
                    </div>
                    <Switch
                      checked={settings.enableQuickActions ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableQuickActions: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Drag & Drop</Label>
                      <p className="text-sm text-muted-foreground">Intuitive drag and drop interface</p>
                    </div>
                    <Switch
                      checked={settings.enableDragDrop ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableDragDrop: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Gesture Controls</Label>
                      <p className="text-sm text-muted-foreground">Touch gestures on mobile</p>
                    </div>
                    <Switch
                      checked={settings.enableGestureControls ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableGestureControls: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Save</Label>
                      <p className="text-sm text-muted-foreground">Automatically save changes</p>
                    </div>
                    <Switch
                      checked={settings.enableAutoSave ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAutoSave: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🧭 Guidance & Help</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Interactive Tours</Label>
                      <p className="text-sm text-muted-foreground">Guided feature walkthroughs</p>
                    </div>
                    <Switch
                      checked={settings.enableInteractiveTours ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableInteractiveTours: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Contextual Help</Label>
                      <p className="text-sm text-muted-foreground">Smart help tooltips</p>
                    </div>
                    <Switch
                      checked={settings.enableContextualHelp ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableContextualHelp: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Video Tutorials</Label>
                      <p className="text-sm text-muted-foreground">Embedded tutorial videos</p>
                    </div>
                    <Switch
                      checked={settings.enableVideoTutorials ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableVideoTutorials: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Smart Search</Label>
                      <p className="text-sm text-muted-foreground">AI-enhanced search results</p>
                    </div>
                    <Switch
                      checked={settings.enableSmartSearch ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSmartSearch: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>FAQ Integration</Label>
                      <p className="text-sm text-muted-foreground">Built-in FAQ system</p>
                    </div>
                    <Switch
                      checked={settings.enableFAQIntegration ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableFAQIntegration: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Progress Tracking</Label>
                      <p className="text-sm text-muted-foreground">Track user learning progress</p>
                    </div>
                    <Switch
                      checked={settings.enableProgressTracking ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableProgressTracking: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🔧 Advanced Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Machine Learning</Label>
                      <p className="text-sm text-muted-foreground">AI-powered insights</p>
                    </div>
                    <Switch
                      checked={settings.enableMachineLearning ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableMachineLearning: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Predictive Analytics</Label>
                      <p className="text-sm text-muted-foreground">Forecast usage patterns</p>
                    </div>
                    <Switch
                      checked={settings.enablePredictiveAnalytics ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enablePredictiveAnalytics: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Advanced Caching</Label>
                      <p className="text-sm text-muted-foreground">Intelligent data caching</p>
                    </div>
                    <Switch
                      checked={settings.enableAdvancedCaching ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableAdvancedCaching: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Load Balancing</Label>
                      <p className="text-sm text-muted-foreground">Distribute server load</p>
                    </div>
                    <Switch
                      checked={settings.enableLoadBalancing ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableLoadBalancing: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>CDN Integration</Label>
                      <p className="text-sm text-muted-foreground">Content delivery network</p>
                    </div>
                    <Switch
                      checked={settings.enableCDNIntegration ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCDNIntegration: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Edge Computing</Label>
                      <p className="text-sm text-muted-foreground">Process data at the edge</p>
                    </div>
                    <Switch
                      checked={settings.enableEdgeComputing ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableEdgeComputing: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🔔 Notifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch
                      checked={settings.enablePushNotifications ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enablePushNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send email alerts</p>
                    </div>
                    <Switch
                      checked={settings.enableEmailNotifications ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableEmailNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Text message alerts</p>
                    </div>
                    <Switch
                      checked={settings.enableSMSNotifications ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSMSNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Slack Integration</Label>
                      <p className="text-sm text-muted-foreground">Send alerts to Slack</p>
                    </div>
                    <Switch
                      checked={settings.enableSlackIntegration ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSlackIntegration: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Discord Integration</Label>
                      <p className="text-sm text-muted-foreground">Send alerts to Discord</p>
                    </div>
                    <Switch
                      checked={settings.enableDiscordIntegration ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableDiscordIntegration: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Custom Webhooks</Label>
                      <p className="text-sm text-muted-foreground">Send to custom endpoints</p>
                    </div>
                    <Switch
                      checked={settings.enableCustomWebhooks ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCustomWebhooks: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">🔍 SEO & Meta</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SEO Optimization</Label>
                      <p className="text-sm text-muted-foreground">Search engine optimization</p>
                    </div>
                    <Switch
                      checked={settings.enableSEOOptimization ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSEOOptimization: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Open Graph Tags</Label>
                      <p className="text-sm text-muted-foreground">Social media previews</p>
                    </div>
                    <Switch
                      checked={settings.enableOpenGraphTags ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableOpenGraphTags: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Schema Markup</Label>
                      <p className="text-sm text-muted-foreground">Structured data for search</p>
                    </div>
                    <Switch
                      checked={settings.enableSchemaMarkup ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSchemaMarkup: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sitemap Generation</Label>
                      <p className="text-sm text-muted-foreground">Auto-generate XML sitemap</p>
                    </div>
                    <Switch
                      checked={settings.enableSitemapGeneration ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableSitemapGeneration: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Meta Tags</Label>
                      <p className="text-sm text-muted-foreground">Dynamic meta descriptions</p>
                    </div>
                    <Switch
                      checked={settings.enableMetaTags ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableMetaTags: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Canonical URLs</Label>
                      <p className="text-sm text-muted-foreground">Prevent duplicate content</p>
                    </div>
                    <Switch
                      checked={settings.enableCanonicalURLs ?? true}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCanonicalURLs: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">💻 Custom Code</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Custom CSS</Label>
                      <p className="text-sm text-muted-foreground">Allow custom styling</p>
                    </div>
                    <Switch
                      checked={settings.enableCustomCSS ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCustomCSS: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Custom JavaScript</Label>
                      <p className="text-sm text-muted-foreground">Allow custom scripts</p>
                    </div>
                    <Switch
                      checked={settings.enableCustomJS ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enableCustomJS: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Plugin System</Label>
                      <p className="text-sm text-muted-foreground">Third-party plugins</p>
                    </div>
                    <Switch
                      checked={settings.enablePluginSystem ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, enablePluginSystem: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-6">
                <p className="text-sm text-red-800">
                  ⚠️ <strong>Warning:</strong> Super Advanced features may impact performance and security. Test thoroughly before enabling in production.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
