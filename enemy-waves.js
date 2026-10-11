import * as THREE from './vendor/three.module.js';
import {AnimatedEnemy} from './animated-enemy.js?v=hills-4?v=waves-1-r1';
import {collideForest} from './forest.js?v=gullies-1-r1';

// Reuse a bounded rig pool; later waves feed additional enemies as slots open.
export class EnemyWaves {
 constructor(scene,obstacles,feel,limit=8){
  this.scene=scene;this.obstacles=obstacles;this.feel=feel;this.limit=limit;this.pool=[];this.root=new THREE.Group();scene.add(this.root);this.ready=this.addRig().then(()=>this.reset());
 }
 async addRig(){const enemy=new AnimatedEnemy(this.scene,this.obstacles,this.feel);await enemy.ready;this.root.add(enemy.root,enemy.shadow);enemy.root.visible=false;enemy.shadow.visible=false;this.pool.push(enemy);return enemy;}
 get first(){return this.pool[0];}
 get x(){return this.first.x;}set x(v){this.first.x=v;}
 get z(){return this.first.z;}set z(v){this.first.z=v;}
 get health(){return this.alive>0?100:0;}set health(v){this.first.health=v;}
 get grace(){return this.first.grace;}set grace(v){this.first.grace=v;}
 get parts(){return this.pool.filter(e=>e.root.visible&&e.health>0).flatMap(e=>e.parts);}
 get status(){return this.playerHealth<=0?'CAUGHT — RESET TO TRY AGAIN':this.loading?'NEXT WAVE INCOMING':`WAVE ${this.wave} · ${this.remaining} LEFT`;}
 reset(player={x:0,z:8,yaw:0,config:{size:1.35}}){
  this.wave=1;this.remaining=1;this.pending=0;this.alive=0;this.playerHealth=100;this.delay=0;this.loading=false;this.generation=(this.generation??0)+1;
  for(const enemy of this.pool){enemy.root.visible=false;enemy.shadow.visible=false;enemy.waveAlive=false;}
  this.spawn(this.first,player,0,1);
 }
 spawn(enemy,player,index,total){
  enemy.reset();enemy.setSize(player.config?.size??1.35);const angle=player.yaw+Math.PI+(index-(total-1)/2)*.55;const distance=18+(index%3)*2;
  enemy.x=player.x-Math.sin(angle)*distance;enemy.z=player.z-Math.cos(angle)*distance;collideForest(enemy,this.obstacles);enemy.root.position.set(enemy.x,0,enemy.z);enemy.heading=Math.atan2(player.x-enemy.x,player.z-enemy.z)+Math.PI;enemy.root.rotation.y=enemy.heading;enemy.playerHealth=this.playerHealth;enemy.waveAlive=true;enemy.corpseTime=0;enemy.grace=1;this.alive++;
 }
 async nextWave(player){
  this.loading=true;const generation=this.generation,target=Math.min(this.wave+1,this.limit);
  while(this.pool.length<target){await this.addRig();if(generation!==this.generation){this.loading=false;return;}}
  if(generation!==this.generation)return;
  this.wave++;this.remaining=this.wave;this.pending=Math.max(0,this.wave-this.pool.length);this.alive=0;
  for(let i=0;i<this.pool.length;i++){const enemy=this.pool[i];if(i<this.wave)this.spawn(enemy,player,i,Math.min(this.wave,this.limit));else enemy.root.visible=false;}
  this.loading=false;
 }
 step(dt,player){
  if(dt<=0)return;
  for(let i=0;i<this.pool.length;i++)for(let j=i+1;j<this.pool.length;j++){
   const a=this.pool[i],b=this.pool[j];if(!a.root.visible||!b.root.visible||a.health<=0||b.health<=0)continue;
   const dx=b.x-a.x,dz=b.z-a.z,distance=Math.hypot(dx,dz),spacing=a.radius+b.radius;
   if(distance<spacing){const push=Math.min(dt*1.5,(spacing-distance)*.5),nx=distance>1e-5?dx/distance:1,nz=distance>1e-5?dz/distance:0;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;collideForest(a,this.obstacles);collideForest(b,this.obstacles);}
  }
  for(const enemy of this.pool){
   if(!enemy.root.visible)continue;
   enemy.playerHealth=this.playerHealth;
   if(enemy.health>0){enemy.step(dt,player);this.playerHealth=enemy.playerHealth;}
   else{
    if(enemy.waveAlive){enemy.waveAlive=false;this.remaining--;this.alive--;}
    enemy.corpseTime+=dt;if(enemy.corpseTime<1.2)enemy.step(dt,player);
    if(this.pending>0&&enemy.corpseTime>2){this.pending--;this.spawn(enemy,player,this.pending,this.limit);}
   }
  }
  if(this.remaining===0&&this.playerHealth>0&&!this.loading){this.delay+=dt;if(this.delay>=2){this.delay=0;void this.nextWave(player);}}
 }
 explode(position,radius){for(const enemy of this.pool)if(enemy.root.visible&&enemy.health>0&&Math.hypot(position.x-enemy.x,position.z-enemy.z)<radius)enemy.hit(100);}
}
