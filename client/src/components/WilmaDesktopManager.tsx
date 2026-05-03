import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Monitor,
  Plus,
  Edit,
  Trash2,
  Save,
  Image as ImageIcon,
  Palette,
  AppWindow,
  Settings as SettingsIcon,
} from "lucide-react";

interface DesktopSettings {
  id?: number;
  enabled: boolean;
  defaultWallpaper: string;
  defaultTheme: string;
  allowCustomWallpaper: boolean;
  allowCustomTheme: boolean;
  availableApps: string[];
  defaultApps: string[];
}

interface DesktopApp {
  id?: number;
  appId: string;
  name: string;
  nameFi: string;
  icon: string;
  description: string;
  descriptionFi: string;
  category: string;
  appType: "iframe" | "component" | "external";
  appUrl?: string;
  componentName?: string;
  width: number;
  height: number;
  resizable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  allowedRoles: string[];
  isActive: boolean;
  sortOrder: number;
}

const defaultApp: DesktopApp = {
  appId: "",
  name: "",
  nameFi: "",
  icon: "filetext",
  description: "",
  descriptionFi: "",
  category: "utility",
  appType: "iframe",
  appUrl: "",
  width: 800,
  height: 600,
  resizable: true,
  minimizable: true,
  maximizable: true,
  allowedRoles: ["student", "teacher", "parent", "admin"],
  isActive: true,
  sortOrder: 0,
};

