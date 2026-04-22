import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Save, Globe } from "lucide-react";

export default function AppearanceSettings() {
  const queryClient = useQueryClient();
  
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [dateFormat, setDateFormat] = useState<'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD.MM.YYYY');

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["appearance-settings"],
    queryFn: async () => {
      const response = await fetch("/api/appearance-settings");
      if (!response.ok) {
        // Return defaults if not found
        return {
          timeFormat: '24h',
          language: 'fi',
          dateFormat: 'DD.MM.YYYY'
        };
      }
      return response.json();
    }
  });

  // Load settings when fetched
  useState(() => {
    if (settings) {
      setTimeFormat(settings.timeFormat || '24h');
      setLanguage(settings.language || 'fi');
      setDateFormat(settings.dateFormat || 'DD.MM.YYYY');
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/appearance-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appearance-settings"] });
      alert("✅ Asetukset tallennettu!");
      // Reload page to apply changes
      window.location.reload();
    },
    onError: (error: any) => {
      alert(`❌ Virhe tallennuksessa: ${error.message}`);
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      timeFormat,
      language,
      dateFormat
    });
  };

  // Helper function to format time based on setting
  const formatTime = (time: string) => {
    if (timeFormat === '12h') {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
    return time;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Ladataan asetuksia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ulkoasuasetukset</h2>
          <p className="text-gray-600 mt-1">Mukauta sovelluksen ulkoasua ja muotoilua</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Tallennetaan..." : "Tallenna asetukset"}
        </Button>
      </div>

      {/* Time Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Kellonajan muoto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">Valitse kellonajan näyttötapa</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="timeFormat"
                  value="24h"
                  checked={timeFormat === '24h'}
                  onChange={(e) => setTimeFormat(e.target.value as '24h' | '12h')}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">24-tuntinen kello</p>
                  <p className="text-sm text-gray-600">Esimerkki: 14:30, 08:00, 23:45</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="timeFormat"
                  value="12h"
                  checked={timeFormat === '12h'}
                  onChange={(e) => setTimeFormat(e.target.value as '24h' | '12h')}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">12-tuntinen kello (AM/PM)</p>
                  <p className="text-sm text-gray-600">Esimerkki: 2:30 PM, 8:00 AM, 11:45 PM</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Esikatselu:</p>
            <div className="space-y-1 text-sm text-blue-800">
              <p>Aamutunti: {formatTime('08:00')}</p>
              <p>Iltapäivä: {formatTime('14:30')}</p>
              <p>Ilta: {formatTime('20:15')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            Päivämäärän muoto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">Valitse päivämäärän näyttötapa</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="dateFormat"
                  value="DD.MM.YYYY"
                  checked={dateFormat === 'DD.MM.YYYY'}
                  onChange={(e) => setDateFormat(e.target.value as any)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">Suomalainen (PP.KK.VVVV)</p>
                  <p className="text-sm text-gray-600">Esimerkki: 22.04.2026</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="dateFormat"
                  value="MM/DD/YYYY"
                  checked={dateFormat === 'MM/DD/YYYY'}
                  onChange={(e) => setDateFormat(e.target.value as any)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">Amerikkalainen (KK/PP/VVVV)</p>
                  <p className="text-sm text-gray-600">Esimerkki: 04/22/2026</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="dateFormat"
                  value="YYYY-MM-DD"
                  checked={dateFormat === 'YYYY-MM-DD'}
                  onChange={(e) => setDateFormat(e.target.value as any)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">ISO 8601 (VVVV-KK-PP)</p>
                  <p className="text-sm text-gray-600">Esimerkki: 2026-04-22</p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            Kieli / Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">Valitse sovelluksen kieli</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="language"
                  value="fi"
                  checked={language === 'fi'}
                  onChange={(e) => setLanguage(e.target.value as 'fi' | 'en')}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">Suomi</p>
                  <p className="text-sm text-gray-600">Finnish</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={language === 'en'}
                  onChange={(e) => setLanguage(e.target.value as 'fi' | 'en')}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold">English</p>
                  <p className="text-sm text-gray-600">Englanti</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Huom:</strong> Kieliasetuksen muuttaminen lataa sivun uudelleen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
