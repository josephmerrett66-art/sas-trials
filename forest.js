import {nearbyObstacles} from './obstacle-grid.js';
const nearby=new WeakMap();
export {createForest} from './forest-scene.js?v=big-1';

export function collideForest(player,obstacles){
  let local=nearby.get(player);if(!local){local=[];nearby.set(player,local);}
  for(const obstacle of nearbyObstacles(obstacles,player.x,player.z,player.radius??.3,local)){
    if(player.y>(obstacle.baseY??0)+obstacle.height)continue;
    const dx=player.x-obstacle.x,dz=player.z-obstacle.z,radius=obstacle.radius+(player.radius??.3);
    if(Math.abs(dx)>radius||Math.abs(dz)>radius)continue;
    const distance=Math.hypot(dx,dz);
    if(distance>=radius)continue;
    const nx=distance?dx/distance:1,nz=distance?dz/distance:0;
    player.x=obstacle.x+nx*radius;player.z=obstacle.z+nz*radius;
    const inward=player.vx*nx+player.vz*nz;
    if(inward<0){player.vx-=inward*nx;player.vz-=inward*nz;}
  }
  if(player.grounded&&player.groundHeight)player.y=player.groundHeight(player.x,player.z);
}
