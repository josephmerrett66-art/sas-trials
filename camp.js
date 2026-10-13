import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight} from './terrain.js?v=big-1';
import {rabbitGeometry} from './wildlife.js?v=sticks-1';

export const FIRE_REACH=4,SNARE_REACH=2.2,MAX_SNARES=4;
let seed=9127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const tint=(geometry,color)=>{const c=new THREE.Color(color),n=geometry.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++)c.toArray(colors,i*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;};
const place=(geometry,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy,sz);o.updateMatrix();return geometry.applyMatrix4(o.matrix);};
const flat=g=>{g=g.index?g.toNonIndexed():g;for(const k of Object.keys(g.attributes))if(k!=='position')g.deleteAttribute(k);return g;};

// Stone ring and a teepee of split logs, in the same faceted style as the springs.
function hearthGeometry(){
 const parts=[];
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2,r=.62+random()*.08,s=.13+random()*.06;parts.push(tint(place(flat(new THREE.IcosahedronGeometry(1,0)),Math.cos(a)*r,s*.45,Math.sin(a)*r,random(),random()*6,random(),s*1.3,s,s*1.1),i%3?0x7d827b:0x6b706a));}
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.3;parts.push(tint(place(flat(new THREE.CylinderGeometry(.045,.06,.85,6)),Math.cos(a)*.2,.3,Math.sin(a)*.2,Math.sin(a)*.55,0,-Math.cos(a)*.55),i%2?0x6f4f33:0x5c412a));}
 parts.push(tint(place(flat(new THREE.CylinderGeometry(.42,.48,.04,9)),0,.02,0),0x2d2620));
 return mergeGeometries(parts);
}
// Three crossed flame blades, coloured from white-yellow at the core to red at the tips.
function flameGeometry(){
 const positions=[],colors=[],hot=new THREE.Color(0xffe9a3),mid=new THREE.Color(0xff9a32),tip=new THREE.Color(0xd0441c);
 for(let i=0;i<3;i++){const a=i/3*Math.PI,cx=Math.cos(a),cz=Math.sin(a);
  const v=(r,y)=>[cx*r,y,cz*r];const ring=[[v(-.3,0),hot],[v(.3,0),hot],[v(.18,.45),mid],[v(-.18,.45),mid],[v(0,.95),tip]];
  for(const [a1,b1,c1] of [[0,1,2],[0,2,3],[3,2,4]])for(const k of [a1,b1,c1]){positions.push(...ring[k][0]);colors.push(ring[k][1].r,ring[k][1].g,ring[k][1].b);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
}
// Warm light pool on the ground, following the slope: additive, so no light source is needed.
function glowGeometry(radius=6.5,rings=6,spokes=18){
 const positions=[],alphas=[];const vertex=(r,a)=>{positions.push(Math.cos(a)*r,0,Math.sin(a)*r);alphas.push((1-r/radius)**2);};
 for(let i=0;i<rings;i++)for(let j=0;j<spokes;j++){const r0=i/rings*radius,r1=(i+1)/rings*radius,a0=j/spokes*Math.PI*2,a1=(j+1)/spokes*Math.PI*2;vertex(r0,a0);vertex(r1,a1);vertex(r1,a0);if(i){vertex(r0,a0);vertex(r0,a1);vertex(r1,a1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('glow',new THREE.Float32BufferAttribute(alphas,1));return g;
}
function snareGeometry(){
 const stake=tint(place(flat(new THREE.CylinderGeometry(.018,.025,.45,5)),0,.2,0,.12,0,0),0x7b5a3a);
 const loop=tint(place(flat(new THREE.TorusGeometry(.09,.006,3,8)),.08,.12,0,0,Math.PI/2,0),0xb7b4a6);
 const tag=tint(place(flat(new THREE.BoxGeometry(.05,.03,.012)),0,.42,0),0x3d6f8e);
 return mergeGeometries([stake,loop,tag]);
}

// One reusable campfire (only one burns at a time) and up to four snares.
export class Camp {
 constructor(scene){
  this.time={value:0};this.strength={value:0};this.night={value:0};
  this.group=new THREE.Group();this.group.name='Campfire';this.group.visible=false;
  const solid=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
  this.hearth=new THREE.Mesh(hearthGeometry(),solid);
  const flames=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,fog:true});
  flames.onBeforeCompile=shader=>{shader.uniforms.fireTime=this.time;shader.uniforms.fireStrength=this.strength;shader.vertexShader='uniform float fireTime;uniform float fireStrength;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float lift=position.y;transformed.y*=fireStrength*(.85+.2*sin(fireTime*9.0+position.x*7.0));
   transformed.xz*=.55+.45*fireStrength;transformed.x+=sin(fireTime*6.3+lift*5.0)*.08*lift;transformed.z+=cos(fireTime*5.1+lift*4.0)*.08*lift;`);};
  flames.customProgramCacheKey=()=> 'campfire-flames-v1';
  this.flames=new THREE.Mesh(flameGeometry(),flames);this.flames.position.y=.06;
  const glow=new THREE.MeshBasicMaterial({color:0xff8a3c,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  glow.onBeforeCompile=shader=>{shader.uniforms.fireStrength=this.strength;shader.uniforms.fireNight=this.night;shader.uniforms.fireTime=this.time;shader.vertexShader='attribute float glow;varying float vGlow;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=glow;');shader.fragmentShader='uniform float fireStrength;uniform float fireNight;uniform float fireTime;varying float vGlow;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a=vGlow*fireStrength*(.12+.5*fireNight)*(.92+.08*sin(fireTime*11.0));');};
  glow.customProgramCacheKey=()=> 'campfire-glow-v1';
  this.glowGeometry=glowGeometry();this.glow=new THREE.Mesh(this.glowGeometry,glow);this.glow.renderOrder=2;
  this.group.add(this.hearth,this.flames,this.glow);scene.add(this.group);
  this.snareMesh=new THREE.InstancedMesh(snareGeometry(),solid,MAX_SNARES);this.snareMesh.name='Snares';this.snareMesh.count=0;this.snareMesh.frustumCulled=false;scene.add(this.snareMesh);
  this.caughtMesh=new THREE.InstancedMesh(rabbitGeometry(),solid,MAX_SNARES);this.caughtMesh.name='Snared rabbits';this.caughtMesh.count=0;this.caughtMesh.frustumCulled=false;scene.add(this.caughtMesh);
  this.matrix=new THREE.Matrix4();this.transform=new THREE.Object3D();this.reset();
 }
 reset(){this.fire=null;this.snares=[];this.group.visible=false;this.syncSnares(0);}
 get lit(){return !!this.fire&&this.fire.fuel>0;}
 // Light a fire just ahead of the player on the ground.
 light(x,z,fuel){
  const y=terrainHeight(x,z);this.fire={x,z,y,fuel};this.group.position.set(x,y,z);this.group.visible=true;
  // Drape the glow over the local slope once, when the fire is placed.
  const p=this.glowGeometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(x+p.getX(i),z+p.getZ(i))-y+.06);p.needsUpdate=true;this.glowGeometry.computeBoundingSphere();
  this.group.updateMatrixWorld(true);
 }
 near(player,reach=FIRE_REACH){return !!this.fire&&Math.hypot(player.x-this.fire.x,player.z-this.fire.z)<reach;}
 warming(player){return this.lit&&this.near(player);}
 // Fuel is in game hours; rain makes a fire burn faster.
 burn(hours,rain=0){if(this.fire)this.fire.fuel=Math.max(0,this.fire.fuel-hours*(1+.5*rain));}
 setSnare(x,z,hours,chance=random()){
  // Most snares take a rabbit within a few hours; some never do.
  this.snares.push({x,z,y:terrainHeight(x,z),set:hours,catchAt:chance<.8?hours+1.5+chance*6:Infinity,yaw:random()*6.28});this.syncSnares(hours);
 }
 nearSnare(player,reach=SNARE_REACH){let best=null,bd=reach;for(const s of this.snares){const d=Math.hypot(player.x-s.x,player.z-s.z);if(d<bd){bd=d;best=s;}}return best;}
 // Lifting a snare returns whether it held a rabbit.
 checkSnare(snare,hours){const caught=hours>=snare.catchAt;this.snares.splice(this.snares.indexOf(snare),1);this.syncSnares(hours);return caught;}
 syncSnares(hours){
  let caught=0;this.snareMesh.count=this.snares.length;
  this.snares.forEach((s,i)=>{const t=this.transform;t.position.set(s.x,s.y,s.z);t.rotation.set(0,s.yaw,0);t.scale.setScalar(1);t.updateMatrix();this.snareMesh.setMatrixAt(i,t.matrix);
   if(hours>=s.catchAt){t.position.set(s.x+.18,s.y+.07,s.z);t.rotation.set(0,s.yaw,Math.PI/2);t.updateMatrix();this.caughtMesh.setMatrixAt(caught++,t.matrix);}});
  this.caughtMesh.count=caught;this.snareMesh.instanceMatrix.needsUpdate=true;this.caughtMesh.instanceMatrix.needsUpdate=true;this.syncedCaught=caught;
 }
 // hours: game time; dark 0..1. Visual work is skipped while the fire is out of view range.
 step(dt,hours,{dark=0,rain=0,camera=null,range=90}={}){
  if(this.fire){this.burn(dt/60,rain);const f=this.fire,visible=!camera||Math.hypot(camera.position.x-f.x,camera.position.z-f.z)<range+8;this.group.visible=visible;
   if(visible){this.time.value+=dt;const target=Math.min(1,f.fuel/1.2);this.strength.value+=(target-this.strength.value)*Math.min(1,dt*2);this.night.value=dark;this.flames.visible=this.strength.value>.02;this.glow.visible=this.strength.value>.02;}}
  // A snare that has just caught shows its rabbit.
  let due=0;for(const s of this.snares)if(hours>=s.catchAt)due++;if(due!==this.syncedCaught)this.syncSnares(hours);
 }
}
