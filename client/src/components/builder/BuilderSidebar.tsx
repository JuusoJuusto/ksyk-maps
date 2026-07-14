/**
 * KSYK Maps Builder — 280 px scrollable left sidebar.
 *
 * Three collapsible sections stacked vertically:
 *   1. Tools     — <BuilderToolbar>
 *   2. Directory — <BuilderDirectory>
 *   3. Map defaults — embed of <MapSettingsPanel showPublish />
 *
 * Each section header uses the editorial section-label pattern
 * (10px, 0.18em tracking, uppercase muted). Sections remember their
 * open/closed state in memory for the life of the page.
 */
import { useState } from "react";
import { ChevronDown, Compass, Layers, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import BuilderToolbar from "./BuilderToolbar";
import BuilderDirectory from "./BuilderDirectory";
import type { BuilderTool } from "./BuilderToolbar";
import type { Building, Room } from "@shared/schema";

interface BuilderSidebarProps {
  activeTool: BuilderTool;
  onToolChange: (t: BuilderTool) => void;
  onDelete: () => void;
  onFitCampus: () => void;
  hasSelection: boolean;
  buildings: Building[];
  rooms: Room[];
  selectedId: string | null;
  onSelectBuilding: (b: Building) => void;
  onSelectRoom: (r: Room) => void;
}

export default function BuilderSidebar(props: BuilderSidebarProps) {
  const [openTools, setOpenTools] = useState(true);
  const [openDirectory, setOpenDirectory] = useState(true);
  const [openMapDefaults, setOpenMapDefaults] = useState(false);

  return (
    <aside
      className="w-[280px] shrink-0 h-full overflow-y-auto bg-card border-r border-border"
      aria-label="Builder tools and directory"
    >
      <div className="p-3 space-y-3">
        <Section
          label="Tools"
          Icon={Wrench}
          open={openTools}
          onToggle={() => setOpenTools((v) => !v)}
        >
          <BuilderToolbar
            activeTool={props.activeTool}
            onToolChange={props.onToolChange}
            onDelete={props.onDelete}
            onFitCampus={props.onFitCampus}
            hasSelection={props.hasSelection}
          />
        </Section>

        <Section
          label="Directory"
          Icon={Layers}
          open={openDirectory}
          onToggle={() => setOpenDirectory((v) => !v)}
          badge={`${props.buildings.length} ${props.buildings.length === 1 ? "bldg" : "bldgs"}`}
        >
          <BuilderDirectory
            buildings={props.buildings}
            rooms={props.rooms}
            selectedId={props.selectedId}
            onSelectBuilding={props.onSelectBuilding}
            onSelectRoom={props.onSelectRoom}
          />
        </Section>

        <Section
          label="Map defaults"
          Icon={Compass}
          open={openMapDefaults}
          onToggle={() => setOpenMapDefaults((v) => !v)}
        >
          {/* variant="embed" strips the outer Card chrome — the section header
              already frames it. showPublish is on so admins can flush globals
              without leaving the builder. */}
          <div className="-mx-2">
            <MapSettingsPanel variant="embed" showPublish />
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  label,
  Icon,
  open,
  onToggle,
  badge,
  children,
}: {
  label: string;
  Icon: typeof Wrench;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full h-11 px-3 flex items-center gap-2 hover:bg-muted/60 transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.2} />
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
          {label}
        </span>
        {badge && (
          <span className="ml-1 text-[10px] font-mono font-semibold tabular-nums text-muted-foreground/70">
            · {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="p-3 pt-1.5 border-t border-border">
          {children}
        </div>
      )}
    </section>
  );
}
