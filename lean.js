import {nearbyObstacles} from './obstacle-grid.js';
export const leanInput=(keys,pad)=>Number(keys.has('KeyE')||!!pad?.leanRight)-Number(keys.has('KeyQ')||!!pad?.leanLeft);
export class PlayerLean {
 constructor(){this.output={x:0,z:0,y:0,roll:0};this.reset();}
 reset(){this.amount=0;for(const key in this.output)this.output[key]=0;}
 step(dt,direction,player,obstacles){
  const target=player.grounded&&player.state!=='SPRINTING'&&player.slide<=0?Math.max(-1,Math.min(1,direction)):0;
  this.amount+=(target-this.amount)*(1-Math.exp(-12*Math.max(0,Math.min(dt,.05))));
  const size=player.config.size,sign=Math.sign(this.amount),dx=Math.cos(player.yaw)*sign,dz=-Math.sin(player.yaw)*sign;
  const reach=.36*size,eye=player.y+player.eye;
  let distance=Math.abs(this.amount)*reach;
  // Sweep the head sideways against existing cylindrical world colliders.
  // A clearance margin also accommodates footstep/look sway and the near plane.
  if(distance>.00001)for(const obstacle of nearbyObstacles(obstacles,player.x,player.z,reach+.16*size,this.nearby??(this.nearby=[]))){
   if(eye-.12*size>((obstacle.baseY??0)+(obstacle.height??Infinity)))continue;
   const ox=obstacle.x-player.x,oz=obstacle.z-player.z,radius=obstacle.radius+.16*size;
   if(Math.abs(ox)>radius+distance||Math.abs(oz)>radius+distance)continue;
   const along=ox*dx+oz*dz,across=ox*ox+oz*oz-along*along;
   if(across>=radius*radius)continue;
   const half=Math.sqrt(radius*radius-across);if(along+half<0)continue;
   distance=Math.min(distance,Math.max(0,along-half-.025));
  }
  const actual=reach?distance/reach*sign:0,out=this.output;
  out.x=dx*distance;out.z=dz*distance;out.y=-Math.abs(actual)*.055*size;out.roll=-actual*.16;
  return out;
 }
}
