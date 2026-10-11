// Static forest colliders share a spatial index; queries reuse caller-owned arrays.
const grids=new WeakMap(),cellSize=16;
export function nearbyObstacles(obstacles,x,z,reach,out){
 let grid=grids.get(obstacles);
 if(!grid||grid.length!==obstacles.length){const cells=new Map();let radius=0;for(const o of obstacles){const key=Math.floor(o.x/cellSize)*65536+Math.floor(o.z/cellSize);let cell=cells.get(key);if(!cell){cell=[];cells.set(key,cell);}cell.push(o);radius=Math.max(radius,o.radius);}grid={length:obstacles.length,cells,radius};grids.set(obstacles,grid);}
 out.length=0;reach+=grid.radius;
 const minX=Math.floor((x-reach)/cellSize),maxX=Math.floor((x+reach)/cellSize),minZ=Math.floor((z-reach)/cellSize),maxZ=Math.floor((z+reach)/cellSize);
 for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){const cell=grid.cells.get(ix*65536+iz);if(cell)for(const o of cell)out.push(o);}
 return out;
}
