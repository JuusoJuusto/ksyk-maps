/**
 * KSYK Maps - Advanced Pathfinding System
 * Implements A* algorithm with multi-floor support and accessibility options
 */

export interface PathNode {
  id: string;
  roomNumber: string;
  name: string;
  floor: number;
  x: number;
  y: number;
  type: string;
  buildingId: string;
  isAccessible?: boolean;
}

export interface PathEdge {
  from: string;
  to: string;
  distance: number;
  type: 'hallway' | 'stairway' | 'elevator' | 'door';
  isAccessible?: boolean;
}

export interface PathResult {
  path: PathNode[];
  distance: number;
  estimatedTime: number; // in seconds
  instructions: PathInstruction[];
  floorChanges: number;
}

export interface PathInstruction {
  type: 'walk' | 'turn' | 'stairs' | 'elevator' | 'arrive';
  description: string;
  descriptionFi: string;
  floor?: number;
  distance?: number;
}

class PathfindingEngine {
  private nodes: Map<string, PathNode> = new Map();
  private edges: Map<string, PathEdge[]> = new Map();
  private graph: Map<string, Map<string, number>> = new Map();

  /**
   * Initialize pathfinding engine with rooms and connectors
   */
  initialize(rooms: any[], connectors: any[] = []) {
    this.nodes.clear();
    this.edges.clear();
    this.graph.clear();

    // Add all rooms as nodes
    rooms.forEach(room => {
      const node: PathNode = {
        id: room.id,
        roomNumber: room.roomNumber,
        name: room.name || room.nameEn || room.roomNumber,
        floor: room.floor,
        x: room.mapPositionX || 0,
        y: room.mapPositionY || 0,
        type: room.type,
        buildingId: room.buildingId,
        isAccessible: room.isAccessible !== false
      };
      this.nodes.set(room.id, node);
    });

    // Build edges from spatial proximity and connectors
    this.buildEdgesFromProximity(rooms);
    this.buildEdgesFromConnectors(connectors);
    
  }

  /**
   * Build edges between nearby rooms on the same floor
   */
  private buildEdgesFromProximity(rooms: any[]) {
    const PROXIMITY_THRESHOLD = 150; // pixels
    const HALLWAY_BONUS = 0.7; // Hallways are faster to traverse

    rooms.forEach(room1 => {
      rooms.forEach(room2 => {
        if (room1.id === room2.id) return;
        if (room1.floor !== room2.floor) return;
        if (room1.buildingId !== room2.buildingId) return;

        const distance = this.calculateDistance(
          room1.mapPositionX || 0,
          room1.mapPositionY || 0,
          room2.mapPositionX || 0,
          room2.mapPositionY || 0
        );

        if (distance <= PROXIMITY_THRESHOLD) {
          const isHallway = room1.type === 'hallway' || room2.type === 'hallway';
          const weight = isHallway ? distance * HALLWAY_BONUS : distance;

          this.addEdge({
            from: room1.id,
            to: room2.id,
            distance: weight,
            type: 'hallway',
            isAccessible: room1.isAccessible !== false && room2.isAccessible !== false
          });
        }
      });
    });
  }

  /**
   * Build edges from connector rooms (stairways, elevators)
   */
  private buildEdgesFromConnectors(connectors: any[]) {
    connectors.forEach(connector => {
      if (connector.connectedRoomId && connector.roomId) {
        const type = connector.type || 'hallway';
        const distance = type === 'elevator' ? 50 : type === 'stairway' ? 100 : 80;

        this.addEdge({
          from: connector.roomId,
          to: connector.connectedRoomId,
          distance,
          type: type as any,
          isAccessible: type === 'elevator' // Elevators are accessible, stairs are not
        });

        // Bidirectional
        this.addEdge({
          from: connector.connectedRoomId,
          to: connector.roomId,
          distance,
          type: type as any,
          isAccessible: type === 'elevator'
        });
      }
    });
  }

  /**
   * Add an edge to the graph
   */
  private addEdge(edge: PathEdge) {
    if (!this.edges.has(edge.from)) {
      this.edges.set(edge.from, []);
    }
    this.edges.get(edge.from)!.push(edge);

    // Update adjacency graph
    if (!this.graph.has(edge.from)) {
      this.graph.set(edge.from, new Map());
    }
    this.graph.get(edge.from)!.set(edge.to, edge.distance);
  }

