/**
 * Builder: switch between campus maps, create a new one, and publish.
 *
 * Visitors and the apps see the PUBLISHED map. Editing any other map is safe:
 * nothing in it is visible to the public until "Make this map live".
 * Switching reloads the builder so selection, undo history and autosave start
 * clean for the chosen map.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map as MapIcon, ChevronDown, Check, Plus, Pencil, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getBuilderMapId, setBuilderMapId } from "@/lib/builderMap";
import { cn } from "@/lib/utils";

interface MapMeta { id: string; name: string; publishedAt?: string | null }
interface MapsState { published: string; maps: MapMeta[] }

export default function MapSwitcher() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery<MapsState>({ queryKey: ["/api/maps"], staleTime: 15_000 });
  const [dialog, setDialog] = useState<null | "new" | "rename">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  if (!data || !Array.isArray(data.maps) || data.maps.length === 0) return null;

  const stored = getBuilderMapId();
  const current = data.maps.find((m) => m.id === stored) ?? data.maps.find((m) => m.id === data.published) ?? data.maps[0];
  const isLive = current.id === data.published;

  const run = async (fn: () => Promise<void>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^\d+:\s*/, "") : String(e);
      toast({ title: failTitle, description: msg.slice(0, 200), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (id: string) => {
    if (id === current.id) return;
    setBuilderMapId(id);
    window.location.reload();
  };

  const create = () => run(async () => {
    const res = await apiRequest("POST", "/api/maps", { name });
    const meta = (await res.json()) as MapMeta;
    setBuilderMapId(meta.id);
    window.location.reload();
  }, "Could not create the map");

  const rename = () => run(async () => {
    await apiRequest("PATCH", `/api/maps/${current.id}`, { name });
    await qc.invalidateQueries({ queryKey: ["/api/maps"] });
    setDialog(null);
  }, "Could not rename the map");

  const publish = () => run(async () => {
    await apiRequest("POST", `/api/maps/${current.id}/publish`);
    await qc.invalidateQueries({ queryKey: ["/api/maps"] });
    toast({ title: `"${current.name}" is now live`, description: "Visitors and the apps see this map within a couple of minutes." });
    setConfirmPublish(false);
  }, "Could not publish the map");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 h-8 pl-2 pr-1.5 rounded-md border text-[12px] font-semibold max-w-[220px]",
              isLive
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
            )}
            title={isLive ? "This is the map visitors see" : "Draft: visitors do not see this map yet"}
            data-testid="map-switcher"
          >
            <MapIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{current.name}</span>
            <span className="text-[9px] font-bold tracking-wider uppercase opacity-80 shrink-0">{isLive ? "Live" : "Draft"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Campus maps</DropdownMenuLabel>
          {data.maps.map((m) => (
            <DropdownMenuItem key={m.id} onSelect={() => switchTo(m.id)} className="gap-2">
              <Check className={cn("h-3.5 w-3.5", m.id === current.id ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{m.name}</span>
              {m.id === data.published && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Live</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setName(""); setDialog("new"); }} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New empty map…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { setName(current.name); setDialog("rename"); }} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Rename this map…
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLive} onSelect={() => setConfirmPublish(true)} className="gap-2">
            <Rocket className="h-3.5 w-3.5" /> {isLive ? "This map is live" : "Make this map live…"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !busy) setDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "new" ? "New map" : "Rename map"}</DialogTitle>
            <DialogDescription>
              {dialog === "new"
                ? "Starts empty and stays hidden from visitors until you make it live. Your current map is not touched."
                : "The name is only shown in the builder."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            maxLength={60}
            placeholder="e.g. New wing"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && !busy) void (dialog === "new" ? create() : rename()); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void (dialog === "new" ? create() : rename())} disabled={busy || !name.trim()}>
              {dialog === "new" ? "Create and open" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make "{current.name}" the live map?</AlertDialogTitle>
            <AlertDialogDescription>
              Visitors and the apps will see this map instead of the current live map
              ({data.maps.find((m) => m.id === data.published)?.name ?? "current"}) within a couple of minutes.
              The current map is kept and can be made live again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void publish(); }}>
              Make live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
