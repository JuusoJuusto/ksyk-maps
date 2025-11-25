import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit, 
  Save,
  X,
  AlertTriangle,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
  publishedAt?: string;
  expiresAt?: string;
  isActive: boolean;
}

export default function AnnouncementManager() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    titleEn: "",
    titleFi: "",
    content: "",
    contentEn: "",
    contentFi: "",
    priority: "normal",
    isActive: true,
    publishedAt: new Date().toISOString().slice(0, 16),
    expiresAt: ""
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=50");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      titleEn: "",
      titleFi: "",
      content: "",
      contentEn: "",
      contentFi: "",
      priority: "normal",
      isActive: true,
      publishedAt: new Date().toISOString().slice(0, 16),
      expiresAt: ""
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get current user from localStorage
    const storedUser = localStorage.getItem('ksyk_admin_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    
    const dataToSubmit = {
      ...formData,
      authorId: currentUser?.id || 'owner-admin-user',
      isActive: true
    };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (announcement: any) => {
    setFormData({
      title: announcement.title || "",
      titleEn: announcement.titleEn || "",
      titleFi: announcement.titleFi || "",
      content: announcement.content || "",
      contentEn: announcement.contentEn || "",
      contentFi: announcement.contentFi || "",
      priority: announcement.priority,
      isActive: announcement.isActive,
      publishedAt: announcement.publishedAt || new Date().toISOString().slice(0, 16),
      expiresAt: announcement.expiresAt || ""
    });
    setEditingId(announcement.id);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      deleteMutation.mutate(id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Info className="h-4 w-4" />;
  };

  // All announcements are deletable
  const permanentCount = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcement Management</h2>
          <p className="text-gray-600">Create and manage campus announcements</p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="shadow-lg border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Megaphone className="h-5 w-5 mr-2" />
                {editingId ? "Edit Announcement" : "Create New Announcement"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title (Default) *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titleEn">Title (English)</Label>
                  <Input
                    id="titleEn"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    placeholder="English title"
                  />
                </div>
                <div>
                  <Label htmlFor="titleFi">Title (Finnish)</Label>
                  <Input
                    id="titleFi"
                    value={formData.titleFi}
                    onChange={(e) => setFormData({ ...formData, titleFi: e.target.value })}
                    placeholder="Suomenkielinen otsikko"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="content">Content (Default) *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Announcement content"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contentEn">Content (English)</Label>
                  <Textarea
                    id="contentEn"
                    value={formData.contentEn}
                    onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                    placeholder="English content"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="contentFi">Content (Finnish)</Label>
                  <Textarea
                    id="contentFi"
                    value={formData.contentFi}
                    onChange={(e) => setFormData({ ...formData, contentFi: e.target.value })}
                    placeholder="Suomenkielinen sisältö"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="isActive">Status</Label>
                  <select
                    id="isActive"
                    value={formData.isActive ? "active" : "inactive"}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="publishedAt">Publish Date & Time *</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">When to publish this announcement</p>
                </div>

                <div>
                  <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? "Update" : "Create"} Announcement
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gray-800 text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Megaphone className="h-5 w-5 mr-2" />
              All Announcements ({announcements.length})
            </span>
            <Badge variant="secondary">
              {announcements.length} Total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No announcements yet</p>
              <p className="text-sm">Create your first announcement to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement: Announcement) => {
                const isPermanent = false;
                
                return (
                  <div
                    key={announcement.id}
                    className={`p-4 border rounded-lg ${
                      announcement.isActive ? 'bg-white' : 'bg-gray-50'
                    } ${isPermanent ? 'border-yellow-300 bg-yellow-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getPriorityIcon(announcement.priority)}
                          <h3 className="font-bold text-lg">{announcement.title}</h3>
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          <Badge variant={announcement.isActive ? "default" : "secondary"}>
                            {announcement.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {isPermanent && (
                            <Badge className="bg-yellow-200 text-yellow-800">
                              Permanent
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{announcement.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            📅 Created {(() => {
                              try {
                                const timestamp = announcement.createdAt;
                                if (!timestamp) return 'recently';
                                
                                let date: Date;
                                if (typeof timestamp === 'object' && (timestamp as any)._seconds) {
                                  date = new Date((timestamp as any)._seconds * 1000);
                                } else {
                                  date = new Date(timestamp);
                                }
                                
                                if (isNaN(date.getTime())) return 'recently';
                                return formatDistanceToNow(date, { addSuffix: true });
                              } catch {
                                return 'recently';
                              }
                            })()}
                          </span>
                          {announcement.publishedAt && (
                            <span className="text-blue-600 font-semibold">
                              📢 Published {(() => {
                                try {
                                  const timestamp = announcement.publishedAt;
                                  let date: Date;
                                  
                                  if (typeof timestamp === 'object' && (timestamp as any)._seconds) {
                                    date = new Date((timestamp as any)._seconds * 1000);
                                  } else {
                                    date = new Date(timestamp);
                                  }
                                  
                                  if (isNaN(date.getTime())) return 'now';
                                  return formatDistanceToNow(date, { addSuffix: true });
                                } catch {
                                  return 'now';
                                }
                              })()}
                            </span>
                          )}
                          {announcement.expiresAt && (
                            <span className="text-orange-600 font-semibold">
                              ⏰ Expires {(() => {
                                try {
                                  const timestamp = announcement.expiresAt;
                                  let date: Date;
                                  
                                  if (typeof timestamp === 'object' && (timestamp as any)._seconds) {
                                    date = new Date((timestamp as any)._seconds * 1000);
                                  } else {
                                    date = new Date(timestamp);
                                  }
                                  
                                  if (isNaN(date.getTime())) return 'soon';
                                  return formatDistanceToNow(date, { addSuffix: true });
                                } catch {
                                  return 'soon';
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!isPermanent && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(announcement.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
