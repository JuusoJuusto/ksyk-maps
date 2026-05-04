import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, Plus, Edit2, Trash2, Save, X, Eye, EyeOff,
  Settings, Image, Palette, Grid, List, Search, Filter,
  CheckCircle, AlertCircle, Upload, Download, RefreshCw
} from "lucide-react";

interface DesktopApp {
  id?: string;
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

export default function WilmaDesktopManager() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<DesktopApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingApp, setEditingApp] = useState<DesktopApp | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newApp, setNewApp] = useState<Partial<DesktopApp>>({
    appId: "",
    name: "",
    nameFi: "",
    icon: "globe",
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
    sortOrder: apps.length + 1,
  });
  const [desktopSettings, setDesktopSettings] = useState({
    enabled: true,
    defaultWallpaper: "/KSYK-logo-desktop.png",
    defaultTheme: "dark",
    allowCustomWallpaper: true,
    allowCustomTheme: true,
  });

  useEffect(() => {
    fetchApps();
    fetchSettings();
  }, []);

  useEffect(() => {
    filterApps();
  }, [apps, searchQuery, categoryFilter]);

  const fetchApps = async () => {
    try {
      const response = await fetch("/api/wilma/desktop/apps");
      if (!response.ok) throw new Error("Failed to fetch apps");
      const data = await response.json();
      setApps(data);
      setFilteredApps(data);
    } catch (error) {
      console.error("Error fetching apps:", error);
      toast({
        title: "Virhe",
        description: "Sovellusten lataaminen epäonnistui",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/wilma/desktop/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setDesktopSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const filterApps = () => {
    let filtered = apps;

    if (searchQuery) {
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.nameFi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(app => app.category === categoryFilter);
    }

    setFilteredApps(filtered);
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch("/api/wilma/desktop/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(desktopSettings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast({
        title: "Tallennettu!",
        description: "Työpöytäasetukset on tallennettu",
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

  const handleToggleApp = async (appId: string) => {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    try {
      const response = await fetch(`/api/wilma/desktop/apps/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...app, isActive: !app.isActive }),
      });

      if (!response.ok) throw new Error("Failed to toggle app");

      setApps(apps.map(a => a.id === appId ? { ...a, isActive: !a.isActive } : a));

      toast({
        title: app.isActive ? "Poistettu käytöstä" : "Otettu käyttöön",
        description: `${app.nameFi} ${app.isActive ? "poistettu käytöstä" : "otettu käyttöön"}`,
      });
    } catch (error) {
      console.error("Error toggling app:", error);
      toast({
        title: "Virhe",
        description: "Sovelluksen tilan muutos epäonnistui",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm("Haluatko varmasti poistaa tämän sovelluksen?")) return;

    try {
      const response = await fetch(`/api/wilma/desktop/apps/${appId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete app");

      setApps(apps.filter(a => a.id !== appId));

      toast({
        title: "Poistettu!",
        description: "Sovellus on poistettu",
      });
    } catch (error) {
      console.error("Error deleting app:", error);
      toast({
        title: "Virhe",
        description: "Sovelluksen poisto epäonnistui",
        variant: "destructive",
      });
    }
  };

  const handleAddApp = async () => {
    if (!newApp.appId || !newApp.name || !newApp.nameFi) {
      toast({
        title: "Virhe",
        description: "Täytä kaikki pakolliset kentät",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/wilma/desktop/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp),
      });

      if (!response.ok) throw new Error("Failed to add app");

      const addedApp = await response.json();
      setApps([...apps, addedApp]);
      setShowAddDialog(false);
      
      // Reset form
      setNewApp({
        appId: "",
        name: "",
        nameFi: "",
        icon: "globe",
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
        sortOrder: apps.length + 2,
      });

      toast({
        title: "Lisätty!",
        description: "Uusi sovellus on lisätty",
      });
    } catch (error) {
      console.error("Error adding app:", error);
      toast({
        title: "Virhe",
        description: "Sovelluksen lisäys epäonnistui",
        variant: "destructive",
      });
    }
  };

  const categories = [
    { value: "all", label: "Kaikki" },
    { value: "utility", label: "Työkalut" },
    { value: "productivity", label: "Tuottavuus" },
    { value: "education", label: "Opetus" },
    { value: "entertainment", label: "Viihde" },
    { value: "games", label: "Pelit" },
    { value: "creativity", label: "Luovuus" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Monitor className="w-8 h-8 text-[#003d82]" />
                Työpöytä-hallinta
              </h1>
              <p className="text-gray-600 mt-1">Hallinnoi työpöytäsovelluksia ja asetuksia</p>
            </div>
            <Button
              onClick={() => {
                const storedUser = localStorage.getItem('wilma_user');
                if (storedUser) {
                  const user = JSON.parse(storedUser);
                  setLocation(`/wilma-admin/${user.id}`);
                }
              }}
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Sulje
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sovelluksia yhteensä</p>
                    <p className="text-2xl font-bold text-gray-900">{apps.length}</p>
                  </div>
                  <Grid className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aktiivisia</p>
                    <p className="text-2xl font-bold text-green-600">
                      {apps.filter(a => a.isActive).length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pois käytöstä</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {apps.filter(a => !a.isActive).length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Kategorioita</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {new Set(apps.map(a => a.category)).size}
                    </p>
                  </div>
                  <Filter className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="apps" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="apps">
              <Grid className="w-4 h-4 mr-2" />
              Sovellukset
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Asetukset
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-2" />
              Ulkoasu
            </TabsTrigger>
          </TabsList>

          {/* Apps Tab */}
          <TabsContent value="apps" className="space-y-4">
            {/* Search and Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Etsi sovelluksia..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-48">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => fetchApps()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Päivitä
                  </Button>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Lisää sovellus
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Apps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map(app => (
                <Card key={app.id} className={`${!app.isActive && 'opacity-60'}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{app.nameFi}</p>
                          <p className="text-xs text-gray-500 font-normal">{app.category}</p>
                        </div>
                      </span>
                      <Switch
                        checked={app.isActive}
                        onCheckedChange={() => handleToggleApp(app.id!)}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{app.descriptionFi}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">{app.appType}</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">{app.width}x{app.height}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingApp(app)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Muokkaa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteApp(app.id!)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredApps.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Ei sovelluksia löytynyt</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Yleiset asetukset</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Työpöytä käytössä</p>
                    <p className="text-sm text-gray-600">Ota työpöytäympäristö käyttöön kaikille</p>
                  </div>
                  <Switch
                    checked={desktopSettings.enabled}
                    onCheckedChange={(checked) =>
                      setDesktopSettings({ ...desktopSettings, enabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Salli mukautettu taustakuva</p>
                    <p className="text-sm text-gray-600">Käyttäjät voivat vaihtaa taustakuvan</p>
                  </div>
                  <Switch
                    checked={desktopSettings.allowCustomWallpaper}
                    onCheckedChange={(checked) =>
                      setDesktopSettings({ ...desktopSettings, allowCustomWallpaper: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Salli mukautettu teema</p>
                    <p className="text-sm text-gray-600">Käyttäjät voivat vaihtaa teeman</p>
                  </div>
                  <Switch
                    checked={desktopSettings.allowCustomTheme}
                    onCheckedChange={(checked) =>
                      setDesktopSettings({ ...desktopSettings, allowCustomTheme: checked })
                    }
                  />
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveSettings} className="bg-[#003d82] hover:bg-[#0052a3]">
                    <Save className="w-4 h-4 mr-2" />
                    Tallenna asetukset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ulkoasun asetukset</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Oletustaustakuva</Label>
                  <Input
                    value={desktopSettings.defaultWallpaper}
                    onChange={(e) =>
                      setDesktopSettings({ ...desktopSettings, defaultWallpaper: e.target.value })
                    }
                    placeholder="/KSYK-logo-desktop.png"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL tai polku taustakuvaan</p>
                </div>
                <div>
                  <Label>Oletusteema</Label>
                  <select
                    value={desktopSettings.defaultTheme}
                    onChange={(e) =>
                      setDesktopSettings({ ...desktopSettings, defaultTheme: e.target.value })
                    }
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="light">Vaalea</option>
                    <option value="dark">Tumma</option>
                    <option value="auto">Automaattinen</option>
                  </select>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveSettings} className="bg-[#003d82] hover:bg-[#0052a3]">
                    <Save className="w-4 h-4 mr-2" />
                    Tallenna ulkoasu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add App Dialog */}
      {showAddDialog && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowAddDialog(false)}
          />
          
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white p-6 flex items-center justify-between">
              <h3 className="font-bold text-2xl">Lisää uusi sovellus</h3>
              <Button
                onClick={() => setShowAddDialog(false)}
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appId">Sovelluksen ID *</Label>
                  <Input
                    id="appId"
                    value={newApp.appId}
                    onChange={(e) => setNewApp({ ...newApp, appId: e.target.value })}
                    placeholder="esim. my-app"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Ikoni</Label>
                  <select
                    id="icon"
                    value={newApp.icon}
                    onChange={(e) => setNewApp({ ...newApp, icon: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="globe">Globe</option>
                    <option value="calculator">Calculator</option>
                    <option value="notepad">Notepad</option>
                    <option value="music">Music</option>
                    <option value="image">Image</option>
                    <option value="calendar">Calendar</option>
                    <option value="clock">Clock</option>
                    <option value="books">Books</option>
                    <option value="video">Video</option>
                    <option value="code">Code</option>
                    <option value="terminal">Terminal</option>
                    <option value="games">Games</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nimi (EN) *</Label>
                  <Input
                    id="name"
                    value={newApp.name}
                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                    placeholder="App Name"
                  />
                </div>
                <div>
                  <Label htmlFor="nameFi">Nimi (FI) *</Label>
                  <Input
                    id="nameFi"
                    value={newApp.nameFi}
                    onChange={(e) => setNewApp({ ...newApp, nameFi: e.target.value })}
                    placeholder="Sovelluksen nimi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Kuvaus (EN)</Label>
                  <Textarea
                    id="description"
                    value={newApp.description}
                    onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                    placeholder="App description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="descriptionFi">Kuvaus (FI)</Label>
                  <Textarea
                    id="descriptionFi"
                    value={newApp.descriptionFi}
                    onChange={(e) => setNewApp({ ...newApp, descriptionFi: e.target.value })}
                    placeholder="Sovelluksen kuvaus"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kategoria</Label>
                  <select
                    id="category"
                    value={newApp.category}
                    onChange={(e) => setNewApp({ ...newApp, category: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="utility">Työkalut</option>
                    <option value="productivity">Tuottavuus</option>
                    <option value="education">Opetus</option>
                    <option value="entertainment">Viihde</option>
                    <option value="games">Pelit</option>
                    <option value="creativity">Luovuus</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="appType">Tyyppi</Label>
                  <select
                    id="appType"
                    value={newApp.appType}
                    onChange={(e) => setNewApp({ ...newApp, appType: e.target.value as "iframe" | "component" | "external" })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="iframe">IFrame</option>
                    <option value="component">Komponentti</option>
                    <option value="external">Ulkoinen</option>
                  </select>
                </div>
              </div>

              {newApp.appType === "iframe" && (
                <div>
                  <Label htmlFor="appUrl">URL *</Label>
                  <Input
                    id="appUrl"
                    value={newApp.appUrl}
                    onChange={(e) => setNewApp({ ...newApp, appUrl: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Leveys (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={newApp.width}
                    onChange={(e) => setNewApp({ ...newApp, width: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Korkeus (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={newApp.height}
                    onChange={(e) => setNewApp({ ...newApp, height: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newApp.resizable}
                    onCheckedChange={(checked) => setNewApp({ ...newApp, resizable: checked })}
                  />
                  <Label>Koon muutos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newApp.minimizable}
                    onCheckedChange={(checked) => setNewApp({ ...newApp, minimizable: checked })}
                  />
                  <Label>Pienennys</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newApp.maximizable}
                    onCheckedChange={(checked) => setNewApp({ ...newApp, maximizable: checked })}
                  />
                  <Label>Suurennus</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={() => setShowAddDialog(false)}
                  variant="outline"
                >
                  Peruuta
                </Button>
                <Button
                  onClick={handleAddApp}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää sovellus
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
