import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight,riverClearance} from './terrain.js?v=valleys-1';
import {nearbyObstacles} from './obstacle-grid.js';
import {rabbitGeometry} from './wildlife.js?v=warrens-1';

// The forest floor you can use: fallen branches under the trees, your thrown stick where it
// landed, and a rabbit it dropped. One instanced draw for every branch and stick, one for
// rabbits on the ground (hidden when there are none) and one stick in flight (hidden at rest).
export const BRANCH_CHANCE=.45,FLOOR_RANGE=30,MAX_BRANCHES=64,MAX_DROPPED=4,MAX_CARCASSES=2,PICK_REACH=2.2;

const tint=(geometry,color)=>{geometry=geometry.index?geometry.toNonIndexed():geometry;for(const k of Object.keys(geometry.attributes))if(k!=='position')geometry.deleteAttribute(k);const c=new THREE.Color(color),n=geometry.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++)c.toArray(colors,i*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;};
const place=(geometry,x,y,z,rx=0,ry=0,rz=0)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.updateMatrix();return geometry.applyMatrix4(o.matrix);};
// A forked, weathered dead branch about 1.3 m long lying along z, its thick end propped on the
// fork so it shows above the grass. Pale timber, a shade lighter than the hearth logs.
export function branchGeometry(segments=5){
 return mergeGeometries([
  tint(place(new THREE.CylinderGeometry(.034,.052,1.3,segments),0,.12,0,Math.PI/2-.16),0x8b7154),
  tint(place(new THREE.CylinderGeometry(.018,.03,.5,Math.max(4,segments-1)),.11,.12,.3,Math.PI/2-.1,0,-.55),0x765d43),
  tint(place(new THREE.CylinderGeometry(.012,.02,.26,4),-.06,.06,-.34,Math.PI/2,0,.6),0x9a8061)
 ]);
}
// A whittled throwing stick: one straight length along z with a carved pale point at -z.
export function stickGeometry(segments=6){
 return mergeGeometries([
  tint(place(new THREE.CylinderGeometry(.02,.026,.9,segments),0,0,.08,Math.PI/2),0x8b7154),
  tint(place(new THREE.ConeGeometry(.02,.16,segments),0,0,-.45,-Math.PI/2),0xd8c49a)
 ]);
}
// A hatchet held upright: a timber haft along y with a steel head and bright edge at the top.
export function hatchetGeometry(){
 return mergeGeometries([
  tint(place(new THREE.CylinderGeometry(.016,.02,.46,6),0,0,0),0x8b7154),
  tint(place(new THREE.BoxGeometry(.05,.06,.035),0,.22,0),0x4f5458),
  tint(place(new THREE.BoxGeometry(.09,.075,.012),0,.22,-.06),0x6d7276),
  tint(place(new THREE.BoxGeometry(.1,.008,.014),0,.22,-.105,Math.PI/2),0xc2c6c8)
 ]);
}
// Stable per-tree random numbers, so a tree always drops the same branch in the same place.
function hash(x,z,k){let h=Math.imul(Math.round(x*7)^0x9e3779b1,0x85ebca6b)^Math.imul(Math.round(z*7)+k*374761393,0xc2b2ae35);h^=h>>>15;h=Math.imul(h,0x27d4eb2d);h^=h>>>13;return (h>>>0)/4294967296;}
// Where a tree's fallen branch lies (writes into out), or null for a tree without one.
export function branchSpot(tree,out){
 if(tree.height<4||hash(tree.x,tree.z,1)>=BRANCH_CHANCE)return null;
 const a=hash(tree.x,tree.z,2)*Math.PI*2,r=tree.radius+.9+hash(tree.x,tree.z,3)*1.2;
 out.x=tree.x+Math.cos(a)*r;out.z=tree.z+Math.sin(a)*r;out.yaw=hash(tree.x,tree.z,4)*Math.PI*2;out.key=Math.round(tree.x*4)*100000+Math.round(tree.z*4);return out;
}
const nearestIn=(list,count,player,reach)=>{let best=null,bd=reach;for(let i=0;i<count;i++){const s=list[i],d=Math.hypot(player.x-s.x,player.z-s.z);if(d<bd){bd=d;best=s;}}return best;};

