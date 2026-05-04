import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Monitor, Bell, Shield, Palette, User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsApp() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("appearance");

  const tabs = [
    { id: "appearance", label: "Ulkoasu", icon: Palette },
    { id: "notifications", label: "Ilmoitukset", icon: Bell },
    { id: "desktop", label: "Työpöytä", icon: Monitor },
    { id: "privacy", label: "Yksityisyys", icon: Shield },
    { id: "account", label: "Tili", icon: User },
  ];

  const handleSave = () => {
    toast({
      title: "Asetukset tallennettu!",
      description: "Muutokset on tallennettu onnistuneesti.",
    });
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Asetukset</h2>
        </div>
        
        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-900 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "appearance" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Ulkoasu</h3>
              <p className="text-gray-600">Mukauta työpöydän ja sovellusten ulkoasua</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Tumma tila</p>
                  <p className="text-sm text-gray-600">Käytä tummaa teemaa</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Animaatiot</p>
                  <p className="text-sm text-gray-600">Näytä siirtymäanimaatiot</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Läpinäkyvyys</p>
                  <p className="text-sm text-gray-600">Läpinäkyvät ikkunat ja taustat</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <Label htmlFor="wallpaper">Taustakuva</Label>
                <Input
                  id="wallpaper"
                  placeholder="/KSYK-logo-desktop.png"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Ilmoitukset</h3>
              <p className="text-gray-600">Hallitse ilmoitusasetuksia</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Työpöytäilmoitukset</p>
                  <p className="text-sm text-gray-600">Näytä ilmoitukset työpöydällä</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Ääni-ilmoitukset</p>
                  <p className="text-sm text-gray-600">Toista ääni ilmoituksille</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Sähköposti-ilmoitukset</p>
                  <p className="text-sm text-gray-600">Lähetä ilmoituksia sähköpostiin</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        )}

        {activeTab === "desktop" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Työpöytä</h3>
              <p className="text-gray-600">Työpöydän asetukset ja käyttäytyminen</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Automaattinen järjestely</p>
                  <p className="text-sm text-gray-600">Järjestä kuvakkeet automaattisesti</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Näytä piilotiedostot</p>
                  <p className="text-sm text-gray-600">Näytä piilotetut tiedostot ja kansiot</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Kaksoisnapsautus</p>
                  <p className="text-sm text-gray-600">Avaa sovellukset kaksoisnapsautuksella</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Yksityisyys</h3>
              <p className="text-gray-600">Hallitse yksityisyysasetuksia</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Käyttötilastot</p>
                  <p className="text-sm text-gray-600">Kerää anonyymejä käyttötilastoja</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Sijaintitiedot</p>
                  <p className="text-sm text-gray-600">Salli sijaintitietojen käyttö</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Evästeet</p>
                  <p className="text-sm text-gray-600">Salli evästeiden käyttö</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Tili</h3>
              <p className="text-gray-600">Hallitse tilitietojasi</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label htmlFor="username">Käyttäjänimi</Label>
                <Input id="username" placeholder="käyttäjä@example.com" className="mt-2" />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <Label htmlFor="displayName">Näyttönimi</Label>
                <Input id="displayName" placeholder="Etunimi Sukunimi" className="mt-2" />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <Label htmlFor="email">Sähköposti</Label>
                <Input id="email" type="email" placeholder="email@example.com" className="mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="max-w-2xl mt-8 pt-6 border-t border-gray-200">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Tallenna muutokset
          </Button>
        </div>
      </div>
    </div>
  );
}
