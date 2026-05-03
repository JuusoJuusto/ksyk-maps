import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Save,
  X,
  Monitor,
} from "lucide-react";

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

export default function DesktopAppManager() {
  const { toast } = useToast();
  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<DesktopApp> | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await fetch("/api/wilma/desktop/apps");
      if (res.ok) {
        const data = await res.json();
        setApps(data.sort((a: DesktopApp, b: DesktopApp) => a.sortOrder - b.sortOrder));
      }
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApp = async () => {
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

      if (res.ok) {
        toast({
          title: "Tallennettu",
          description: "Sovellus tallennettu onnistuneesti",
        });
        setEditDialogOpen(false);
        setEditingApp(null);
        fetchApps();
      }
    } catch (error) {
      toast({
        title: "Virhe",
        description: "Sovelluksen tallennus epäonnistui",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApp = async (appId: number) => {
    if (!confirm("Haluatko varmasti poistaa tämän sovelluksen?")) return;

    try {
      const res = await fetch(`/api/wilma/desktop/apps/${appId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Poistettu",
          description: "Sovellus poistettu onnistuneesti",
        });
        fetchApps();
      }
    } catch (error) {
      toast({
        title: "Virhe",
        description: "Sovelluksen poisto epäonnistui",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newApps = [...apps];
    const draggedApp = newApps[draggedIndex];
    newApps.splice(draggedIndex, 1);
    newApps.splice(index, 0, draggedApp);

    // Update sort orders
    newApps.forEach((app, idx) => {
      app.sortOrder = idx + 1;
    });

    setApps(newApps);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    
    // Save new order to backend
    try {
      for (const app of apps) {
        await fetch(`/api/wilma/desktop/apps/${app.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: app.sortOrder }),
        });
      }
      toast({
        title: "Järjestys tallennettu",
        description: "Sovellusten järjestys päivitetty",
      });
    } catch (error) {
      toast({
        title: "Virhe",
        description: "Järjestyksen tallennus epäonnistui",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (app?: DesktopApp) => {
    if (app) {
      setEditingApp(app);
    } else {
      setEditingApp({
        appId: "",
        name: "",
        nameFi: "",
        icon: "calculator",
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
    }
    setEditDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Ladataan...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Työpöytäsovellusten hallinta</h2>
          <p className="text-gray-600 mt-1">Hallitse työpöydän sovelluksia</p>
        </div>
        <Button
          onClick={() => openEditDialog()}
          className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Lisää sovellus
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-white border-b">
          <CardTitle className="flex items-center gap-2 text-[#003d82]">
            <Monitor className="w-5 h-5" />
            Sovellukset ({apps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            {apps.map((app, index) => (
              <div
                key={app.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-move ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <GripVertical className="w-5 h-5 text-gray-400" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{app.nameFi || app.name}</h3>
                    {!app.isActive && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                        Ei aktiivinen
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{app.descriptionFi || app.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Tyyppi: {app.appType}</span>
                    <span>Kategoria: {app.category}</span>
                    <span>Koko: {app.width}x{app.height}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openEditDialog(app)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Muokkaa
                  </Button>
                  <Button
                    onClick={() => app.id && handleDeleteApp(app.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {apps.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Ei sovelluksia. Lisää ensimmäinen sovellus.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingApp?.id ? "Muokkaa sovellusta" : "Lisää uusi sovellus"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appId">Sovellus ID</Label>
                <Input
                  id="appId"
                  value={editingApp?.appId || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, appId: e.target.value })
                  }
                  placeholder="calculator"
                />
              </div>
              <div>
                <Label htmlFor="icon">Ikoni</Label>
                <Input
                  id="icon"
                  value={editingApp?.icon || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, icon: e.target.value })
                  }
                  placeholder="calculator"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nimi (EN)</Label>
                <Input
                  id="name"
                  value={editingApp?.name || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="nameFi">Nimi (FI)</Label>
                <Input
                  id="nameFi"
                  value={editingApp?.nameFi || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, nameFi: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Kuvaus (EN)</Label>
              <Textarea
                id="description"
                value={editingApp?.description || ""}
                onChange={(e) =>
                  setEditingApp({ ...editingApp, description: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="descriptionFi">Kuvaus (FI)</Label>
              <Textarea
                id="descriptionFi"
                value={editingApp?.descriptionFi || ""}
                onChange={(e) =>
                  setEditingApp({ ...editingApp, descriptionFi: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Kategoria</Label>
                <select
                  id="category"
                  value={editingApp?.category || "utility"}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, category: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="utility">Utility</option>
                  <option value="productivity">Productivity</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="education">Education</option>
                  <option value="creativity">Creativity</option>
                  <option value="games">Games</option>
                </select>
              </div>
              <div>
                <Label htmlFor="appType">Tyyppi</Label>
                <select
                  id="appType"
                  value={editingApp?.appType || "iframe"}
                  onChange={(e) =>
                    setEditingApp({
                      ...editingApp,
                      appType: e.target.value as "iframe" | "component" | "external",
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="iframe">IFrame</option>
                  <option value="component">Component</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

            {editingApp?.appType === "iframe" && (
              <div>
                <Label htmlFor="appUrl">URL</Label>
                <Input
                  id="appUrl"
                  value={editingApp?.appUrl || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, appUrl: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
            )}

            {editingApp?.appType === "component" && (
              <div>
                <Label htmlFor="componentName">Komponentin nimi</Label>
                <Input
                  id="componentName"
                  value={editingApp?.componentName || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, componentName: e.target.value })
                  }
                  placeholder="CalendarApp"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Leveys (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={editingApp?.width || 800}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, width: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="height">Korkeus (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={editingApp?.height || 600}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, height: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Muokattava koko</Label>
                <Switch
                  checked={editingApp?.resizable || false}
                  onCheckedChange={(checked) =>
                    setEditingApp({ ...editingApp, resizable: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pienennettävä</Label>
                <Switch
                  checked={editingApp?.minimizable || false}
                  onCheckedChange={(checked) =>
                    setEditingApp({ ...editingApp, minimizable: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Suurennettava</Label>
                <Switch
                  checked={editingApp?.maximizable || false}
                  onCheckedChange={(checked) =>
                    setEditingApp({ ...editingApp, maximizable: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktiivinen</Label>
                <Switch
                  checked={editingApp?.isActive || false}
                  onCheckedChange={(checked) =>
                    setEditingApp({ ...editingApp, isActive: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingApp(null);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Peruuta
            </Button>
            <Button
              onClick={handleSaveApp}
              className="bg-[#003d82] hover:bg-[#0052a3]"
            >
              <Save className="w-4 h-4 mr-2" />
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
