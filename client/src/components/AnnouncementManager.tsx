import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAdminHeaders } from "@/lib/adminAuth";
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
  Info,
  Clock,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import posthog from "@/lib/posthog";

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
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
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

  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
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
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        // v4.7.46 — surface real server error to the toast instead of a
        // generic message, since the server now returns Zod issues on 400.
        const err = await response.json().catch(() => ({}));
        const issues = Array.isArray(err?.issues)
          ? err.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join("; ")
          : "";
        throw new Error(err?.message ? `${err.message}${issues ? ` — ${issues}` : ""}` : "Failed to create announcement");
      }
      return response.json();
    },
    onSuccess: () => {
      posthog.capture("announcement_created", { priority: formData.priority });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement created" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create announcement", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const issues = Array.isArray(err?.issues)
          ? err.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join("; ")
          : "";
        throw new Error(err?.message ? `${err.message}${issues ? ` — ${issues}` : ""}` : "Failed to update announcement");
      }
      return response.json();
    },
    onSuccess: () => {
      posthog.capture("announcement_updated", { priority: formData.priority });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement updated" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update announcement", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: { ...getAdminHeaders() },
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
    },
    onSuccess: () => {
      posthog.capture("announcement_deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete announcement", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setFormData({
      title: "",
      titleEn: "",
      titleFi: "",
      content: "",
      contentEn: "",
      contentFi: "",
      priority: "normal",
      isActive: true,
      publishedAt: localDateTime,
      expiresAt: ""
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // v4.7.46 — server does the heavy lifting via `normalizeAnnouncementBody`:
    // strips phantom fields, coerces `expiresAt` ISO string → Date, drops
    // `authorId` (was tripping the FK to `staff.id` for owner accounts).
    // The client just sends the form state as-is.
    if (!formData.titleFi && !formData.titleEn) {
      toast({ title: "Title required", description: "Enter a Finnish or English title.", variant: "destructive" });
      return;
    }
    if (!formData.contentFi && !formData.contentEn) {
      toast({ title: "Content required", description: "Enter Finnish or English content.", variant: "destructive" });
      return;
    }
    const dataToSubmit = {
      title: formData.titleFi || formData.titleEn,
      titleEn: formData.titleEn,
      titleFi: formData.titleFi,
      content: formData.contentFi || formData.contentEn,
      contentEn: formData.contentEn,
      contentFi: formData.contentFi,
      priority: formData.priority,
      isActive: formData.isActive,
      expiresAt: formData.expiresAt,
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
        return "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";
      case "high":
        return "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      case "normal":
        return "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Info className="h-4 w-4" />;
  };

  const selectClass = cn(
    "w-full p-2 border rounded-md text-sm",
    "bg-white dark:bg-gray-800",
    "text-gray-900 dark:text-gray-100",
    "border-gray-300 dark:border-gray-600",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
  );

  return (
    <div className="space-y-5">
      {/* Wilma masthead + primary action */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
            Content
          </p>
          <h2 className="text-[18px] font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
            Announcements
          </h2>
        </div>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="h-10 px-3.5 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            New announcement
          </button>
        )}
      </div>

      {/* Create/Edit form — Wilma document card */}
      {isCreating && (
        <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 overflow-hidden">
          <div className="border-b border-[#d5dae0] dark:border-[#2a3040] px-5 py-3 flex items-center justify-between bg-[#f5f6f8] dark:bg-[#12161f]">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9]">
                {editingId ? "Editing" : "New"}
              </p>
              <p className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5">
                {editingId ? "Edit announcement" : "New announcement"}
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="h-8 w-8 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titleFi" className="text-gray-700 dark:text-gray-300">Title (FI) *</Label>
                  <Input
                    id="titleFi"
                    value={formData.titleFi}
                    onChange={(e) => setFormData({ ...formData, titleFi: e.target.value })}
                    placeholder="Suomenkielinen otsikko"
                  />
                </div>
                <div>
                  <Label htmlFor="titleEn" className="text-gray-700 dark:text-gray-300">Title (EN)</Label>
                  <Input
                    id="titleEn"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    placeholder="English title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="contentFi" className="text-gray-700 dark:text-gray-300">Content (FI) *</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const textarea = document.getElementById('contentFi') as HTMLTextAreaElement;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = formData.contentFi;
                          const before = text.substring(0, start);
                          const selected = text.substring(start, end);
                          const after = text.substring(end);
                          setFormData({ ...formData, contentFi: before + '• ' + selected + after });
                          setTimeout(() => textarea.focus(), 0);
                        }}
                        title="Add bullet point"
                      >
                        • Bullet
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const textarea = document.getElementById('contentFi') as HTMLTextAreaElement;
                          const start = textarea.selectionStart;
                          const text = formData.contentFi;
                          const before = text.substring(0, start);
                          const after = text.substring(start);
                          setFormData({ ...formData, contentFi: before + '\n---\n' + after });
                          setTimeout(() => textarea.focus(), 0);
                        }}
                        title="Add horizontal line"
                      >
                        ─ Line
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="contentFi"
                    value={formData.contentFi}
                    onChange={(e) => setFormData({ ...formData, contentFi: e.target.value })}
                    placeholder="Suomenkielinen sisältö"
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="contentEn" className="text-gray-700 dark:text-gray-300">Content (EN)</Label>
                  <Textarea
                    id="contentEn"
                    value={formData.contentEn}
                    onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                    placeholder="English content"
                    rows={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority" className="text-gray-700 dark:text-gray-300">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={selectClass}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="isActive" className="text-gray-700 dark:text-gray-300">Status</Label>
                  <select
                    id="isActive"
                    value={formData.isActive ? "active" : "inactive"}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                    className={selectClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="publishedAt" className="text-gray-700 dark:text-gray-300">Publish Date & Time *</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">When to publish this announcement</p>
                </div>

                <div>
                  <Label htmlFor="expiresAt" className="text-gray-700 dark:text-gray-300">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty for no expiry</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
          </div>
        </div>
      )}

      {/* Announcements list — Wilma document card */}
      <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 overflow-hidden">
        <div className="border-b border-[#d5dae0] dark:border-[#2a3040] px-5 py-3 bg-[#f5f6f8] dark:bg-[#12161f]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
                List
              </p>
              <p className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5">
                All announcements
              </p>
            </div>
            <span className="inline-flex items-center h-6 px-2 rounded-[4px] text-[11px] font-bold tabular-nums border border-[#d5dae0] dark:border-[#2a3040] text-gray-700 dark:text-gray-300">
              {announcements.length}
            </span>
          </div>
        </div>
        <div className="p-5">
          {isLoadingAnnouncements ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No announcements yet</p>
              <p className="text-sm">Create your first announcement to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement: Announcement) => (
                <div
                  key={announcement.id}
                  className={cn(
                    "p-4 border rounded-lg transition-colors",
                    announcement.isActive
                      ? darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                      : darkMode ? "bg-gray-850 border-gray-700/60 opacity-75" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                        <span className={cn(
                          announcement.priority === "urgent" || announcement.priority === "high"
                            ? "text-orange-500 dark:text-orange-400"
                            : "text-blue-500 dark:text-blue-400"
                        )}>
                          {getPriorityIcon(announcement.priority)}
                        </span>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{announcement.title}</h3>
                        <Badge className={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant={announcement.isActive ? "default" : "secondary"}>
                          {announcement.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm">{announcement.content}</p>
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Created {(() => {
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
                          <span className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1">
                            <Megaphone className="h-3.5 w-3.5 shrink-0" />
                            Published {(() => {
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
                          <span className="text-orange-600 dark:text-orange-400 font-semibold inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Expires {(() => {
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
                    <div className="flex items-center space-x-2 ml-4 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
