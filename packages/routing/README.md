# @ksyk/routing

Indoor navigation for KSYK Maps.

## What's here (M4.0)

- **`buildGraph(rooms, doors, hallways, stairs, elevators)`** — builds a
  navigation graph from the domain data.
- **`findPath(graph, from, to, profile?)`** — A* pathfinding with
  optional accessibility profile (wheelchair prefers elevators, avoids
  stairs).
- **`Route`** — result type with total distance, ETA, turn-by-turn
  instructions, and per-floor segments for cross-floor navigation.

## Roadmap

- **M4.0** (now) — types + basic A* over a flat graph
- **M4.1** — multi-floor routing with stair/elevator transitions
- **M4.2** — accessibility profiles (wheelchair, low-vision)
- **M4.3** — dynamic obstacle avoidance (locked doors, closed rooms)
- **M4.4** — turn-by-turn instructions from route
