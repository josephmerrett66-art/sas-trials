import {nearbyObstacles} from './obstacle-grid.js';
import {EnemyWaves} from './enemy-waves.js?v=big-1';

export class SurvivalThreats extends EnemyWaves {
 constructor(scene,obstacles,feel){super(scene,obstacles,feel,3);this.ready=this.ready.then(async()=>{while(this.pool.length<3)await this.addRig();this.reset();});}
 reset(player={x:0,z:8,yaw:0,config:{size:1.35}}){
  super.reset(player);this.remaining=3;this.alive=0;this.time=0;
  const anchors=[[-10,-9],[-12,-42],[9,-72]];
  for(let i=0;i<this.pool.length;i++){const e=this.pool[i];this.spawn(e,player,i,3);e.x=e.homeX=anchors[i][0];e.z=e.homeZ=anchors[i][1];e.root.position.set(e.x,0,e.z);e.alert=0;e.notice='patrol';e.search={x:e.x,z:e.z,yaw:0,config:player.config};e.grace=0;}
 }
 get status(){return this.pool.some(e=>e.health>0&&e.notice==='chase')?'YOU HAVE BEEN SEEN':this.pool.some(e=>e.health>0&&e.notice==='search')?'SOMETHING HEARD YOU':'KEEP QUIET · FIND SUPPLIES';}
 noise(x,z,radius){for(const e of this.pool)if(e.health>0&&Math.hypot(x-e.x,z-e.z)<radius){e.alert=22;e.search.x=x;e.search.z=z;e.notice='search';}}
 visibleTo(e,player){const dx=player.x-e.x,dz=player.z-e.z,length=dx*dx+dz*dz;for(const o of nearbyObstacles(this.obstacles,e.x,e.z,Math.sqrt(length),this.sightObstacles??(this.sightObstacles=[]))){if(Math.abs(o.x-e.x)>Math.abs(dx)+o.radius||Math.abs(o.z-e.z)>Math.abs(dz)+o.radius)continue;const t=((o.x-e.x)*dx+(o.z-e.z)*dz)/length;if(t<=.05||t>=.95)continue;if(Math.hypot(e.x+t*dx-o.x,e.z+t*dz-o.z)<o.radius)return false;}return true;}
 step(dt,player){
  if(dt<=0)return;this.time+=dt;this.alive=0;
  for(let i=0;i<this.pool.length;i++){
   const e=this.pool[i];if(!e.root.visible)continue;e.playerHealth=this.playerHealth;
   if(e.health<=0){e.corpseTime=(e.corpseTime||0)+dt;if(e.corpseTime<1.2)e.step(dt,player);continue;}
   this.alive++;const distance=Math.hypot(player.x-e.x,player.z-e.z),safe=this.survival?.safe(player);
   e.alert=Math.max(0,e.alert-dt);
   if(!safe&&distance<(this.survival?.night?14:10)&&this.visibleTo(e,player)){e.notice='chase';e.alert=22;e.search.x=player.x;e.search.z=player.z;}
   else e.notice=e.alert>0?'search':'patrol';
   const target=e.search;target.config=player.config;
   if(e.notice==='patrol'){target.x=e.homeX+Math.sin(this.time*.08+i*2)*3;target.z=e.homeZ+Math.cos(this.time*.08+i*2)*3;}
   if(this.survival?.fireLit){const cx=target.x,cz=target.z-8,r=Math.hypot(cx,cz);if(r<6){target.x=r>0?cx/r*6:6;target.z=8+(r>0?cz/r*6:0);}}
   e.walkSpeed=e.farSpeed=e.notice==='patrol'?.65:1.8;e.grace=e.notice!=='chase'&&Math.hypot(target.x-e.x,target.z-e.z)<1.8&&e.stagger===0?1000:0;
   const before=e.playerHealth;e.step(dt,e.notice==='chase'?player:target);if(e.notice!=='chase'||safe)e.playerHealth=before;this.playerHealth=e.playerHealth;
  }
 }
}
