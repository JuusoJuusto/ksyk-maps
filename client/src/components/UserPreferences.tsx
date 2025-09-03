import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  Languages, 
  Palette, 
  Volume2,
  Bell,
  Map,
  Zap,
  Save
} from 'lucide-react';

interface UserPreferences {
  language: string;
  theme: string;
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  voiceVolume: number;
  defaultView: string;
  autoNavigation: boolean;
  highContrast: boolean;
  animations: boolean;
  compassMode: boolean;
}

export function UserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: 'en',
    theme: 'light',
    voiceEnabled: true,
    notificationsEnabled: true,
    voiceVolume: 75,
    defaultView: 'map',
    autoNavigation: true,
    highContrast: false,
    animations: true,
    compassMode: false
  });

  const [isSaving, setIsSaving] = useState(false);

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    // Simulate saving to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Save to localStorage for persistence
    localStorage.setItem('ksyk-preferences', JSON.stringify(preferences));
    
    setIsSaving(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          User Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language & Localization */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold">Language & Region</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display Language</Label>
              <Select value={preferences.language} onValueChange={(value) => updatePreference('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fi">Suomi (Finnish)</SelectItem>
                  <SelectItem value="sv">Svenska (Swedish)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Default View</Label>
              <Select value={preferences.defaultView} onValueChange={(value) => updatePreference('defaultView', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="map">Campus Map</SelectItem>
                  <SelectItem value="list">Room List</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="admin">Admin Panel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold">Appearance</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={preferences.theme} onValueChange={(value) => updatePreference('theme', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast">High Contrast</Label>
                <Switch
                  id="high-contrast"
                  checked={preferences.highContrast}
                  onCheckedChange={(checked) => updatePreference('highContrast', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="animations">Animations</Label>
                <Switch
                  id="animations"
                  checked={preferences.animations}
                  onCheckedChange={(checked) => updatePreference('animations', checked)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audio & Notifications */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold">Audio & Notifications</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="voice-enabled">Voice Navigation</Label>
                <p className="text-xs text-gray-600">Enable voice commands and audio feedback</p>
              </div>
              <Switch
                id="voice-enabled"
                checked={preferences.voiceEnabled}
                onCheckedChange={(checked) => updatePreference('voiceEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications-enabled">Push Notifications</Label>
                <p className="text-xs text-gray-600">Receive alerts and updates</p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={preferences.notificationsEnabled}
                onCheckedChange={(checked) => updatePreference('notificationsEnabled', checked)}
              />
            </div>
            
            {preferences.voiceEnabled && (
              <div className="space-y-2">
                <Label>Voice Volume: {preferences.voiceVolume}%</Label>
                <Slider
                  value={[preferences.voiceVolume]}
                  onValueChange={([value]) => updatePreference('voiceVolume', value)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold">Navigation</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-navigation">Auto Navigation</Label>
                <p className="text-xs text-gray-600">Automatically start navigation when room is selected</p>
              </div>
              <Switch
                id="auto-navigation"
                checked={preferences.autoNavigation}
                onCheckedChange={(checked) => updatePreference('autoNavigation', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="compass-mode">Compass Mode</Label>
                <p className="text-xs text-gray-600">Show direction relative to device orientation</p>
              </div>
              <Switch
                id="compass-mode"
                checked={preferences.compassMode}
                onCheckedChange={(checked) => updatePreference('compassMode', checked)}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold">Quick Actions</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => updatePreference('theme', 'dark')}>
              Dark Mode
            </Button>
            <Button variant="outline" size="sm" onClick={() => updatePreference('language', 'fi')}>
              Finnish
            </Button>
            <Button variant="outline" size="sm" onClick={() => updatePreference('voiceEnabled', !preferences.voiceEnabled)}>
              Toggle Voice
            </Button>
            <Button variant="outline" size="sm" onClick={() => updatePreference('highContrast', !preferences.highContrast)}>
              High Contrast
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t pt-4">
          <Button
            onClick={savePreferences}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        {/* Preview */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-600 mb-2">Current Settings Preview:</p>
          <div className="p-3 bg-gray-50 rounded text-xs">
            Language: {preferences.language.toUpperCase()} | 
            Theme: {preferences.theme} | 
            Voice: {preferences.voiceEnabled ? 'ON' : 'OFF'} | 
            Notifications: {preferences.notificationsEnabled ? 'ON' : 'OFF'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}