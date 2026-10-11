import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export class Survival {
 constructor(scene,world,arsenal,threats){this.world=world;this.arsenal=arsenal;this.threats=threats;threats.survival=this;this.buildCamp(scene);this.reset();}
 buildCamp(scene){
  const pieces=[];const add=(geometry,x,y,z,color,rx=0,ry=0,rz=0)=>{const transform=new THREE.Object3D();transform.position.set(x,y,z);transform.rotation.set(rx,ry,rz);transform.updateMatrix();geometry.applyMatrix4(transform.matrix);const colors=new Float32Array(geometry.attributes.position.count*3),c=new THREE.Color(color);for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(geometry);};
  const tent=new THREE.BufferGeometry(),vertices=[-1.3,0,-1.5,0,1.8,-1.5,-1.3,0,1.5, -1.3,0,1.5,0,1.8,-1.5,0,1.8,1.5, 0,1.8,-1.5,1.3,0,-1.5,0,1.8,1.5, 0,1.8,1.5,1.3,0,-1.5,1.3,0,1.5, -1.3,0,1.5,0,1.8,1.5,1.3,0,1.5, 1.3,0,-1.5,0,1.8,-1.5,-1.3,0,-1.5];
  for(let i=0;i<vertices.length;i+=9)for(let j=0;j<3;j++){const v=vertices[i+3+j];vertices[i+3+j]=vertices[i+6+j];vertices[i+6+j]=v;}
  tent.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));tent.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));tent.computeVertexNormals();add(tent,-3,0,10,0x697450);
  const door=new THREE.BufferGeometry();door.setAttribute('position',new THREE.Float32BufferAttribute([-.65,.02,0,.65,.02,0,0,1.2,0],3));door.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,.5,1,1,0],2));door.computeVertexNormals();add(door,-3,0,11.51,0x232a1b);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;add(new THREE.IcosahedronGeometry(.22,0),Math.cos(a)*.85,.12,8+Math.sin(a)*.85,0x666b61);}
  for(let i=0;i<3;i++)add(new THREE.CylinderGeometry(.11,.15,1.2,5).toNonIndexed(),0,.2,8,0x493d2a,Math.PI/2,i*Math.PI/3);
  add(new THREE.BoxGeometry(1.3,.38,.6).toNonIndexed(),2,.2,10,0x524b35);
  const camp=new THREE.Mesh(mergeGeometries(pieces),new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));camp.receiveShadow=true;camp.name='Survivor camp';camp.userData.decorative=true;scene.add(camp);for(const g of pieces)g.dispose();
  this.fire=new THREE.Mesh(new THREE.ConeGeometry(.3,.65,5),new THREE.MeshBasicMaterial({color:0xffae45}));this.fire.position.set(0,.52,8);this.fire.userData.decorative=true;scene.add(this.fire);
 }
 reset(){
  this.time=0;this.bagFuel=0;this.meds=0;this.banked=0;this.fuel=20;this.finished=false;this.message='Search the black barrels. Bring 3 fuel back to camp.';this.messageTime=8;this.current=null;this.campDistance=0;
  for(const target of this.world.targets)if(target.name==='Barrel'){target.lootCache=true;target.looted=false;target.explosive=false;target.damage=()=>{};target.health=100;}
  const stocks=[[12,12],[10,0],[3,0],[0,0],[1,0]];for(let i=0;i<this.arsenal.entries.length;i++){const state=this.arsenal.entries[i].state;const stock=this.arsenal.entries[i].spec?.id==='knife'?[0,0]:stocks[i];state.ammo=stock[0];state.reserve=stock[1];}
 }
 get night(){return this.nightMode!==false;}
 get fireLit(){return this.fuel>0;}
 safe(player){return this.fireLit&&Math.hypot(player.x,player.z-8)<5;}
 tell(message){this.message=message;this.messageTime=5;}
 nearCache(player){let best=null,distance=2.8*player.config.size;for(const target of this.world.targets){if(!target.lootCache)continue;const d=Math.hypot(target.x-player.x,target.z-player.z);if(d<distance){distance=d;best=target;}}return best;}
 interact(player,contextual=false){
  if(this.finished||this.threats.playerHealth<=0)return false;
  const cache=this.nearCache(player);
  if(cache){if(cache.looted){if(contextual)return false;this.tell('This cache is empty.');return true;}cache.looted=true;this.bagFuel++;this.meds++;const supplies=[18,20,2];for(let i=0;i<3;i++)if(this.arsenal.entries[i]&&this.arsenal.entries[i].spec?.id!=='knife')this.arsenal.entries[i].state.reserve+=supplies[i];this.tell('Found: 1 fuel · 1 medkit. Return fuel to camp.');return true;}
  if(Math.hypot(player.x,player.z-8)<4*player.config.size){if(contextual&&this.bagFuel===0)return false;if(this.bagFuel>0){this.banked+=this.bagFuel;this.fuel+=this.bagFuel*60;this.tell(`Stored ${this.bagFuel} fuel. Camp burns for ${Math.floor(this.fuel)} seconds.`);this.bagFuel=0;}else this.tell('Camp: bring fuel here from the black barrels.');return true;}return false;
 }
 heal(){if(this.finished||this.threats.playerHealth<=0)return;if(this.meds<=0){this.tell('No medkits. Search a black barrel.');return;}if(this.threats.playerHealth>=100){this.tell('Health is already full.');return;}this.meds--;this.threats.playerHealth=Math.min(100,this.threats.playerHealth+40);this.tell('Used a medkit: +40 health.');}
 step(dt,player){
  this.current=this.nearCache(player);this.campDistance=Math.hypot(player.x,player.z-8);
  if(dt<=0||this.finished||this.threats.playerHealth<=0)return;
  this.time+=dt;this.messageTime=Math.max(0,this.messageTime-dt);if(this.night){this.fuel=Math.max(0,this.fuel-dt);if(!this.safe(player))this.threats.playerHealth=Math.max(0,this.threats.playerHealth-dt*.7);}
  this.fire.visible=this.fireLit;this.fire.scale.set(1,.9+Math.sin(this.time*9)*.1,1);
  if(this.threats.playerHealth<=0)this.tell('You did not survive. T / Xbox Y: try again.');

 }
 prompt(){if(this.finished)return 'T / Xbox Y · START A NEW RUN';if(this.threats.playerHealth<=0)return 'T / Xbox Y · START A NEW RUN';if(this.current)return this.current.looted?'EMPTY CACHE': 'G / Xbox X · SEARCH LOOT CACHE';if(this.campDistance<5)return this.bagFuel>0?'G / Xbox X · STORE FUEL AT CAMP':'CAMP · FIRE IS '+(this.fireLit?'LIT':'OUT');return '';}
 heading(player,x,z){const bearing=Math.atan2(player.x-x,player.z-z)-player.yaw,angle=Math.atan2(Math.sin(bearing),Math.cos(bearing));return Math.abs(angle)<.4?'ahead':Math.abs(angle)>2.6?'behind':angle>0?'left':'right';}
 hud(player){const seconds=Math.floor(this.time),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;let nearest=null,distance=Infinity;for(const t of this.world.targets)if(t.lootCache&&!t.looted){const d=Math.hypot(t.x-player.x,t.z-player.z);if(d<distance){nearest=t;distance=d;}}
  const direction=nearest?`Cache ${Math.round(distance)}m ${this.heading(player,nearest.x,nearest.z)} · `:'';
  return `${this.night?'ETERNAL NIGHT':'DAYLIGHT'} · SURVIVED ${clock}\nFuel stored ${this.banked}/3 · Carrying ${this.bagFuel} · Medkits ${this.meds}\n${direction}Camp ${Math.round(this.campDistance)}m ${this.heading(player,0,8)} · Camp fuel ${Math.ceil(this.fuel)}s\n${this.messageTime>0||this.finished?this.message:'Find supplies. Avoid threats. Keep the camp alive.'}`;
 }
}
