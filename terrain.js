// Shared triangulated height field: physics and decoration sample the rendered surface.
import {buildRiverNetwork,carveRivers,riverIndex} from './hydrology.js?v=big-1';
import {WORLD_SIZE} from './world-size.js?v=big-1';
export {WORLD_SIZE};
export const TERRAIN_STEP=5, TERRAIN_SEGMENTS=WORLD_SIZE/TERRAIN_STEP;
const half=WORLD_SIZE/2,n=TERRAIN_SEGMENTS+1,heights=new Float32Array(n*n);
const broad=(x,z)=>13*Math.sin(x/430+.7)*Math.cos(z/370-.5)+8*Math.sin((x-z)/690+1.3);
for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
 const x=ix*TERRAIN_STEP-half,z=iz*TERRAIN_STEP-half;
 const blend=Math.min(1,Math.max(0,(Math.hypot(x,z-8)-18)/28)),smooth=blend*blend*(3-2*blend);
 // Rolling hills, over broad ridges and valleys a kilometre or so across.
 heights[iz*n+ix]=smooth*(11*Math.sin(x/82)*Math.cos(z/105)+7*Math.sin((x+z)/58)+4*Math.cos(x/42)*Math.sin(z/67)+broad(x,z));
}
// Rivers follow the original low ground; the grid is then reshaped so they can flow.
export const rivers=buildRiverNetwork(heights,n,TERRAIN_STEP,half);carveRivers(heights,n,TERRAIN_STEP,half,rivers);
const water=riverIndex(rivers),probe={d:Infinity,S:0,w:0,D:0,F:0,river:null};
// Nearest river centreline: distance d, water level S, half-width w. Reuses one result object.
export function riverAt(x,z,out=probe){return water.nearest(x,z,out);}
// Metres from the water's edge (negative inside the channel); Infinity far from any river.
export function riverClearance(x,z){const r=water.nearest(x,z,probe);return r.river?r.d-r.w:Infinity;}
export function terrainHeight(x,z){
 const gx=Math.max(0,Math.min(TERRAIN_SEGMENTS-.000001,(x+half)/TERRAIN_STEP)),gz=Math.max(0,Math.min(TERRAIN_SEGMENTS-.000001,(z+half)/TERRAIN_STEP));
 const ix=Math.floor(gx),iz=Math.floor(gz),tx=gx-ix,tz=gz-iz,a=heights[iz*n+ix],b=heights[(iz+1)*n+ix],d=heights[iz*n+ix+1],c=heights[(iz+1)*n+ix+1];
 return tx+tz<=1?a+tx*(d-a)+tz*(b-a):c+(1-tx)*(b-c)+(1-tz)*(d-c);
}
export function terrainNormal(x,z,out){return out.set(terrainHeight(x-.1,z)-terrainHeight(x+.1,z),.2,terrainHeight(x,z-.1)-terrainHeight(x,z+.1)).normalize();}