  /**
   * Find shortest path using A* algorithm
   */
  findPath(
    startRoomId: string,
    endRoomId: string,
    options: { accessibleOnly?: boolean } = {}
  ): PathResult | null {
    const startNode = this.nodes.get(startRoomId);
    const endNode = this.nodes.get(endRoomId);

    if (!startNode || !endNode) {
      console.error('❌ Start or end node not found');
      return null;
    }

    // A* algorithm
    const openSet = new Set<string>([startRoomId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(startRoomId, 0);
    fScore.set(startRoomId, this.heuristic(startNode, endNode));

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current = this.getLowestFScore(openSet, fScore);
      
      if (current === endRoomId) {
        // Path found!
        return this.reconstructPath(cameFrom, current, gScore.get(current) || 0);
      }

      openSet.delete(current);
      const currentNode = this.nodes.get(current)!;
      const neighbors = this.edges.get(current) || [];

      for (const edge of neighbors) {
        // Skip inaccessible edges if accessibility is required
        if (options.accessibleOnly && edge.isAccessible === false) {
          continue;
        }

        const neighbor = edge.to;
        const tentativeGScore = (gScore.get(current) || Infinity) + edge.distance;

        if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          
          const neighborNode = this.nodes.get(neighbor)!;
          fScore.set(neighbor, tentativeGScore + this.heuristic(neighborNode, endNode));

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor);
          }
        }
      }
    }

    console.error('❌ No path found');
    return null;
  }

  /**
   * Heuristic function for A* (Euclidean distance + floor penalty)
   */
  private heuristic(node1: PathNode, node2: PathNode): number {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const floorDiff = Math.abs(node1.floor - node2.floor);
    
    return Math.sqrt(dx * dx + dy * dy) + (floorDiff * 200); // Floor change penalty
  }

  /**
   * Get node with lowest fScore from open set
   */
  private getLowestFScore(openSet: Set<string>, fScore: Map<string, number>): string {
    let lowest = Infinity;
    let lowestNode = '';

    for (const node of openSet) {
      const score = fScore.get(node) || Infinity;
      if (score < lowest) {
        lowest = score;
        lowestNode = node;
      }
    }

    return lowestNode;
  }

  /**
   * Reconstruct path from cameFrom map
   */
  private reconstructPath(
    cameFrom: Map<string, string>,
    current: string,
    totalDistance: number
  ): PathResult {
    const path: PathNode[] = [];
    const pathIds: string[] = [current];

    while (cameFrom.has(current)) {
      current = cameFrom.get(current)!;
      pathIds.unshift(current);
    }

    // Convert IDs to nodes
    pathIds.forEach(id => {
      const node = this.nodes.get(id);
      if (node) path.push(node);
    });

    // Generate instructions
    const instructions = this.generateInstructions(path);
    
    // Count floor changes
    const floorChanges = this.countFloorChanges(path);

    // Estimate time (assuming 1.4 m/s walking speed, 1 pixel = 0.1m)
    const estimatedTime = Math.ceil((totalDistance * 0.1) / 1.4);

    return {
      path,
      distance: totalDistance,
      estimatedTime,
      instructions,
      floorChanges
    };
  }

  /**
   * Generate turn-by-turn instructions
   */
  private generateInstructions(path: PathNode[]): PathInstruction[] {
    const instructions: PathInstruction[] = [];

    if (path.length === 0) return instructions;

    // Start
    instructions.push({
      type: 'arrive',
      description: `Start at ${path[0].name}`,
      descriptionFi: `Aloita: ${path[0].name}`
    });

    // Middle steps
    for (let i = 1; i < path.length - 1; i++) {
      const current = path[i];
      const prev = path[i - 1];

      if (current.floor !== prev.floor) {
        const direction = current.floor > prev.floor ? 'up' : 'down';
        instructions.push({
          type: current.type === 'elevator' ? 'elevator' : 'stairs',
          description: `Take ${current.type === 'elevator' ? 'elevator' : 'stairs'} ${direction} to floor ${current.floor}`,
          descriptionFi: `${current.type === 'elevator' ? 'Hissi' : 'Portaat'} ${direction === 'up' ? 'ylös' : 'alas'} kerrokseen ${current.floor}`,
          floor: current.floor
        });
      } else if (current.type === 'hallway') {
        instructions.push({
          type: 'walk',
          description: `Walk through ${current.name}`,
          descriptionFi: `Kulje: ${current.name}`,
          distance: this.calculateDistance(prev.x, prev.y, current.x, current.y)
        });
      }
    }

    // End
    const end = path[path.length - 1];
    instructions.push({
      type: 'arrive',
      description: `Arrive at ${end.name} (${end.roomNumber})`,
      descriptionFi: `Perillä: ${end.name} (${end.roomNumber})`
    });

    return instructions;
  }

  /**
   * Calculate Euclidean distance
   */
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Count floor changes in path
   */
  private countFloorChanges(path: PathNode[]): number {
    let changes = 0;
    for (let i = 1; i < path.length; i++) {
      if (path[i].floor !== path[i - 1].floor) {
        changes++;
      }
    }
    return changes;
  }

  /**
   * Count total edges
   */
  private countEdges(): number {
    let count = 0;
    this.edges.forEach(edges => count += edges.length);
    return count;
  }

  /**
   * Find nearest room to a point
   */
  findNearestRoom(x: number, y: number, floor: number): PathNode | null {
    let nearest: PathNode | null = null;
    let minDistance = Infinity;

    this.nodes.forEach(node => {
      if (node.floor !== floor) return;
      
      const distance = this.calculateDistance(x, y, node.x, node.y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = node;
      }
    });

    return nearest;
  }

  /**
   * Get all nodes (for debugging)
   */
  getNodes(): PathNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges (for debugging)
   */
  getEdges(): PathEdge[] {
    const allEdges: PathEdge[] = [];
    this.edges.forEach(edges => allEdges.push(...edges));
    return allEdges;
  }
}

// Singleton instance
export const pathfinder = new PathfindingEngine();

// Export for use in components
export default pathfinder;
