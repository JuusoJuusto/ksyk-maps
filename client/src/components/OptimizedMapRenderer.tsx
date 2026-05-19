/**
 * KSYK Maps - Optimized Map Renderer
 * Features: Viewport culling, memoization, 60fps rendering
 */

import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  nameFi?: string;
  floor: number;
  type: string;
  buildingId: string;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
  colorCode?: string;
  isAccessible?: boolean;
}

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  colorCode: string;
  mapPositionX?: number;
  mapPositionY?: number;
}

interface OptimizedMapRendererProps {
  rooms: Room[];
  buildings: Building[];
  selectedFloor: number;
  selectedRoom: Room | null;
  navigationPath?: Room[];
  zoom: number;
  panX: number;
  panY: number;
  viewportWidth: number;
  viewportHeight: number;
  onRoomClick?: (room: Room) => void;
  language?: 'fi' | 'en';
  darkMode?: boolean;
}

/**
 * Memoized Room Component - Only re-renders when props change
 */
const RoomElement = memo(({
  room,
  isSelected,
  isInPath,
  onClick,
  language,
  darkMode
}: {
  room: Room;
  isSelected: boolean;
  isInPath: boolean;
  onClick?: () => void;
  language: 'fi' | 'en';
  darkMode: boolean;
}) => {
  const x = room.mapPositionX || 0;
  const y = room.mapPositionY || 0;
  const width = room.width || 60;
  const height = room.height || 50;
  
  const roomColor = useMemo(() => {
    if (isSelected) return '#10B981'; // Green
    if (isInPath) return '#F59E0B'; // Orange
    
    const typeColors: Record<string, string> = {
      classroom: '#3B82F6',
      lab: '#10B981',
      office: '#F59E0B',
      library: '#8B5CF6',
      gymnasium: '#EF4444',
      cafeteria: '#EC4899',
      toilet: '#6B7280',
      stairway: '#DC2626',
      elevator: '#7C3AED',
      hallway: '#9CA3AF'
    };
    
    return room.colorCode || typeColors[room.type] || '#6B7280';
  }, [room.type, room.colorCode, isSelected, isInPath]);

  const displayName = language === 'fi' ? (room.nameFi || room.name) : (room.nameEn || room.name);

  return (
    <g
      onClick={onClick}
      className="cursor-pointer transition-opacity hover:opacity-80"
      role="button"
      aria-label={`Room ${room.roomNumber}: ${displayName}`}
      tabIndex={0}
    >
      {/* Room rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={roomColor}
        stroke={isSelected ? '#FFFFFF' : darkMode ? '#374151' : '#E5E7EB'}
        strokeWidth={isSelected ? 3 : 1}
        rx={4}
        className="transition-all duration-200"
      />
      
      {/* Room number */}
      <text
        x={x + width / 2}
        y={y + height / 2 - 5}
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
        className="pointer-events-none select-none"
      >
        {room.roomNumber}
      </text>
      
      {/* Room name (if space allows) */}
      {width > 50 && height > 40 && displayName && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="white"
          fontSize="9"
          className="pointer-events-none select-none"
        >
          {displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName}
        </text>
      )}
      
      {/* Accessibility icon */}
      {room.isAccessible && width > 40 && (
        <circle
          cx={x + width - 10}
          cy={y + 10}
          r={5}
          fill="#10B981"
          stroke="white"
          strokeWidth={1}
        />
      )}
    </g>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.room.id === nextProps.room.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isInPath === nextProps.isInPath &&
    prevProps.language === nextProps.language &&
    prevProps.darkMode === nextProps.darkMode
  );
});

RoomElement.displayName = 'RoomElement';

/**
 * Main Optimized Map Renderer
 */
