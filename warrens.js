import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight,riverClearance,WORLD_SIZE} from './terrain.js?v=big-1';

// Rabbit warrens: open ground with burrow mounds, droppings and worn runs. Rabbits come out
// near them, and a snare set on a run catches far more often than one set anywhere else.
// Placed once from a fixed seed; one instanced draw shows the warrens in range.
export const WARREN_CELL=150,WARREN_CHANCE=.7,WARREN_RANGE=80,MAX_WARRENS=12,RUN_REACH=12,ON_RUN_ODDS=.85,OFF_RUN_ODDS=.2;

const tint=(geometry,color)=>{geometry=geometry.index?geometry.toNonIndexed():geometry;for(const k of Object.keys(geometry.attributes))if(k!=='position')geometry.deleteAttribute(k);const c=new THREE.Color(color),n=geometry.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++)c.toArray(colors,i*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;};
const place=(geometry,x,y,z,sx=1,sy=1,sz=1,ry=0)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(0,ry,0);o.scale.set(sx,sy,sz);o.updateMatrix();return geometry.applyMatrix4(o.matrix);};
// Two low earth mounds with dark burrow mouths, scattered droppings and bare scrapes.
export function warrenGeometry(){
 let seed=771;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const parts=[],ico=()=>new THREE.IcosahedronGeometry(1,0);
 for(const [x,z,s] of [[0,0,1],[1.4,.8,.75]]){parts.push(tint(place(ico(),x,.02,z,.75*s,.22*s,.62*s),0x6e5b40));parts.push(tint(place(ico(),x+.42*s,.1*s,z+.1,.16*s,.13*s,.14*s),0x241d15));}
 for(let i=0;i<14;i++){const a=random()*Math.PI*2,r=.9+random()*1.6;parts.push(tint(place(ico(),Math.cos(a)*r,.02,Math.sin(a)*r,.028,.022,.028),0x3a3024));}
 // Bare scrapes where the rabbits dig, low enough to sit in the ground on a gentle slope.
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4,r=1.1+random()*.5;parts.push(tint(place(ico(),Math.cos(a)*r,-.01,Math.sin(a)*r,.32,.035,.2,a),0x7d6b4b));}
 return mergeGeometries(parts);
}
function hash(ix,iz,k){let h=Math.imul(ix^0x51ed27,0x85ebca6b)^Math.imul(iz+k*374761393,0xc2b2ae35);h^=h>>>15;h=Math.imul(h,0x27d4eb2d);h^=h>>>13;return (h>>>0)/4294967296;}
const cellKey=(ix,iz)=>ix*4096+iz;

// One warren in most 150 m cells, on fairly level open ground away from rivers and trees.
export function findWarrens(clear=()=>true){
 const half=WORLD_SIZE/2,cells=Math.floor(WORLD_SIZE/WARREN_CELL),list=[],byCell=new Map();
 for(let iz=0;iz<cells;iz++)for(let ix=0;ix<cells;ix++){
  if(hash(ix,iz,1)>=WARREN_CHANCE)continue;
  for(let attempt=0;attempt<8;attempt++){
   const x=-half+(ix+.15+.7*hash(ix,iz,2+attempt*2))*WARREN_CELL,z=-half+(iz+.15+.7*hash(ix,iz,3+attempt*2))*WARREN_CELL,y=terrainHeight(x,z);
   if(Math.abs(terrainHeight(x+3,z)-terrainHeight(x-3,z))>.8||Math.abs(terrainHeight(x,z+3)-terrainHeight(x,z-3))>.8)continue;
   if(riverClearance(x,z)<8||!clear(x,z,4))continue;
   const w={x,z,y,yaw:hash(ix,iz,30)*Math.PI*2};list.push(w);byCell.set(cellKey(ix,iz),w);break;
  }
 }
 list.byCell=byCell;return list;
}
// The nearest warren within reach of a point, looking only in the surrounding cells.
export function nearestWarren(warrens,x,z,reach=RUN_REACH){
 const half=WORLD_SIZE/2,cx=Math.floor((x+half)/WARREN_CELL),cz=Math.floor((z+half)/WARREN_CELL),span=Math.ceil(reach/WARREN_CELL);let best=null,bd=reach;
 for(let iz=cz-span;iz<=cz+span;iz++)for(let ix=cx-span;ix<=cx+span;ix++){const w=warrens.byCell.get(cellKey(ix,iz));if(!w)continue;const d=Math.hypot(w.x-x,w.z-z);if(d<bd){bd=d;best=w;}}
 return best;
}

export class WarrenView {
 constructor(scene,warrens){
  this.warrens=warrens;this.mesh=new THREE.InstancedMesh(warrenGeometry(),new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),MAX_WARRENS);
  this.mesh.name='Rabbit warrens';this.mesh.frustumCulled=false;this.mesh.count=0;this.mesh.receiveShadow=true;scene.add(this.mesh);
  this.transform=new THREE.Object3D();this.lastX=Infinity;this.lastZ=Infinity;
 }
 // Rewritten only after moving 10 m: warrens are big and sit well inside the fog distance.
 update(player){
  if(Math.abs(player.x-this.lastX)+Math.abs(player.z-this.lastZ)<10)return;this.lastX=player.x;this.lastZ=player.z;
  const half=WORLD_SIZE/2,cx=Math.floor((player.x+half)/WARREN_CELL),cz=Math.floor((player.z+half)/WARREN_CELL),t=this.transform;let n=0;
  for(let iz=cz-1;iz<=cz+1;iz++)for(let ix=cx-1;ix<=cx+1;ix++){const w=this.warrens.byCell.get(cellKey(ix,iz));if(!w||n>=MAX_WARRENS||Math.hypot(w.x-player.x,w.z-player.z)>WARREN_RANGE+WARREN_CELL)continue;t.position.set(w.x,w.y,w.z);t.rotation.set(0,w.yaw,0);t.updateMatrix();this.mesh.setMatrixAt(n++,t.matrix);}
  this.mesh.count=n;this.mesh.visible=n>0;this.mesh.instanceMatrix.needsUpdate=true;
 }
}
