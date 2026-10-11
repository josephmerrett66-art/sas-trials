// Shared triangulated height field: physics and decoration sample the rendered surface.
export const WORLD_SIZE=1440, TERRAIN_STEP=5, TERRAIN_SEGMENTS=WORLD_SIZE/TERRAIN_STEP;
const half=WORLD_SIZE/2,n=TERRAIN_SEGMENTS+1,heights=new Float32Array(n*n);
for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
 const x=ix*TERRAIN_STEP-half,z=iz*TERRAIN_STEP-half;
 const blend=Math.min(1,Math.max(0,(Math.hypot(x,z-8)-18)/28)),smooth=blend*blend*(3-2*blend);
 heights[iz*n+ix]=smooth*(11*Math.sin(x/82)*Math.cos(z/105)+7*Math.sin((x+z)/58)+4*Math.cos(x/42)*Math.sin(z/67));
}
export function terrainHeight(x,z){
 const gx=Math.max(0,Math.min(TERRAIN_SEGMENTS-.000001,(x+half)/TERRAIN_STEP)),gz=Math.max(0,Math.min(TERRAIN_SEGMENTS-.000001,(z+half)/TERRAIN_STEP));
 const ix=Math.floor(gx),iz=Math.floor(gz),tx=gx-ix,tz=gz-iz,a=heights[iz*n+ix],b=heights[(iz+1)*n+ix],d=heights[iz*n+ix+1],c=heights[(iz+1)*n+ix+1];
 return tx+tz<=1?a+tx*(d-a)+tz*(b-a):c+(1-tx)*(b-c)+(1-tz)*(d-c);
}
export function terrainNormal(x,z,out){return out.set(terrainHeight(x-.1,z)-terrainHeight(x+.1,z),.2,terrainHeight(x,z-.1)-terrainHeight(x,z+.1)).normalize();}