export default function OptimizedMapRenderer({
  rooms,
  buildings,
  selectedFloor,
  selectedRoom,
  navigationPath = [],
  zoom,
  panX,
  panY,
  viewportWidth,
  viewportHeight,
  onRoomClick,
  language = 'fi',
  darkMode = false
}: OptimizedMapRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter rooms by floor
  const floorRooms = useMemo(() => {
    return rooms.filter(room => room.floor === selectedFloor);
  }, [rooms, selectedFloor]);

  // Calculate viewport bounds for culling
  const viewportBounds = useMemo(() => {
    const padding = 200; // Extra padding to avoid pop-in
    return {
      minX: -panX / zoom - padding,
      maxX: (-panX + viewportWidth) / zoom + padding,
      minY: -panY / zoom - padding,
      maxY: (-panY + viewportHeight) / zoom + padding
    };
  }, [panX, panY, zoom, viewportWidth, viewportHeight]);

  // Viewport culling - only render visible rooms
  const visibleRooms = useMemo(() => {
    return floorRooms.filter(room => {
      const x = room.mapPositionX || 0;
      const y = room.mapPositionY || 0;
      const width = room.width || 60;
      const height = room.height || 50;

      return (
        x + width >= viewportBounds.minX &&
        x <= viewportBounds.maxX &&
        y + height >= viewportBounds.minY &&
        y <= viewportBounds.maxY
      );
    });
  }, [floorRooms, viewportBounds]);

  // Navigation path room IDs for quick lookup
  const pathRoomIds = useMemo(() => {
    return new Set(navigationPath.map(r => r.id));
  }, [navigationPath]);

  // Handle room click
  const handleRoomClick = useCallback((room: Room) => {
    if (onRoomClick) {
      onRoomClick(room);
    }
  }, [onRoomClick]);

  // Performance monitoring
  useEffect(() => {
    console.log(`🎨 Rendering ${visibleRooms.length} / ${floorRooms.length} rooms (${Math.round(visibleRooms.length / floorRooms.length * 100)}% visible)`);
  }, [visibleRooms.length, floorRooms.length]);

  // Draw navigation path
  const pathLine = useMemo(() => {
    if (navigationPath.length < 2) return null;

    const points = navigationPath
      .filter(room => room.floor === selectedFloor)
      .map(room => {
        const x = (room.mapPositionX || 0) + (room.width || 60) / 2;
        const y = (room.mapPositionY || 0) + (room.height || 50) / 2;
        return `${x},${y}`;
      })
      .join(' ');

    return points;
  }, [navigationPath, selectedFloor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
      className={darkMode ? 'bg-gray-900' : 'bg-blue-50'}
      style={{ touchAction: 'none' }}
    >
      {/* Grid background */}
      <defs>
        <pattern
          id="grid"
          width="50"
          height="50"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${panX}, ${panY}) scale(${zoom})`}
        >
          <path
            d="M 50 0 L 0 0 0 50"
            fill="none"
            stroke={darkMode ? '#374151' : '#E5E7EB'}
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Main content group with zoom and pan */}
      <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
        {/* Navigation path */}
        {pathLine && (
          <motion.polyline
            points={pathLine}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="10,5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />
        )}

        {/* Building outlines (simplified) */}
        {buildings.map(building => (
          <rect
            key={building.id}
            x={building.mapPositionX || 0}
            y={building.mapPositionY || 0}
            width={200}
            height={150}
            fill="none"
            stroke={building.colorCode}
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.3}
            className="pointer-events-none"
          />
        ))}

        {/* Rooms - Only visible ones */}
        {visibleRooms.map(room => (
          <RoomElement
            key={room.id}
            room={room}
            isSelected={selectedRoom?.id === room.id}
            isInPath={pathRoomIds.has(room.id)}
            onClick={() => handleRoomClick(room)}
            language={language}
            darkMode={darkMode}
          />
        ))}

        {/* Floor label */}
        <text
          x={viewportBounds.minX + 20}
          y={viewportBounds.minY + 40}
          fontSize="24"
          fontWeight="bold"
          fill={darkMode ? '#9CA3AF' : '#6B7280'}
          opacity={0.5}
          className="pointer-events-none select-none"
        >
          Floor {selectedFloor}
        </text>
      </g>

      {/* Performance stats (debug mode) */}
      {process.env.NODE_ENV === 'development' && (
        <text
          x={10}
          y={viewportHeight - 10}
          fontSize="12"
          fill={darkMode ? '#9CA3AF' : '#6B7280'}
          className="pointer-events-none select-none"
        >
          Rendering: {visibleRooms.length}/{floorRooms.length} rooms | Zoom: {zoom.toFixed(2)}x
        </text>
      )}
    </svg>
  );
}
