/**
 * Centralised z-index registry.
 * Import from here instead of hardcoding z-* Tailwind classes so stacking
 * order changes are always one-place edits.
 *
 * Tailwind custom values: use `z-[var(--z-header)]` or the helper strings below.
 * Plain numbers: use in `style={{ zIndex: Z.header }}`.
 */
export const Z = {
  map:        10,   // MapLibre canvas
  mapOverlay: 20,   // floor selector, compass chip
  mapControls:30,   // zoom / 3D / recenter buttons
  infoSheet:  40,   // feature info drawer
  navPanel:   40,   // directions panel
  dropdown:   50,   // search results dropdown
  header:     60,   // top header bar
  mobileMenu: 70,   // hamburger slide-out drawer
  toast:      80,   // toasts / snackbars
  modal:      90,   // admin modals / dialogs
  errorBoundary: 100,
} as const;

export type ZKey = keyof typeof Z;
