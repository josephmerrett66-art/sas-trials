// Map size, shared by modules that must not import terrain.js (it imports them).
// The map was 1440 m across; it is now about five times the area. Hand-placed
// coordinates were laid out on the old map and are scaled with S().
export const WORLD_SIZE=3200,LEGACY_SIZE=1440,WORLD_SCALE=WORLD_SIZE/LEGACY_SIZE;
export const S=v=>v*WORLD_SCALE;
