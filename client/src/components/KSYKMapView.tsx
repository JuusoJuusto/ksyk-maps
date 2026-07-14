/**
 * KSYK Maps — Map placeholder (map temporarily removed).
 *
 * The full Leaflet + OSM map has been removed at the user's request
 * for a clean-slate rebuild. This placeholder keeps the same public
 * API (accepts a `searchQuery` prop, mounts full-height) so callers
 * don't need to be touched. The real map will come back once the
 * rendering / rotation architecture is redesigned.
 */

interface KSYKMapViewProps {
  searchQuery?: string;
}

export default function KSYKMapView(_props: KSYKMapViewProps = {}) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 border-t border-border">
      <div className="text-center p-6 max-w-sm">
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-3">
          KSYK Maps
        </div>
        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground mb-2">
          Map coming soon
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The campus map is being rebuilt. Announcements, lunch menu,
          HSL and settings still work in the meantime.
        </p>
      </div>
    </div>
  );
}
