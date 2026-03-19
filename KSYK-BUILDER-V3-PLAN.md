# 🏗️ KSYK Builder v3.0 - Comprehensive Improvement Plan

## 🎯 USER REQUIREMENTS

### Current Issues:
1. No campus boundary/outline drawing
2. Building codes not clearly managed
3. Room numbering system needs building prefix integration
4. Mouse calibration issues
5. Need better visual feedback

### Requested Features:
1. **Campus Outline Tool**: Draw the whole school boundary first
2. **Building Code System**: Buildings identified by letters (A, M, U, K, L, R, etc.)
3. **Room Numbering**: Rooms automatically prefixed with building code (A-101, U-205, M-12)
4. **Better Mouse Calibration**: Accurate click-to-place system
5. **Visual Improvements**: Better UI, clearer tools, better feedback

## 📋 IMPLEMENTATION PLAN

### Phase 1: Campus Boundary Tool
- [ ] Add "Draw Campus Outline" tool
- [ ] Polygon drawing with click-to-add-point
- [ ] Visual boundary with dashed line
- [ ] Ability to close polygon
- [ ] Edit/move boundary points
- [ ] Save boundary as campus shape

### Phase 2: Enhanced Building Management
- [ ] Building code input (single letter: A, M, U, K, L, R)
- [ ] Building color picker
- [ ] Building outline drawing (polygon)
- [ ] Building position on campus
- [ ] Visual building labels on map
- [ ] Building list sidebar

### Phase 3: Smart Room System
- [ ] Auto-prefix room numbers with building code
- [ ] Room number format: `{BuildingCode}-{RoomNumber}` (e.g., A-101, U-205)
- [ ] Validation: Ensure room number format is correct
- [ ] Room placement within building boundaries
- [ ] Visual room labels with building code
- [ ] Room type icons

### Phase 4: Improved Mouse/Drawing System
- [ ] Fix SVG coordinate transformation
- [ ] Accurate click-to-place
- [ ] Snap-to-grid with visual feedback
- [ ] Hover preview before placing
- [ ] Drag-to-move placed items
- [ ] Resize handles for rooms

### Phase 5: UI/UX Improvements
- [ ] Tool palette with icons
- [ ] Layer system (Campus → Buildings → Rooms)
- [ ] Zoom controls with minimap
- [ ] Undo/Redo stack
- [ ] Save/Load progress
- [ ] Export to database
- [ ] Visual feedback for all actions

## 🎨 NEW UI LAYOUT

```
┌─────────────────────────────────────────────────────────────┐
│  KSYK Builder v3.0                    [Save] [Export] [Help] │
├─────────────────────────────────────────────────────────────┤
│ Tools:                                                        │
│ [🗺️ Campus] [🏢 Building] [🚪 Room] [✏️ Edit] [🗑️ Delete]   │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                    │
│ Sidebar  │           Main Canvas                             │
│          │                                                    │
│ Campus:  │     [Interactive SVG Map]                         │
│ ☑ Drawn  │                                                    │
│          │     • Campus outline (dashed)                     │
│ Buildings│     • Buildings (colored polygons)                │
│ • A      │     • Rooms (rectangles with labels)              │
│ • M      │                                                    │
│ • U      │                                                    │
│          │                                                    │
│ Rooms:   │                                                    │
│ 45 total │                                                    │
│          │                                                    │
│ [+ Add]  │                                                    │
│          │                                                    │
└──────────┴──────────────────────────────────────────────────┘
```

## 🔧 TECHNICAL IMPROVEMENTS

### 1. Campus Boundary System
```typescript
interface CampusBoundary {
  points: Point[];
  closed: boolean;
  color: string;
  name: string;
}
```

### 2. Building System
```typescript
interface BuildingData {
  code: string;        // Single letter: A, M, U, K, L, R
  name: string;        // Full name: "Main Building"
  nameEn: string;
  nameFi: string;
  color: string;       // Hex color
  outline: Point[];    // Polygon points
  floors: number;
  rooms: RoomData[];
}
```

### 3. Room System
```typescript
interface RoomData {
  buildingCode: string;     // A, M, U, etc.
  roomNumber: string;       // Full: "A-101" or just "101"
  displayNumber: string;    // Always "A-101" format
  name: string;
  floor: number;
  type: RoomType;
  position: Point;
  size: { width: number; height: number };
}
```

### 4. Coordinate System Fix
```typescript
// Proper SVG coordinate transformation
const getSVGPoint = (e: MouseEvent): Point => {
  const svg = svgRef.current;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
  return snapToGrid({ x: svgP.x, y: svgP.y });
};
```

## 📊 DATA FLOW

### 1. Campus Creation
```
User clicks "Draw Campus" 
→ Click points on canvas
→ Close polygon
→ Save campus boundary
→ Enable building tools
```

### 2. Building Creation
```
User clicks "Add Building"
→ Enter building code (A, M, U, etc.)
→ Choose color
→ Draw building outline
→ Save building
→ Enable room tools for this building
```

### 3. Room Creation
```
User selects building (A)
→ Clicks "Add Room"
→ Enter room number (101)
→ System creates "A-101"
→ Click to place on map
→ Room appears with label "A-101"
→ Save to database
```

## 🎯 SUCCESS CRITERIA

- [ ] Can draw campus outline easily
- [ ] Can create buildings with codes (A, M, U, etc.)
- [ ] Rooms automatically get building prefix (A-101, M-12)
- [ ] Mouse clicks are accurate
- [ ] Visual feedback is clear
- [ ] Can save and export to database
- [ ] Buildings show on main campus map
- [ ] Rooms are searchable by full code (A-101)

## 🚀 NEXT STEPS

1. Implement campus boundary tool
2. Enhance building management with codes
3. Update room system with auto-prefixing
4. Fix mouse calibration
5. Improve UI/UX
6. Test and refine
7. Deploy

---

**Status**: Planning Complete
**Priority**: High
**Estimated Time**: 2-3 hours of development
**Impact**: Major improvement to builder usability