export class ForestFloor {
 constructor(scene,obstacles,{clear=()=>true}={}){
  this.obstacles=obstacles;this.clear=clear;
  const material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});this.geometry=branchGeometry();
  this.mesh=new THREE.InstancedMesh(this.geometry,material,MAX_BRANCHES+MAX_DROPPED);this.mesh.name='Fallen branches';this.mesh.frustumCulled=false;this.mesh.count=0;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
  this.carcassMesh=new THREE.InstancedMesh(rabbitGeometry(),material,MAX_CARCASSES);this.carcassMesh.name='Rabbits on the ground';this.carcassMesh.frustumCulled=false;this.carcassMesh.count=0;this.carcassMesh.visible=false;scene.add(this.carcassMesh);
  this.flying=new THREE.Mesh(stickGeometry(),material);this.flying.name='Thrown stick';this.flying.visible=false;this.flying.frustumCulled=false;scene.add(this.flying);
  // Each tree's branch (or false) is worked out once, the first time the tree comes into range.
  this.known=new Map();this.spots=new Array(MAX_BRANCHES);this.spotCount=0;
  this.taken=new Set();this.dropped=[];this.carcasses=[];this.scratch=[];this.transform=new THREE.Object3D();this.lastX=Infinity;this.lastZ=Infinity;this.flight=null;this.dirty=true;
 }
 reset(){this.taken.clear();this.dropped.length=0;this.carcasses.length=0;this.flight=null;this.flying.visible=false;this.dirty=true;}
 // Branches within range of the player; rebuilt after moving 3 m or when something changes.
 refresh(player){
  this.lastX=player.x;this.lastZ=player.z;this.dirty=false;let n=0;
  for(const tree of nearbyObstacles(this.obstacles,player.x,player.z,FLOOR_RANGE,this.scratch)){
   if(n>=MAX_BRANCHES)break;let s=this.known.get(tree);
   if(s===undefined){s=branchSpot(tree,{});if(s&&(riverClearance(s.x,s.z)<1.5||!this.clear(s.x,s.z)))s=null;if(s)s.y=terrainHeight(s.x,s.z);this.known.set(tree,s??false);}
   if(!s||this.taken.has(s.key)||Math.hypot(s.x-player.x,s.z-player.z)>FLOOR_RANGE)continue;
   this.spots[n++]=s;
  }
  this.spotCount=n;const t=this.transform;let i=0;
  for(const list of [this.spots,this.dropped])for(let j=0;j<(list===this.spots?n:list.length);j++){const s=list[j];t.position.set(s.x,s.y,s.z);t.rotation.set(0,s.yaw,0);t.updateMatrix();this.mesh.setMatrixAt(i++,t.matrix);}
  this.mesh.count=i;this.mesh.instanceMatrix.needsUpdate=true;
  for(let j=0;j<this.carcasses.length;j++){const c=this.carcasses[j];t.position.set(c.x,c.y+.08,c.z);t.rotation.set(0,c.yaw,Math.PI/2);t.updateMatrix();this.carcassMesh.setMatrixAt(j,t.matrix);}
  this.carcassMesh.count=this.carcasses.length;this.carcassMesh.visible=this.carcasses.length>0;this.carcassMesh.instanceMatrix.needsUpdate=true;
 }
 nearestBranch(player,reach=PICK_REACH){return nearestIn(this.spots,this.spotCount,player,reach);}
 nearestStick(player,reach=PICK_REACH){return nearestIn(this.dropped,this.dropped.length,player,reach);}
 nearestCarcass(player,reach=PICK_REACH){return nearestIn(this.carcasses,this.carcasses.length,player,reach);}
 take(spot){this.taken.add(spot.key);this.dirty=true;}
 pick(item){for(const list of [this.dropped,this.carcasses]){const i=list.indexOf(item);if(i>=0){list.splice(i,1);this.dirty=true;return true;}}return false;}
 drop(list,max,x,z,yaw){if(list.length>=max)list.shift();list.push({x,z,y:terrainHeight(x,z),yaw});this.dirty=true;}
 dropCarcass(x,z,yaw=0){this.drop(this.carcasses,MAX_CARCASSES,x,z,yaw);}
 // A stick thrown from (x,y,z) to land at (tx,tz). data comes back from step() when it lands.
 launch(x,y,z,tx,tz,data){const d=Math.hypot(tx-x,tz-z);this.flight={x,y,z,tx,tz,ty:terrainHeight(tx,tz)+.05,d,t:0,duration:Math.max(.25,Math.min(.8,d/16)),yaw:Math.atan2(tx-x,tz-z),data};this.flying.visible=true;}
 // Returns the landed flight's data on the frame it lands, otherwise null.
 step(dt,player){
  let landed=null;const f=this.flight;
  if(f){f.t+=dt;const p=Math.min(1,f.t/f.duration),arc=Math.min(2.2,.25+f.d*.12)*4*p*(1-p);
   this.flying.position.set(f.x+(f.tx-f.x)*p,f.y+(f.ty-f.y)*p+arc,f.z+(f.tz-f.z)*p);this.flying.rotation.set(f.t*22,f.yaw,0);
   if(p>=1){this.flying.visible=false;this.flight=null;this.drop(this.dropped,MAX_DROPPED,f.tx,f.tz,f.yaw);landed=f;}}
  if(this.dirty||Math.abs(player.x-this.lastX)+Math.abs(player.z-this.lastZ)>3)this.refresh(player);
  return landed;
 }
 save(){const p=s=>({x:Math.round(s.x*100)/100,z:Math.round(s.z*100)/100,yaw:Math.round(s.yaw*100)/100});return {taken:[...this.taken],dropped:this.dropped.map(p),carcasses:this.carcasses.map(p)};}
 load(saved){this.reset();if(!saved)return;for(const k of saved.taken??[])this.taken.add(k);for(const s of saved.dropped??[])this.drop(this.dropped,MAX_DROPPED,s.x,s.z,s.yaw);for(const s of saved.carcasses??[])this.dropCarcass(s.x,s.z,s.yaw);}
}
