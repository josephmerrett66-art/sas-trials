import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight,riverClearance,WORLD_SIZE} from './terrain.js?v=big-1';

const tint=(geometry,color)=>{geometry=geometry.index?geometry.toNonIndexed():geometry;for(const k of Object.keys(geometry.attributes))if(k!=='position')geometry.deleteAttribute(k);const c=new THREE.Color(color),n=geometry.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++)c.toArray(colors,i*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;};
const shape=(geometry,color,[x,y,z],[sx,sy,sz],[rx,ry,rz]=[0,0,0])=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy,sz);o.updateMatrix();return tint(geometry,color).applyMatrix4(o.matrix);};
// A faceted brown rabbit, about 45 cm long, facing +z, in roughly 120 triangles.
export function rabbitGeometry(){
 const ico=()=>new THREE.IcosahedronGeometry(1,0);
 return mergeGeometries([
  shape(ico(),0x8a7356,[0,.15,0],[.15,.13,.23]),
  shape(ico(),0x7f6a4f,[0,.12,-.1],[.14,.12,.12]),
  shape(ico(),0x8f7a5c,[0,.25,.19],[.085,.08,.1]),
  shape(new THREE.ConeGeometry(.03,.17,4),0x76624a,[.035,.36,.15],[1,1,1],[-.35,0,.12]),
  shape(new THREE.ConeGeometry(.03,.17,4),0x76624a,[-.035,.36,.15],[1,1,1],[-.35,0,-.12]),
  shape(ico(),0xe9e3d3,[0,.18,-.23],[.045,.045,.04]),
  shape(ico(),0x2a2620,[.05,.27,.25],[.012,.012,.012]),shape(ico(),0x2a2620,[-.05,.27,.25],[.012,.012,.012])
 ]).scale(1.2,1.2,1.2);
}

export const RABBITS=6,THROW_RANGE=12;
// A small fixed pool that wanders near the player: graze, hop, bolt when disturbed.
// Dawn and dusk bring the most rabbits out. One draw; no allocations per frame.
export class Wildlife {
 constructor(scene,{seed=5531,obstacleClear=()=>true}={}){
  this.seed=seed;this.clear=obstacleClear;
  this.mesh=new THREE.InstancedMesh(rabbitGeometry(),new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),RABBITS);this.mesh.name='Rabbits';this.mesh.frustumCulled=false;this.mesh.count=0;scene.add(this.mesh);
  this.rabbits=Array.from({length:RABBITS},()=>({active:false,x:0,z:0,y:0,yaw:0,state:'graze',timer:0,hop:0,hopTime:0,vx:0,vz:0}));
  this.transform=new THREE.Object3D();this.spawnTimer=1;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(){for(const r of this.rabbits)r.active=false;this.mesh.count=0;this.spawnTimer=1;}
 // How alert rabbits are to the player: crouching lets you creep close, running carries.
 static noticeRange(player){return player.state==='CROUCHED'?5:player.state==='SPRINTING'?24:Math.hypot(player.vx,player.vz)>.5?13:8;}
 spawn(r,player){
  for(let attempt=0;attempt<6;attempt++){const a=this.random()*Math.PI*2,d=35+this.random()*40,x=player.x+Math.cos(a)*d,z=player.z+Math.sin(a)*d;
   if(Math.abs(x)>WORLD_SIZE/2-10||Math.abs(z)>WORLD_SIZE/2-10||riverClearance(x,z)<3||!this.clear(x,z))continue;
   Object.assign(r,{active:true,x,z,y:terrainHeight(x,z),yaw:this.random()*6.28,state:'graze',timer:1+this.random()*3,hop:0,hopTime:0,vx:0,vz:0});return true;}
  return false;
 }
 // activity 0..1 from the time of day.
 step(dt,player,{activity=.6,active=true}={}){
  if(!active)return;
  this.spawnTimer-=dt;
  if(this.spawnTimer<=0){this.spawnTimer=2+this.random()*3;let live=0;for(const q of this.rabbits)if(q.active)live++;const want=Math.round(RABBITS*activity);if(live<want){const r=this.rabbits.find(q=>!q.active);if(r)this.spawn(r,player);}}
  const notice=Wildlife.noticeRange(player);let count=0;
  for(const r of this.rabbits){
   if(!r.active)continue;
   const dx=r.x-player.x,dz=r.z-player.z,d=Math.hypot(dx,dz);
   if(d>115){r.active=false;continue;}
   if(r.state!=='flee'&&d<notice)this.bolt(r,player);
   r.timer-=dt;
   if(r.hopTime<=0&&r.timer<=0){
    if(r.state==='flee'&&d>notice+20)r.state='graze';
    const fleeing=r.state==='flee';
    if(fleeing){const away=Math.atan2(dx,dz)+(this.random()-.5)*.8;r.yaw=away;}else r.yaw+=(this.random()-.5)*2.4;
    const length=fleeing?2.2:.7+this.random()*.6,duration=fleeing?.32:.45;
    r.vx=Math.sin(r.yaw)*length/duration;r.vz=Math.cos(r.yaw)*length/duration;r.hopTime=duration;r.hop=duration;r.timer=fleeing?.02:1.2+this.random()*3;
   }
   if(r.hopTime>0){const step=Math.min(dt,r.hopTime);const nx=r.x+r.vx*step,nz=r.z+r.vz*step;
    if(riverClearance(nx,nz)>0&&this.clear(nx,nz)){r.x=nx;r.z=nz;}else{r.yaw+=Math.PI*.7;r.hopTime=0;}
    r.hopTime-=step;r.y=terrainHeight(r.x,r.z);}
   const t=this.transform,lift=r.hop>0&&r.hopTime>0?Math.sin((1-r.hopTime/r.hop)*Math.PI):0;
   t.position.set(r.x,r.y+lift*(r.state==='flee'?.32:.16),r.z);t.rotation.set(-lift*.35,r.yaw,0);t.updateMatrix();this.mesh.setMatrixAt(count++,t.matrix);
  }
  this.mesh.count=count;if(count)this.mesh.instanceMatrix.needsUpdate=true;
 }
 bolt(r,player){r.state='flee';r.timer=0;}
 // The nearest rabbit within throwing range close to the line of sight, if any.
 target(player,dirX,dirZ){
  let best=null,bestD=THROW_RANGE;
  for(const r of this.rabbits){if(!r.active)continue;const dx=r.x-player.x,dz=r.z-player.z,d=Math.hypot(dx,dz);if(d>=bestD||d<.5)continue;if((dx*dirX+dz*dirZ)/d<.96)continue;best=r;bestD=d;}
  return best;
 }
 // Throwing stick: likelier close up and against a rabbit that has not seen you. aim -.1..+.1:
 // a steady, held aim helps and a snatched throw hurts.
 throwChance(r,player,aim=0){const d=Math.hypot(r.x-player.x,r.z-player.z);return Math.max(.1,Math.min(.92,.95-d*.06-(r.state==='flee'?.35:0)+aim));}
 throwAt(r,player,roll=this.random(),aim=0){
  if(roll<this.throwChance(r,player,aim)){r.active=false;return true;}
  this.bolt(r,player);return false;
 }
 kill(r){r.active=false;}
}