export default function WilmaDesktopManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<DesktopSettings>({
    enabled: false,
    defaultWallpaper: "/wilma-bg.jpg",
    defaultTheme: "light",
    allowCustomWallpaper: true,
    allowCustomTheme: true,
    availableApps: [],
    defaultApps: [],
  });
  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [editingApp, setEditingApp] = useState<DesktopApp | null>(null);
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, appsRes] = await Promise.all([
        fetch("/api/wilma/desktop/settings"),
        fetch("/api/wilma/desktop/apps"),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApps(appsData);
      }
    } catch (error) {
      console.error("Error fetching desktop data:", error);
      toast({
        title: "Virhe",
        description: "Tietojen lataaminen epäonnistui",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("/api/wilma/desktop/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast({
        title: "Tallennettu",
        description: "Työpöytäasetukset tallennettu onnistuneesti",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Virhe",
        description: "Asetusten tallennus epäonnistui",
        variant: "destructive",
      });
    }
  };

  const saveApp = async () => {
    if (!editingApp) return;

    try {
      const method = editingApp.id ? "PUT" : "POST";
      const url = editingApp.id
        ? `/api/wilma/desktop/apps/${editingApp.id}`
        : "/api/wilma/desktop/apps";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingApp),
      });

      if (!res.ok) throw new Error("Failed to save app");

      toast({
        title: "Tallennettu",
        description: "Sovellus tallennettu onnistuneesti",
      });

      setIsAppDialogOpen(false);
      setEditingApp(null);
      fetchData();
    } catch (error) {
      console.error("Error saving app:", error);
      toast({
        title: "Virhe",
        description: "Sovelluksen tallennus epäonnistui",
        variant: "destructive",
      });
    }
  };

  const deleteApp = async (appId: number) => {
    if (!confirm("Haluatko varmasti poistaa tämän sovelluksen?")) return;

    try {
      const res = await fetch(`/api/wilma/desktop/apps/${appId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete app");

      toast({
        title: "Poistettu",
        description: "Sovellus poistettu onnistuneesti",
      });

      fetchData();
    } catch (error) {
      console.error("Error deleting app:", error);
      toast({
        title: "Virhe",
        description: "Sovelluksen poisto epäonnistui",
        variant: "destructive",
      });
    }
  };

  const toggleAppAvailability = (appId: string) => {
    setSettings(prev => ({
      ...prev,
      availableApps: prev.availableApps.includes(appId)
        ? prev.availableApps.filter(id => id !== appId)
        : [...prev.availableApps, appId],
    }));
  };

  const toggleDefaultApp = (appId: string) => {
    setSettings(prev => ({
      ...prev,
      defaultApps: prev.defaultApps.includes(appId)
        ? prev.defaultApps.filter(id => id !== appId)
        : [...prev.defaultApps, appId],
    }));
  };

  if (loading) {
    return <div className="p-6">Ladataan...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="w-8 h-8" />
            Työpöytäympäristö
          </h2>
          <p className="text-gray-600 mt-1">
            Hallinnoi Wilman työpöytäympäristöä ja sovelluksia
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Yleiset asetukset
          </TabsTrigger>
          <TabsTrigger value="apps">
            <AppWindow className="w-4 h-4 mr-2" />
            Sovellukset
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Ulkoasu
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Yleiset asetukset</CardTitle>
              <CardDescription>
                Ota työpöytäympäristö käyttöön ja määritä perusasetukset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled" className="text-base font-medium">
                    Työpöytä käytössä
                  </Label>
                  <p className="text-sm text-gray-600">
                    Ota työpöytäympäristö käyttöön kaikille käyttäjille
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="customWallpaper" className="text-base font-medium">
                    Salli mukautetut taustakuvat
                  </Label>
                  <p className="text-sm text-gray-600">
                    Käyttäjät voivat vaihtaa työpöydän taustakuvan
                  </p>
                </div>
                <Switch
                  id="customWallpaper"
                  checked={settings.allowCustomWallpaper}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allowCustomWallpaper: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="customTheme" className="text-base font-medium">
                    Salli mukautetut teemat
                  </Label>
                  <p className="text-sm text-gray-600">
                    Käyttäjät voivat vaihtaa työpöydän teemaa
                  </p>
                </div>
                <Switch
                  id="customTheme"
                  checked={settings.allowCustomTheme}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allowCustomTheme: checked })
                  }
                />
              </div>

              <div className="pt-4">
                <Button onClick={saveSettings} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Tallenna asetukset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apps Management */}
        <TabsContent value="apps">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sovellukset</CardTitle>
                  <CardDescription>
                    Hallinnoi työpöydän sovelluksia
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingApp(defaultApp);
                    setIsAppDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää sovellus
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                        {app.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{app.nameFi || app.name}</h4>
                        <p className="text-sm text-gray-600">{app.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1 mr-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={settings.availableApps.includes(app.appId)}
                            onCheckedChange={() => toggleAppAvailability(app.appId)}
                          />
                          Saatavilla
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={settings.defaultApps.includes(app.appId)}
                            onCheckedChange={() => toggleDefaultApp(app.appId)}
                          />
                          Oletussovellus
                        </label>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingApp(app);
                          setIsAppDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => app.id && deleteApp(app.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Button onClick={saveSettings} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Tallenna sovellusasetukset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Ulkoasu</CardTitle>
              <CardDescription>
                Määritä oletusulkoasu työpöydälle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="wallpaper">Oletustaustakuva (URL)</Label>
                <Input
                  id="wallpaper"
                  value={settings.defaultWallpaper}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultWallpaper: e.target.value })
                  }
                  placeholder="/wilma-bg.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Oletusteema</Label>
                <Select
                  value={settings.defaultTheme}
                  onValueChange={(value) =>
                    setSettings({ ...settings, defaultTheme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Vaalea</SelectItem>
                    <SelectItem value="dark">Tumma</SelectItem>
                    <SelectItem value="blue">Sininen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button onClick={saveSettings} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Tallenna ulkoasuasetukset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* App Edit Dialog */}
      <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingApp?.id ? "Muokkaa sovellusta" : "Lisää uusi sovellus"}
            </DialogTitle>
            <DialogDescription>
              Määritä sovelluksen tiedot ja asetukset
            </DialogDescription>
          </DialogHeader>

          {editingApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">Sovellustunniste *</Label>
                  <Input
                    id="appId"
                    value={editingApp.appId}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, appId: e.target.value })
                    }
                    placeholder="calculator"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Ikoni</Label>
                  <Input
                    id="icon"
                    value={editingApp.icon}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, icon: e.target.value })
                    }
                    placeholder="calculator"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nimi (EN) *</Label>
                  <Input
                    id="name"
                    value={editingApp.name}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameFi">Nimi (FI) *</Label>
                  <Input
                    id="nameFi"
                    value={editingApp.nameFi}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, nameFi: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Kuvaus (EN)</Label>
                <Textarea
                  id="description"
                  value={editingApp.description}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionFi">Kuvaus (FI)</Label>
                <Textarea
                  id="descriptionFi"
                  value={editingApp.descriptionFi}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, descriptionFi: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategoria</Label>
                  <Select
                    value={editingApp.category}
                    onValueChange={(value) =>
                      setEditingApp({ ...editingApp, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utility">Työkalut</SelectItem>
                      <SelectItem value="education">Opetus</SelectItem>
                      <SelectItem value="entertainment">Viihde</SelectItem>
                      <SelectItem value="productivity">Tuottavuus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appType">Sovellustyyppi</Label>
                  <Select
                    value={editingApp.appType}
                    onValueChange={(value: any) =>
                      setEditingApp({ ...editingApp, appType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iframe">IFrame</SelectItem>
                      <SelectItem value="component">Komponentti</SelectItem>
                      <SelectItem value="external">Ulkoinen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editingApp.appType === "iframe" && (
                <div className="space-y-2">
                  <Label htmlFor="appUrl">Sovelluksen URL</Label>
                  <Input
                    id="appUrl"
                    value={editingApp.appUrl || ""}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, appUrl: e.target.value })
                    }
                    placeholder="https://example.com/app"
                  />
                </div>
              )}

              {editingApp.appType === "component" && (
                <div className="space-y-2">
                  <Label htmlFor="componentName">Komponentin nimi</Label>
                  <Input
                    id="componentName"
                    value={editingApp.componentName || ""}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, componentName: e.target.value })
                    }
                    placeholder="CalculatorApp"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Leveys (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={editingApp.width}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, width: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Korkeus (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={editingApp.height}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, height: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={editingApp.resizable}
                    onCheckedChange={(checked) =>
                      setEditingApp({ ...editingApp, resizable: checked })
                    }
                  />
                  <span className="text-sm">Koon muutos</span>
                </label>

                <label className="flex items-center gap-2">
                  <Switch
                    checked={editingApp.minimizable}
                    onCheckedChange={(checked) =>
                      setEditingApp({ ...editingApp, minimizable: checked })
                    }
                  />
                  <span className="text-sm">Pienennys</span>
                </label>

                <label className="flex items-center gap-2">
                  <Switch
                    checked={editingApp.maximizable}
                    onCheckedChange={(checked) =>
                      setEditingApp({ ...editingApp, maximizable: checked })
                    }
                  />
                  <span className="text-sm">Suurennus</span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAppDialogOpen(false)}>
              Peruuta
            </Button>
            <Button onClick={saveApp}>
              <Save className="w-4 h-4 mr-2" />
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
